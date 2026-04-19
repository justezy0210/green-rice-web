/**
 * Small coverage pill surfaced near Layer 2 (AF / graph) sources so users
 * remember these are reference-anchored and cover only 11/16 cultivars.
 */
export function Layer2CoverageBadge() {
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded border border-gray-300 bg-white text-gray-500"
      title="AF and graph come from the Cactus pangenome VCF: 11 of 16 cultivars aligned, IRGSP-anchored. Non-syntenic events may be missed."
    >
      11/16 · IRGSP-anchored
    </span>
  );
}
