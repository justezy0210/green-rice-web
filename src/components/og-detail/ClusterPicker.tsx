import type { GeneCluster } from '@/types/orthogroup';

interface Props {
  clusters: GeneCluster[];
  selectedCluster: GeneCluster | null;
  onClusterSelect?: (c: GeneCluster) => void;
}

export function ClusterPicker({
  clusters,
  selectedCluster,
  onClusterSelect,
}: Props) {
  if (clusters.length === 0) return null;
  const value = selectedCluster?.id ?? clusters[0]?.id ?? '';
  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      <label className="text-gray-500">View:</label>
      <select
        value={value}
        onChange={(e) => {
          const next = clusters.find((c) => c.id === e.target.value);
          if (next) onClusterSelect?.(next);
        }}
        className="text-[11px] border border-gray-200 rounded px-2 py-1 bg-white hover:border-gray-300 focus:border-green-600 focus:outline-none max-w-[620px] truncate"
        disabled={!onClusterSelect}
      >
        {clusters.map((c) => (
          <option key={c.id} value={c.id}>
            {formatClusterOption(c)}
          </option>
        ))}
      </select>
    </div>
  );
}

function formatClusterOption(c: GeneCluster): string {
  const mb = (n: number) => (n / 1_000_000).toFixed(2);
  if (c.source === 'reference') {
    return `IRGSP reference · ${c.chr}:${mb(c.start)}M`;
  }
  const span = c.start === c.end ? `${mb(c.start)}M` : `${mb(c.start)}–${mb(c.end)}M`;
  const info = c.genes.length === 1 ? c.kind : `${c.genes.length} genes · ${c.kind}`;
  return `${c.cultivar} · ${c.chr}:${span} (${info})`;
}
