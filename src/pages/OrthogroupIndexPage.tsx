import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { useOgIndex } from '@/hooks/useOgIndex';
import { useOgCategories } from '@/hooks/useOgCategories';
import { useOrthogroupDiff } from '@/hooks/useOrthogroupDiff';
import { DEFAULT_TRAIT_ID } from '@/config/traits';
import type { CategoryId } from '@/lib/og-functional-categories';
import type { OgIndexRow as OgIndexRowData } from '@/lib/og-index-service';

type Preset =
  | 'rare+private'   // default — the PAV inventory
  | 'rare'
  | 'private'
  | 'irgsp-absent'
  | 'universal'
  | 'all'
  | 'trait-linked';  // overlay — kept last and visually grouped on the right

const PRESET_LABELS: Record<Preset, string> = {
  'rare+private': 'Rare + Private (PAV)',
  'rare': 'Rare PAV',
  'private': 'Private',
  'irgsp-absent': 'Absent in IRGSP',
  'universal': 'Universal',
  'all': 'All OGs',
  'trait-linked': 'Has trait p<0.05 (overlay)',
};

const INTRINSIC_PRESETS: Preset[] = [
  'rare+private', 'rare', 'private', 'irgsp-absent', 'universal', 'all',
];
const OVERLAY_PRESETS: Preset[] = ['trait-linked'];

const PAGE_SIZE = 100;

/**
 * Neutral entity-first OG link. Trait context is intentionally NOT
 * injected here so that entity browsing on `/og` does not leak a
 * specific trait into the detail page. Trait context is preserved on
 * links coming from discovery surfaces (Discovery home, Step 2, etc.).
 */
function ogHref(row: OgIndexRowData): string {
  return `/og/${encodeURIComponent(row.ogId)}`;
}

export function OrthogroupIndexPage() {
  const navigate = useNavigate();
  const { doc } = useOrthogroupDiff(DEFAULT_TRAIT_ID);
  const version = doc?.orthofinderVersion ?? null;
  const { bundle, loading, error } = useOgIndex(version);
  const ogCategories = useOgCategories(version);

  const [preset, setPreset] = useState<Preset>('rare+private');
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  // Apply preset (intrinsic + overlay) BEFORE the category filter so the
  // category strip counts reflect the active preset cohort.
  const presetRows = useMemo<OgIndexRowData[]>(() => {
    if (!bundle) return [];
    switch (preset) {
      case 'rare': return bundle.ogs.filter((o) => o.tier === 'rare');
      case 'private': return bundle.ogs.filter((o) => o.tier === 'private');
      case 'rare+private':
        return bundle.ogs.filter((o) => o.tier === 'rare' || o.tier === 'private');
      case 'irgsp-absent':
        return bundle.ogs.filter((o) => o.irgspCopyCount === 0 && o.tier !== 'absent');
      case 'trait-linked':
        return bundle.ogs.filter((o) => o.traits && o.traits.length > 0);
      case 'universal':
        return bundle.ogs.filter((o) => o.tier === 'universal');
      default:
        return bundle.ogs;
    }
  }, [bundle, preset]);

  const filtered = useMemo<OgIndexRowData[]>(() => {
    let rows = presetRows;
    if (category) {
      rows = rows.filter(
        (o) => (ogCategories?.categories[o.ogId]?.p ?? 'no_annotation') === category,
      );
    }
    const q = query.trim().toLowerCase();
    const qOg = q.startsWith('og') ? q.toUpperCase() : '';
    if (q) {
      rows = rows.filter((o) => {
        if (qOg) return o.ogId.toUpperCase().includes(qOg);
        return (o.traits ?? []).some((t) => t.toLowerCase().includes(q));
      });
    }
    // Entity-first sort: rarity asc (most variable first), then ogId.
    // Trait p-value intentionally NOT used as a tie-break — trait
    // ranking lives in /discovery. Stable secondary on ogId keeps the
    // listing reproducible across reloads.
    return [...rows].sort((a, b) => {
      if (a.presentCount !== b.presentCount) return a.presentCount - b.presentCount;
      return a.ogId.localeCompare(b.ogId);
    });
  }, [presetRows, category, ogCategories, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // Clearing the category alongside the preset prevents the strip
  // from becoming a hidden filter when the new preset cohort doesn't
  // contain the previously-selected category (count→0 buckets aren't
  // rendered, so the active state would otherwise disappear from the
  // UI while still constraining results).
  const resetAndSetPreset = (p: Preset) => {
    setPreset(p);
    setCategory(null);
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
            setCategory(id);
            setPage(0);
          }}
        />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {INTRINSIC_PRESETS.map((p) => (
          <PresetButton
            key={p}
            id={p}
            active={preset === p}
            onClick={() => resetAndSetPreset(p)}
          />
        ))}
        <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden />
        {OVERLAY_PRESETS.map((p) => (
          <PresetButton
            key={p}
            id={p}
            active={preset === p}
            onClick={() => resetAndSetPreset(p)}
            overlay
          />
        ))}
        <Input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
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
            {bundle.panelTotalCount} panel cultivars · sort: rarity (present count asc),
            then OG id
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

function PresetButton({
  id, active, onClick, overlay,
}: {
  id: Preset;
  active: boolean;
  onClick: () => void;
  overlay?: boolean;
}) {
  const baseColor = overlay
    ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50';
  const activeColor = overlay
    ? 'border-amber-400 bg-amber-100 text-amber-900 font-medium'
    : 'border-green-400 bg-green-50 text-green-800 font-medium';
  return (
    /* raw: 11px preset toggle chip with intrinsic-vs-overlay color swap — Button primitive
       would over-pad and lose the divider grouping in a single nav row. */
    <button
      type="button"
      onClick={onClick}
      className={`text-[11px] px-2 py-1 rounded border ${active ? activeColor : baseColor}`}
    >
      {PRESET_LABELS[id]}
    </button>
  );
}
