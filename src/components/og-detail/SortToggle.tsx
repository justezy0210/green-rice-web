import type { TubeMapSortMode } from '@/lib/tube-map-ordering';

export function SortToggle({
  sortMode,
  onChange,
}: {
  sortMode: TubeMapSortMode;
  onChange: (m: TubeMapSortMode) => void;
}) {
  const btn = (mode: TubeMapSortMode, label: string, hint: string) => (
    <button
      type="button"
      onClick={() => onChange(mode)}
      title={hint}
      className={`px-2 py-0.5 text-[11px] border rounded transition-colors ${
        sortMode === mode
          ? 'bg-green-600 border-green-600 text-white'
          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex items-center gap-2 px-1 pb-2 text-[11px] text-gray-500">
      <span>Sort:</span>
      {btn('phenotype', 'Phenotype', 'Group paths by phenotype group, then cultivar name')}
      {btn(
        'graphOverlap',
        'Graph overlap',
        'Cluster cultivars by shared divergent graph structure (UPGMA, length-weighted Jaccard). Not an AF similarity order.',
      )}
    </div>
  );
}
