import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { OrthogroupDiffPagination } from '@/components/explore/OrthogroupDiffPagination';
import { useOgIndex } from '@/hooks/useOgIndex';
import { useOrthogroupDiff } from '@/hooks/useOrthogroupDiff';
import { DEFAULT_TRAIT_ID } from '@/config/traits';
import { tierLabel, tierTone, type ConservationTier } from '@/lib/og-conservation';
import type { OgIndexRow } from '@/lib/og-index-service';

const TRAIT_ABBR: Record<string, string> = {
  heading_date: 'HD', culm_length: 'CL', panicle_length: 'PL',
  panicle_number: 'PN', spikelets_per_panicle: 'SPP', ripening_rate: 'RR',
  grain_weight: 'GW', pre_harvest_sprouting: 'PHS', bacterial_leaf_blight: 'BLB',
};

type Preset =
  | 'rare+private'   // default — the PAV inventory
  | 'rare'
  | 'private'
  | 'irgsp-absent'
  | 'trait-linked'
  | 'universal'
  | 'all';

const PRESET_LABELS: Record<Preset, string> = {
  'rare+private': 'Rare + Private (PAV)',
  'rare': 'Rare PAV',
  'private': 'Private',
  'irgsp-absent': 'Absent in IRGSP',
  'trait-linked': 'Trait-discriminating',
  'universal': 'Universal',
  'all': 'All OGs',
};

const PAGE_SIZE = 100;

/**
 * Build the `/og/:id` link with the OG's strongest trait preselected
 * (when any hit exists). That way OG detail opens with the
 * trait-scoped cards already populated instead of the empty
 * "no trait selected" state.
 */
function ogHref(row: OgIndexRow): string {
  const id = encodeURIComponent(row.ogId);
  if (row.traits && row.traits.length > 0) {
    return `/og/${id}?trait=${encodeURIComponent(row.traits[0])}`;
  }
  return `/og/${id}`;
}

