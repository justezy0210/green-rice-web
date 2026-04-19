export function TubeMapLegend() {
  return (
    <div className="px-1 pt-2 text-[10px] text-gray-500 leading-relaxed">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm bg-gray-200 border border-gray-300" />
          shared (all cultivars)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-2 rounded-sm bg-amber-100 border border-amber-400" />
          divergent (bubble alt)
        </span>
        <span className="flex items-center gap-1">
          <span className="font-semibold">✓</span> annotated OG member in region
        </span>
        <span className="flex items-center gap-1 opacity-60">
          <span className="font-semibold">⊘</span> no annotated OG member here
          (gene elsewhere) — path dimmed
        </span>
      </div>
      <div className="mt-1 text-gray-400">
        Paths indicate aligned DNA through the region, not the presence of an
        annotated OG member at this locus. Annotation absence is not the same as
        gene absence (could be annotation gap, fragmented model, or relocation).
        Hover a label for details.
      </div>
    </div>
  );
}
