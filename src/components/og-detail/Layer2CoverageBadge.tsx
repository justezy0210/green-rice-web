import { PANEL_LABEL } from '@/config/panel';

/**
 * Small coverage pill surfaced near Layer 2 (AF / graph) sources so users
 * remember these are reference-anchored and cover only the pangenome subset
 * of the panel.
 */
export function Layer2CoverageBadge() {
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded border border-gray-300 bg-white text-gray-500"
      title={`AF and graph come from the Cactus pangenome VCF: ${PANEL_LABEL.coverageOf} cultivars aligned, IRGSP-anchored. Non-syntenic events may be missed.`}
    >
      {PANEL_LABEL.coverageFraction} · IRGSP-anchored
    </span>
  );
}
