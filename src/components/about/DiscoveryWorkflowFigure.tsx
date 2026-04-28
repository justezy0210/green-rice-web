const INPUT_LAYERS = [
  ['Trait groups', 'cultivars separated by phenotype'],
  ['Gene families', 'shared genes across cultivars'],
  ['Structural variants', 'large variant carriers and positions'],
] as const;

const REVIEW_STEPS = [
  ['Compare', 'trait group patterns'],
  ['Connect', 'gene family and variant evidence'],
  ['Classify', 'local impact context'],
  ['Review', 'candidate loci for validation'],
] as const;

export function DiscoveryWorkflowFigure() {
  return (
    <figure className="rounded-lg border border-gray-200 bg-white p-3 md:p-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {INPUT_LAYERS.map(([title, detail]) => (
          <div key={title} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="text-sm font-semibold text-gray-900">{title}</div>
            <div className="mt-1 text-xs leading-snug text-gray-500">{detail}</div>
          </div>
        ))}
      </div>

      <div className="my-3 flex justify-center">
        <div className="h-8 w-px bg-gray-300 sm:hidden" />
        <div className="hidden h-px w-2/3 bg-gray-300 sm:block" />
      </div>

      <div className="rounded-md border border-green-200 bg-green-50/70 p-3">
        <div className="text-[11px] font-medium uppercase text-green-700">Evidence build</div>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
          {REVIEW_STEPS.map(([title, detail], index) => (
            <div key={title} className="relative rounded border border-green-200 bg-white px-3 py-2">
              {index > 0 && (
                <div className="absolute -left-2 top-1/2 hidden h-px w-2 bg-green-300 sm:block" />
              )}
              <div className="font-mono text-[10px] text-green-700">
                {String(index + 1).padStart(2, '0')}
              </div>
              <div className="mt-1 text-sm font-semibold text-gray-900">{title}</div>
              <div className="mt-1 text-xs leading-snug text-gray-600">{detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
        Discovery evidence narrows review targets; it does not validate causal
        variants or marker-ready results.
      </div>

      <figcaption className="mt-3 text-[11px] leading-relaxed text-gray-500">
        Candidate records are produced by linking trait-group contrast, gene family
        pattern, structural variant carriers, and local impact context.
      </figcaption>
    </figure>
  );
}
