import { useMemo } from 'react';
import { IRGSP_DISPLAY_NAME } from '@/lib/irgsp-constants';
import { buildReferenceCluster } from '@/lib/og-gene-clusters';
import type {
  GeneCluster,
  OgVariantSummary,
  OrthogroupRepresentative,
} from '@/types/orthogroup';

interface Props {
  representative?: OrthogroupRepresentative | null;
  afSummary?: OgVariantSummary | null;
  onClusterSelect?: (c: GeneCluster) => void;
  selectedClusterId: string | null;
}

export function IrgspRefSection({
  representative,
  afSummary,
  onClusterSelect,
  selectedClusterId,
}: Props) {
  const refCluster = useMemo(
    () => buildReferenceCluster(representative ?? null, afSummary ?? null),
    [representative, afSummary],
  );
  if (!representative || !representative.transcripts.length) return null;

  const regions = afSummary?.geneRegions ?? [];
  const regionByGene = new Map<string, { chr: string; start: number; end: number }>();
  for (const r of regions) regionByGene.set(r.geneId, r);
  const active = refCluster?.id === selectedClusterId;

  return (
    <section className="px-4 py-3 text-xs bg-gray-50 border-l-4 border-l-gray-400">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-medium text-gray-900">{IRGSP_DISPLAY_NAME}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-300 bg-white text-gray-600">
          reference
        </span>
        <span className="text-gray-400">
          {representative.transcripts.length} transcript
          {representative.transcripts.length > 1 ? 's' : ''}
        </span>
      </div>
      <ul className="space-y-1">
        {representative.transcripts.map((tx) => {
          const geneIdBase = tx.replace(/t(\d+)-\d+$/, 'g$1');
          const region =
            regionByGene.get(tx) ||
            regionByGene.get(geneIdBase) ||
            [...regionByGene.values()][0];
          const desc = representative.descriptions?.[tx];
          const clickable = !!(refCluster && onClusterSelect);
          return (
            <li key={tx}>
              <button
                type="button"
                onClick={() => clickable && onClusterSelect!(refCluster!)}
                disabled={!clickable}
                className={`w-full text-left px-2 py-1 rounded font-mono text-[11px] transition-colors ${
                  active
                    ? 'bg-gray-700 text-white'
                    : clickable
                      ? 'hover:bg-gray-100 text-gray-700'
                      : 'text-gray-700 cursor-default'
                }`}
              >
                <span className="mr-2">{tx}</span>
                {region ? (
                  <span className={active ? 'text-gray-200' : 'text-gray-500'}>
                    {region.chr}:{region.start.toLocaleString()}-
                    {region.end.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-gray-400 italic">coordinates unavailable</span>
                )}
                {desc && desc !== 'NA' && (
                  <span
                    className={`ml-2 text-[10px] font-sans ${
                      active ? 'text-gray-300' : 'text-gray-500'
                    }`}
                  >
                    — {desc}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
