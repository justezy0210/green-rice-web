import { Link } from 'react-router-dom';
import { TRAITS } from '@/config/traits';

interface TraitCellData {
  /** Minimum / best p-value observed for this trait (lower = stronger signal). */
  minP: number | null;
  /** Candidate count for this trait that rolls into the current context. */
  count: number;
}

interface Props {
  activeTraitId: string | null;
  /** traitId → { minP, count }. Consumers compute this from candidate sets. */
  perTrait: Record<string, TraitCellData>;
  /**
   * Given a traitId, return the URL to jump to — usually the matching
   * run overview or block detail. `null` to render a disabled cell.
   */
  linkFor?: (traitId: string) => string | null;
  title?: string;
}

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

/**
 * 9-trait horizontal strip summarising per-trait signal for a given
 * context (OG, block, gene). Colour darkens with -log10(p); empty
 * cells stay muted. Usable wherever a trait ribbon is helpful.
 */
export function TraitRibbon({ activeTraitId, perTrait, linkFor, title }: Props) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {title && (
        <span className="text-[10px] uppercase tracking-wide text-gray-500 mr-1">
          {title}
        </span>
      )}
      {TRAITS.map((t) => {
        const d = perTrait[t.id];
        const isActive = t.id === activeTraitId;
        const href = linkFor ? linkFor(t.id) : null;
        const cellClass = toneClass(d, isActive);
        const tooltip = d
          ? `${t.label}: ${d.count} candidate${d.count === 1 ? '' : 's'}${
              d.minP !== null ? ` · min p=${formatP(d.minP)}` : ''
            }`
          : `${t.label}: no signal at this context`;
        const content = (
          <>
            <span className="font-mono font-semibold">{TRAIT_ABBR[t.id] ?? t.id.slice(0, 3).toUpperCase()}</span>
            {d && d.count > 0 && (
              <span className="ml-1 tabular-nums">{d.count}</span>
            )}
          </>
        );
        return href ? (
          <Link
            key={t.id}
            to={href}
            title={tooltip}
            className={`text-[10px] px-1.5 py-0.5 rounded border ${cellClass} hover:opacity-90`}
          >
            {content}
          </Link>
        ) : (
          <span
            key={t.id}
            title={tooltip}
            className={`text-[10px] px-1.5 py-0.5 rounded border ${cellClass} cursor-default`}
          >
            {content}
          </span>
        );
      })}
    </div>
  );
}

function toneClass(d: TraitCellData | undefined, active: boolean): string {
  if (active) {
    return 'border-green-400 bg-green-100 text-green-800';
  }
  if (!d || d.count === 0) {
    return 'border-gray-100 bg-gray-50 text-gray-400';
  }
  // Active-signal tiers: stronger p-values override the block-count
  // default so trait ribbons on p-value-bearing surfaces stay graded.
  if (d.minP !== null && d.minP < 1e-3) {
    return 'border-red-300 bg-red-50 text-red-700';
  }
  if (d.minP !== null && d.minP < 1e-2) {
    return 'border-amber-300 bg-amber-100 text-amber-800';
  }
  // count > 0 with no p-value (block-derived surface like Region page)
  // — amber tint so "this trait has candidates here" pops vs the muted
  // no-signal slots.
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function formatP(p: number): string {
  if (p < 1e-4) return p.toExponential(1);
  return p.toFixed(3);
}
