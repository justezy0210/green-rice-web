import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { OrthogroupDiffPagination } from '@/components/explore/OrthogroupDiffPagination';
import { OgCategoryStrip } from '@/components/explore/OgCategoryStrip';
import { OgIndexRow } from '@/components/explore/OgIndexRow';
import { OgPresetButton } from '@/components/explore/OgPresetButton';
import { OgTraitEvidenceFilter } from '@/components/explore/OgTraitEvidenceFilter';
import { useOgIndex } from '@/hooks/useOgIndex';
import { useOgCategories } from '@/hooks/useOgCategories';
import { useOrthogroupDiff } from '@/hooks/useOrthogroupDiff';
import { useTraitHits } from '@/hooks/useTraitHits';
import { DEFAULT_TRAIT_ID, isTraitId } from '@/config/traits';
import { isCategoryId, type CategoryId } from '@/lib/og-functional-categories';
import type { OgIndexRow as OgIndexRowData } from '@/lib/og-index-service';
import { traitPValues } from '@/lib/og-trait-sort';
import type { TraitId } from '@/types/traits';

type Preset =
  | 'rare+private'   // default — the PAV inventory
  | 'variable'
  | 'common'
  | 'rare'
  | 'private'
  | 'panel-absent'
  | 'irgsp-absent'
  | 'multi-copy-like'
  | 'universal'
  | 'all'
  | 'trait-linked';  // overlay — kept last and visually grouped on the right

const PRESET_LABELS: Record<Preset, string> = {
  'rare+private': 'Rare + Private (PAV)',
  'variable': 'Variable',
  'common': 'Common variable',
  'rare': 'Rare PAV',
  'private': 'Private',
  'panel-absent': 'Panel-absent ref',
  'irgsp-absent': 'Absent in IRGSP',
  'multi-copy-like': 'Multi-copy-like',
  'universal': 'Universal',
  'all': 'All OGs',
  'trait-linked': 'Has trait p<0.05 (overlay)',
};

const INTRINSIC_PRESETS: Preset[] = [
  'variable', 'common', 'rare+private', 'rare', 'private', 'panel-absent', 'irgsp-absent', 'multi-copy-like', 'universal', 'all',
];
const OVERLAY_PRESETS: Preset[] = ['trait-linked'];

const PAGE_SIZE = 100;

function ogHref(row: OgIndexRowData): string {
  return `/og/${encodeURIComponent(row.ogId)}`;
}

function readPreset(value: string | null): Preset {
  return value && value in PRESET_LABELS ? (value as Preset) : 'rare+private';
}

function readCategory(value: string | null): CategoryId | null { return isCategoryId(value) ? value : null; }
function readTrait(value: string | null): TraitId | null { return isTraitId(value) ? value : null; }