export function OrthogroupIndexPage() {
  const navigate = useNavigate();
  const { doc } = useOrthogroupDiff(DEFAULT_TRAIT_ID);
  const version = doc?.orthofinderVersion ?? null;
  const { bundle, loading, error } = useOgIndex(version);

  const [preset, setPreset] = useState<Preset>('rare+private');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo<OgIndexRow[]>(() => {
    if (!bundle) return [];
    const q = query.trim().toLowerCase();
    const qOg = q.startsWith('og') ? q.toUpperCase() : '';
    let rows: OgIndexRow[];
    switch (preset) {
      case 'rare': rows = bundle.ogs.filter((o) => o.tier === 'rare'); break;
      case 'private': rows = bundle.ogs.filter((o) => o.tier === 'private'); break;
      case 'rare+private':
        rows = bundle.ogs.filter((o) => o.tier === 'rare' || o.tier === 'private');
        break;
      case 'irgsp-absent':
        rows = bundle.ogs.filter((o) => o.irgspCopyCount === 0 && o.tier !== 'absent');
        break;
      case 'trait-linked':
        rows = bundle.ogs.filter((o) => o.traits && o.traits.length > 0);
        break;
      case 'universal':
        rows = bundle.ogs.filter((o) => o.tier === 'universal');
        break;
      default: rows = bundle.ogs;
    }
    if (q) {
      rows = rows.filter((o) => {
        if (qOg) return o.ogId.toUpperCase().includes(qOg);
        return (o.traits ?? []).some((t) => t.toLowerCase().includes(q));
      });
    }
    // Default sort: rarity asc (most variable first), then by trait signal, then by ogId.
    return [...rows].sort((a, b) => {
      if (a.presentCount !== b.presentCount) return a.presentCount - b.presentCount;
      const ap = a.bestTraitP ?? Infinity;
      const bp = b.bestTraitP ?? Infinity;
      if (ap !== bp) return ap - bp;
      return a.ogId.localeCompare(b.ogId);
    });
  }, [bundle, preset, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const resetAndSetPreset = (p: Preset) => {
    setPreset(p);
    setPage(0);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Orthogroups</h1>
        <p className="text-sm text-gray-500 mt-1">
          Cross-panel orthogroup inventory. Conservation tier, IRGSP
          reference status, and trait-discrimination signal per OG.
          Start with a preset, or search for an OG id directly.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(PRESET_LABELS) as Preset[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => resetAndSetPreset(p)}
            className={`text-[11px] px-2 py-1 rounded border ${
              preset === p
                ? 'border-green-400 bg-green-50 text-green-800 font-medium'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          placeholder="Search OG id (e.g. OG0000871) or trait"
          className="ml-auto w-72 text-[12px] border border-gray-200 rounded px-2 py-1 bg-white focus:border-green-500 focus:ring-1 focus:ring-green-200 outline-none"
        />
      </div>

      {loading && <p className="text-sm text-gray-400">Loading orthogroup index…</p>}
      {error && <p className="text-sm text-red-600">Could not load index: {error.message}</p>}

      {bundle && (
        <>
          <p className="text-[11px] text-gray-500">
            {filtered.length.toLocaleString()} / {bundle.count.toLocaleString()} OGs ·{' '}
            {bundle.panelTotalCount} panel cultivars · sort: rarity (present count asc),
            then strongest trait p-value
          </p>
          <Card>
            <CardContent className="py-2">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-36" />
                  <col className="w-28" />
                  <col className="w-24" />
                  <col className="w-20" />
                  <col className="w-20" />
                  <col />
                </colgroup>
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
                    <th className="text-left pl-3 pr-2 py-1.5">OG</th>
                    <th className="text-left px-2 py-1.5">Tier</th>
                    <th className="text-right px-2 py-1.5">Panel</th>
                    <th className="text-right px-2 py-1.5">IRGSP</th>
                    <th className="text-right px-2 py-1.5">Members</th>
                    <th className="text-left px-2 py-1.5">Traits</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((o) => (
                    <OgRow
                      key={o.ogId}
                      row={o}
                      panelTotal={bundle.panelTotalCount}
                      onClick={() => navigate(ogHref(o))}
                    />
                  ))}
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-[12px] text-gray-500">
                        No OGs match the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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

function OgRow({
  row,
  panelTotal,
  onClick,
}: {
  row: OgIndexRow;
  panelTotal: number;
  onClick: () => void;
}) {
  const tier = row.tier as ConservationTier;
  return (
    <tr
      onClick={onClick}
      className="border-b border-gray-100 hover:bg-green-50 cursor-pointer"
    >
      <td className="pl-3 pr-2 py-1.5">
        <Link
          to={ogHref(row)}
          onClick={(e) => e.stopPropagation()}
          className="font-mono text-[12px] text-gray-900 hover:text-green-700 hover:underline"
        >
          {row.ogId}
        </Link>
      </td>
      <td className="px-2 py-1.5">
        <span className={`text-[10px] uppercase tracking-wide border rounded px-1.5 py-[1px] ${tierTone(tier)}`}>
          {tierLabel(tier)}
        </span>
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums text-[12px] text-gray-700">
        {row.presentCount}/{panelTotal}
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums text-[12px] text-gray-700">
        {row.irgspCopyCount === 0 ? <span className="text-gray-400">×</span> : `×${row.irgspCopyCount}`}
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums text-[12px] text-gray-700">
        {row.memberCount}
      </td>
      <td className="px-2 py-1.5">
        {row.traits && row.traits.length > 0 ? (
          <span className="inline-flex flex-wrap gap-1">
            {row.traits.slice(0, 5).map((t) => (
              <span
                key={t}
                className="text-[10px] font-mono border border-amber-200 bg-amber-50 text-amber-800 rounded px-1 py-[1px]"
                title={t}
              >
                {TRAIT_ABBR[t] ?? t.slice(0, 3).toUpperCase()}
              </span>
            ))}
            {row.traits.length > 5 && (
              <span className="text-[10px] text-gray-400">+{row.traits.length - 5}</span>
            )}
            {row.bestTraitP !== undefined && (
              <span className="text-[10px] text-gray-500 tabular-nums">
                p={row.bestTraitP < 1e-4 ? row.bestTraitP.toExponential(1) : row.bestTraitP.toFixed(3)}
              </span>
            )}
          </span>
        ) : (
          <span className="text-[10px] text-gray-400">—</span>
        )}
      </td>
    </tr>
  );
}
