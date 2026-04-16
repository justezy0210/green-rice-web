import type { BaegilmiGeneAnnotation, BaegilmiGeneInfo } from '@/types/orthogroup-artifacts';

const DEFAULT_LIMIT = 20;

/** Replace the alpha component of an rgba() string. */
function withAlpha(rgba: string, alpha: number): string {
  return rgba.replace(/rgba?\(([^)]+)\)/, (_, inner: string) => {
    const parts = inner.split(',').map((s) => s.trim());
    return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
  });
}

interface Props {
  cultivarId: string;
  cultivarName: string;
  geneIds: string[];
  groupLabel?: string;
  groupColor?: { bg: string; border: string } | null;
  annotation: BaegilmiGeneAnnotation | null;
  expanded: boolean;
  onToggleExpand: () => void;
  showAdminHint?: boolean;
}

export function OgDrawerCultivarSection({
  cultivarId,
  cultivarName,
  geneIds,
  groupLabel,
  groupColor,
  annotation,
  expanded,
  onToggleExpand,
  showAdminHint,
}: Props) {
  const hasAnnotation = cultivarId === 'baegilmi' && annotation != null;
  const shown = expanded ? geneIds : geneIds.slice(0, DEFAULT_LIMIT);
  const hasMore = geneIds.length > DEFAULT_LIMIT;

  return (
    <section
      className="px-4 py-3 border-b border-gray-100 text-xs border-l-4"
      style={{
        borderLeftColor: groupColor ? withAlpha(groupColor.border, 0.35) : 'transparent',
      }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{cultivarName}</span>
          <span className="text-gray-400">count: {geneIds.length}</span>
          {groupLabel && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded border"
              style={
                groupColor
                  ? {
                      backgroundColor: withAlpha(groupColor.bg, 0.2),
                      borderColor: withAlpha(groupColor.border, 0.35),
                      color: withAlpha(groupColor.border, 0.9),
                    }
                  : { backgroundColor: '#f9fafb', borderColor: '#e5e7eb', color: '#4b5563' }
              }
            >
              {groupLabel}
            </span>
          )}
        </div>
      </div>

      <ul className="space-y-1">
        {shown.map((geneId) => (
          <GeneRow
            key={geneId}
            geneId={geneId}
            annotation={hasAnnotation ? annotation : null}
          />
        ))}
      </ul>

      {hasMore && (
        <button
          type="button"
          onClick={onToggleExpand}
          className="mt-1.5 text-[11px] text-green-700 hover:text-green-800 underline"
        >
          {expanded ? `Show fewer (${DEFAULT_LIMIT})` : `Show all ${geneIds.length}`}
        </button>
      )}

      {!hasAnnotation && showAdminHint && (
        <p className="mt-1 text-[10px] text-gray-400 italic">
          No annotation yet. Upload this cultivar&apos;s GFF3 to see gene locations.
        </p>
      )}
    </section>
  );
}

function GeneRow({ geneId, annotation }: { geneId: string; annotation: BaegilmiGeneAnnotation | null }) {
  const info = resolveGene(geneId, annotation);
  const name = info ? pickName(info.attributes) : null;

  return (
    <li className="font-mono text-[11px] text-gray-700">
      <span>{geneId}</span>
      {info && (
        <span className="ml-2 text-gray-400">
          {info.chromosome}:{info.start.toLocaleString()}-{info.end.toLocaleString()}
          <span className={`ml-2 not-italic ${name ? 'text-gray-500' : 'text-gray-400 italic'}`}>
            · {name ?? 'NA'}
          </span>
        </span>
      )}
    </li>
  );
}

function resolveGene(
  geneOrTranscriptId: string,
  annotation: BaegilmiGeneAnnotation | null,
): BaegilmiGeneInfo | null {
  if (!annotation) return null;
  if (annotation.genes[geneOrTranscriptId]) return annotation.genes[geneOrTranscriptId];
  const mappedGeneId = annotation.transcript_to_gene[geneOrTranscriptId];
  if (mappedGeneId && annotation.genes[mappedGeneId]) return annotation.genes[mappedGeneId];
  const stripped = geneOrTranscriptId.replace(/\.t\d+$/, '');
  return annotation.genes[stripped] ?? null;
}

function pickName(attrs: Record<string, string>): string | null {
  const v = attrs['Name'];
  if (!v) return null;
  return decodeURIComponent(v.replace(/\+/g, ' '));
}