export function OrthogroupIndexPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const preset = readPreset(searchParams.get('preset'));
  const category = readCategory(searchParams.get('category'));
  const trait = readTrait(searchParams.get('trait'));
  const query = searchParams.get('q') ?? '';
  const { doc } = useOrthogroupDiff(DEFAULT_TRAIT_ID);
  const version = doc?.orthofinderVersion ?? null;
  const { bundle, loading, error } = useOgIndex(version);
  const ogCategories = useOgCategories(version);
  const { index: traitHitsIndex } = useTraitHits();
  const traitP = useMemo(() => (
    trait ? traitPValues(traitHitsIndex, trait) : null
  ), [traitHitsIndex, trait]);
  const [page, setPage] = useState(0);

  const presetRows = useMemo<OgIndexRowData[]>(() => {
    if (!bundle) return [];
    switch (preset) {
      case 'variable':
        return bundle.ogs.filter((o) => o.tier === 'common' || o.tier === 'rare' || o.tier === 'private');
      case 'common': return bundle.ogs.filter((o) => o.tier === 'common');
      case 'rare': return bundle.ogs.filter((o) => o.tier === 'rare');
      case 'private': return bundle.ogs.filter((o) => o.tier === 'private');
      case 'panel-absent': return bundle.ogs.filter((o) => o.tier === 'absent');
      case 'rare+private':
        return bundle.ogs.filter((o) => o.tier === 'rare' || o.tier === 'private');
      case 'irgsp-absent':
        return bundle.ogs.filter((o) => o.irgspCopyCount === 0 && o.tier !== 'absent');
      case 'multi-copy-like':
        return bundle.ogs.filter((o) => o.memberCount > o.presentCount);
      case 'trait-linked':
        return bundle.ogs.filter((o) => o.traits && o.traits.length > 0);
      case 'universal':
        return bundle.ogs.filter((o) => o.tier === 'universal');
      default:
        return bundle.ogs;
    }
  }, [bundle, preset]);

  const categoryRows = useMemo<OgIndexRowData[]>(() => {
    let rows = presetRows;
    if (category) {
      rows = rows.filter(
        (o) => (ogCategories?.categories[o.ogId]?.p ?? 'no_annotation') === category,
      );
    }
    return rows;
  }, [presetRows, category, ogCategories]);

  const filtered = useMemo<OgIndexRowData[]>(() => {
    let rows = categoryRows;
    if (trait) rows = rows.filter((o) => (o.traits ?? []).includes(trait));
    const q = query.trim().toLowerCase();
    const qOg = q.startsWith('og') ? q.toUpperCase() : '';
    if (q) {
      rows = rows.filter((o) => {
        if (qOg) return o.ogId.toUpperCase().includes(qOg);
        return (o.traits ?? []).some((t) => t.toLowerCase().includes(q));
      });
    }
    return [...rows].sort((a, b) => {
      if (traitP) {
        const pa = traitP.get(a.ogId) ?? Number.POSITIVE_INFINITY;
        const pb = traitP.get(b.ogId) ?? Number.POSITIVE_INFINITY;
        if (pa !== pb) return pa - pb;
      }
      if (a.presentCount !== b.presentCount) return a.presentCount - b.presentCount;
      return a.ogId.localeCompare(b.ogId);
    });
  }, [categoryRows, trait, traitP, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const updateFilters = (next: { preset?: Preset; category?: CategoryId | null; trait?: TraitId | null; q?: string }) => {
    const nextPreset = next.preset ?? preset;
    const nextCategory = Object.hasOwn(next, 'category') ? next.category ?? null : category;
    const nextTrait = Object.hasOwn(next, 'trait') ? next.trait ?? null : trait;
    const nextQuery = Object.hasOwn(next, 'q') ? next.q ?? '' : query;
    const params = new URLSearchParams();
    if (nextPreset !== 'rare+private') params.set('preset', nextPreset);
    if (nextCategory) params.set('category', nextCategory);
    if (nextTrait) params.set('trait', nextTrait);
    if (nextQuery.trim()) params.set('q', nextQuery.trim());
    setSearchParams(params, { replace: true });
    setPage(0);
  };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Orthogroups</h1>
        <p className="text-sm text-gray-500 mt-1">
          Cross-panel orthogroup inventory. Conservation tier and IRGSP
          status are intrinsic axes; trait association is shown as a side
          badge. For phenotype-group ranking go to{' '}
          <Link to="/discovery" className="text-green-700 hover:underline">
            /discovery
          </Link>
          .
        </p>
      </div>

      {bundle && (
        <OgCategoryStrip
          rows={presetRows}
          categories={ogCategories}
          selected={category}
          onSelect={(id) => {
            updateFilters({ category: id });
          }}
        />
      )}

      {bundle && (
        <OgTraitEvidenceFilter
          rows={categoryRows}
          selected={trait}
          onSelect={(id) => updateFilters({ trait: id })}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {INTRINSIC_PRESETS.map((p) => (
          <OgPresetButton
            key={p}
            label={PRESET_LABELS[p]}
            active={preset === p}
            onClick={() => updateFilters({ preset: p, category: null })}
          />
        ))}
        <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden />
        {OVERLAY_PRESETS.map((p) => (
          <OgPresetButton
            key={p}
            label={PRESET_LABELS[p]}
            active={preset === p}
            onClick={() => updateFilters({ preset: p, category: null })}
            overlay
          />
        ))}
        <Input
          type="search"
          value={query}
          onChange={(e) => {
            updateFilters({ q: e.target.value });
          }}
          placeholder="Search OG id (e.g. OG0000871) or trait"
          className="ml-auto w-72"
        />
      </div>

      {loading && <p className="text-sm text-gray-400">Loading orthogroup index…</p>}
      {error && <p className="text-sm text-red-600">Could not load index: {error.message}</p>}

      {bundle && (
        <>
          <p className="text-[11px] text-gray-500">
            {filtered.length.toLocaleString()} / {bundle.count.toLocaleString()} OGs ·{' '}
            {bundle.panelTotalCount} panel cultivars · sort:{' '}
            {trait ? `${trait} p-value asc, then rarity` : 'rarity (present count asc), then OG id'}
          </p>
          <Card>
            <CardContent className="py-3">
              <Table density="dense" className="table-fixed border-separate border-spacing-y-1">
                <colgroup>
                  <col className="w-36" />
                  <col className="w-28" />
                  <col className="w-24" />
                  <col className="w-20" />
                  <col className="w-20" />
                  <col />
                </colgroup>
                <TableHeader className="[&_tr]:border-0">
                  <TableRow className="border-0 text-[10px] uppercase tracking-wide text-gray-500 hover:bg-transparent">
                    <TableHead className="pl-3 text-gray-500">OG</TableHead>
                    <TableHead className="text-gray-500">Tier</TableHead>
                    <TableHead className="text-right text-gray-500">Panel</TableHead>
                    <TableHead className="text-right text-gray-500">IRGSP</TableHead>
                    <TableHead className="text-right text-gray-500">Members</TableHead>
                    <TableHead className="text-gray-500">Traits</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((o) => (
                    <OgIndexRow
                      key={o.ogId}
                      row={o}
                      panelTotal={bundle.panelTotalCount}
                      href={ogHref(o)}
                      onClick={() => navigate(ogHref(o))}
                      activeTrait={trait}
                      activeTraitP={traitP?.get(o.ogId)}
                    />
                  ))}
                  {pageRows.length === 0 && (
                    <TableRow className="border-0 hover:bg-transparent">
                      <TableCell
                        colSpan={6}
                        className="rounded-md border border-gray-100 bg-white py-6 text-center text-[12px] text-gray-500"
                      >
                        No OGs match the current filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="px-1">
            <OrthogroupDiffPagination
              page={safePage}
              pageSize={PAGE_SIZE}
              totalItems={filtered.length}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </div>
  );
}
