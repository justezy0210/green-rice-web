import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TRAITS } from '@/config/traits';
import {
  classifyOg,
  tierLabel,
  tierTone,
  type OgConservationBundle,
} from '@/lib/og-conservation';
import type { TraitHit } from '@/hooks/useTraitHits';

const TRAIT_ABBR: Record<string, string> = {
  heading_date: 'HD',
  culm_length: 'CL',
  panicle_length: 'PL',
  panicle_number: 'PN',
  spikelets_per_panicle: 'SPP',
  ripening_rate: 'RR',
  grain_weight: 'GW',
  pre_harvest_sprouting: 'PHS',
  bacterial_leaf_blight: 'BLB',
};

interface CultivarInfo {
  id: string;
  name: string;
}

interface Props {
  ogId: string;
  bundle: OgConservationBundle | null;
  loading: boolean;
  error: Error | null;
  /** Panel cultivars (UI-ordered). IRGSP is appended separately. */
  cultivars: CultivarInfo[];
  /** The cultivar the current entity belongs to — ring-highlighted. */
  highlightCultivarId?: string;
  /**
   * Callback to build a per-cultivar link (e.g. opening the first
   * gene of that cultivar in this OG). `null` → non-clickable pill.
   */
  linkForCultivar?: (cultivarId: string) => string | null;
  /**
   * Traits whose group-contrast MWU hit a significance threshold for
   * this OG (from `useTraitHits().hitsForOg(ogId)`). Sorted by
   * caller; ascending-p order recommended. Empty = not
   * trait-discriminating by current analysis.
   */
  traitHits?: TraitHit[];
}

/**
 * Interpretive conservation/PAV card that replaces the older raw
 * copy-count grid. Reads a single compact bundle fetched once per
 * session. Header shows tier + one-line summary; body shows 11
 * panel pills + divider + IRGSP chip; footer carries the
 * assembly-based-absence caveat as info text.
 */
export function ConservationSummary({
  ogId,
  bundle,
  loading,
  error,
  cultivars,
  highlightCultivarId,
  linkForCultivar,
  traitHits,
}: Props) {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-3 text-[12px] text-gray-400">
          Loading conservation bundle…
        </CardContent>
      </Card>
    );
  }
  if (error) {
    return (
      <Card>
        <CardContent className="py-3 text-[12px] text-red-600">
          Could not load conservation bundle: {error.message}
        </CardContent>
      </Card>
    );
  }
  if (!bundle) return null;
  const counts = bundle.counts[ogId];
  if (!counts) {
    return (
      <Card>
        <CardContent className="py-3 text-[12px] text-gray-500">
          No conservation record for {ogId}.
        </CardContent>
      </Card>
    );
  }
  const summary = classifyOg(counts, bundle.samples);
  const irgspIdx = bundle.samples.indexOf('IRGSP-1.0');
  const irgspCount = irgspIdx >= 0 ? counts[irgspIdx] ?? 0 : 0;
  const sampleToCount = new Map<string, number>();
  bundle.samples.forEach((s, i) => sampleToCount.set(s, counts[i] ?? 0));
  const headerLine = `${summary.panelPresentCount}/${summary.panelTotalCount} panel · IRGSP ${summary.irgspPresent ? `present (×${irgspCount})` : 'absent'}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-baseline gap-2 flex-wrap">
          <span>Conservation</span>
          <span
            className={`text-[10px] uppercase tracking-wide border rounded px-1.5 py-[1px] ${tierTone(summary.tier)}`}
          >
            {tierLabel(summary.tier)}
          </span>
          {traitHits?.map((h) => <TraitHitChip key={h.t} hit={h} />)}
          <span className="text-xs font-normal text-gray-500">
            {headerLine}
          </span>
          <span className="text-[10px] font-normal text-gray-400 font-mono ml-auto">
            {ogId}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-1.5">
          {cultivars.map((c) => (
            <CultivarPill
              key={c.id}
              name={c.name}
              count={sampleToCount.get(c.id) ?? 0}
              highlight={c.id === highlightCultivarId}
              href={linkForCultivar ? linkForCultivar(c.id) : null}
            />
          ))}
          <span className="text-gray-300 mx-1 select-none">│</span>
          <IrgspChip count={irgspCount} />
        </div>
        <p className="mt-2 text-[10px] text-gray-400 leading-snug">
          Counts are per-cultivar transcript membership in this OrthoFinder
          orthogroup. Absences may reflect current assembly/annotation limits
          (fragmented contigs, missing annotation) rather than true PAV.
        </p>
      </CardContent>
    </Card>
  );
}

function CultivarPill({
  name,
  count,
  highlight,
  href,
}: {
  name: string;
  count: number;
  highlight: boolean;
  href: string | null;
}) {
  const tone =
    count === 0
      ? 'border-gray-200 bg-gray-50 text-gray-500'
      : count === 1
        ? 'border-green-200 bg-green-50 text-green-700'
        : 'border-violet-200 bg-violet-50 text-violet-700';
  const cls = `text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded border ${tone} ${highlight ? 'ring-1 ring-green-400' : ''}`;
  const body = (
    <>
      <span className="font-mono text-[10px]">{name}</span>
      <span className="opacity-60">·</span>
      <span className="tabular-nums">{count}</span>
    </>
  );
  if (href) return <Link to={href} className={`${cls} hover:opacity-90`}>{body}</Link>;
  return <span className={cls} title={count === 0 ? 'no annotated OG member' : undefined}>{body}</span>;
}

function TraitHitChip({ hit }: { hit: TraitHit }) {
  const abbr = TRAIT_ABBR[hit.t] ?? hit.t.slice(0, 3).toUpperCase();
  const label = TRAITS.find((t) => t.id === hit.t)?.label ?? hit.t;
  const tone =
    hit.p < 1e-4
      ? 'border-red-300 bg-red-50 text-red-800'
      : hit.p < 1e-3
        ? 'border-amber-400 bg-amber-100 text-amber-900'
        : 'border-amber-200 bg-amber-50 text-amber-800';
  const pText = hit.p < 1e-4 ? hit.p.toExponential(1) : hit.p.toFixed(4);
  const lfcText = hit.lfc !== undefined ? ` · log2FC ${hit.lfc.toFixed(2)}` : '';
  return (
    <span
      className={`text-[10px] inline-flex items-center gap-1 px-1.5 py-[1px] rounded border font-mono ${tone}`}
      title={`${label} · p=${pText}${lfcText}`}
    >
      <span className="font-semibold">{abbr}</span>
      <span className="opacity-70">p={pText}</span>
    </span>
  );
}

function IrgspChip({ count }: { count: number }) {
  const tone =
    count === 0
      ? 'border-slate-300 bg-white text-slate-500'
      : 'border-slate-400 bg-white text-slate-800';
  return (
    <span
      className={`text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded border-dashed border ${tone}`}
      title={
        count === 0
          ? 'IRGSP-1.0 (Nipponbare reference) has no member in this OG'
          : `IRGSP-1.0 has ${count} transcript${count === 1 ? '' : 's'} in this OG`
      }
    >
      <span className="font-mono text-[10px]">IRGSP</span>
      <span className="opacity-60">·</span>
      <span className="tabular-nums">{count}</span>
    </span>
  );
}
