import type { CandidateBlock } from '@/types/candidate-block';

/**
 * Template-based auto narrative. No free generation; the shape is
 * fixed and every phrase is scope-safe ("observed along with",
 * "candidate", "proposed"). Do NOT introduce "causal", "validated",
 * "driver", "determinant", "marker-ready", "explains", "confers".
 *
 * Two sentences: (1) what was observed (numbers + observed families),
 * (2) how the reader should treat this review unit (priority + caveats).
 */
export function BlockNarrative({ block }: { block: CandidateBlock }) {
  const region = `${block.region.chr}:${(block.region.start / 1_000_000).toFixed(1)}–${(block.region.end / 1_000_000).toFixed(1)} Mb`;
  const groupA = block.groupLabels[0];
  const groupB = block.groupLabels[1];
  const nA = block.groupCounts[groupA] ?? 0;
  const nB = block.groupCounts[groupB] ?? 0;
  const familiesPhrase = formatAnnotationFamilies(block.representativeAnnotations);
  const candidateMix = formatCandidateTypeMix(block.candidateTypeCounts);
  const topSvPhrase = formatTopSv(block.topSvs);
  const intersectionLine = block.intersectionCount > 0
    ? `OG×SV overlap ${block.intersectionCount}개 row`
    : 'OG×SV overlap 0개 row';

  const sentence1 = block.curated
    ? `이 curated review region (${region}, traits: ${block.traitId})에는 ${block.candidateOgCount}개 candidate OG와 ${intersectionLine}가 포함되어 있으며${topSvPhrase ? `, 그 중 ${topSvPhrase}` : ''}, ${familiesPhrase} annotation이 함께 관찰된다.`
    : `제안된 ${groupA}/${groupB} 그룹 분할 (n=${nA}/${nB}) 기준, ${region} window에서 ${block.candidateOgCount}개 candidate OG와 ${intersectionLine}가 함께 관찰된다${candidateMix ? ` (${candidateMix})` : ''}${topSvPhrase ? `; ${topSvPhrase}` : ''}.`;

  const sentence2 = block.curated
    ? `인접한 candidate rows가 하나의 구조적 이웃 맥락으로 묶여있으므로, 독립 locus 여러 개보다 하나의 review unit으로 읽는 편이 적절하다. ${block.traitId} run의 우선 검토 대상이다.`
    : `이 1 Mb window는 ${block.traitId} run에서 우선 검토할 candidate locus로 표시된다. Window 경계는 review 편의 기준이며, haplotype boundary를 주장하지 않는다.`;

  return (
    <div className="text-[13px] text-gray-700 leading-relaxed bg-gray-50 border border-gray-200 rounded px-3 py-2 space-y-1.5">
      <p>{sentence1}</p>
      <p className="text-gray-600">{sentence2}</p>
    </div>
  );
}

function formatAnnotationFamilies(annotations: string[]): string {
  if (annotations.length === 0) return 'annotated function-family 부재';
  const families: string[] = [];
  const joined = annotations.join(' ').toLowerCase();
  if (joined.includes('wak')) families.push('WAK-like');
  if (joined.includes('nlr') || joined.includes('nb-arc')) families.push('NLR-like');
  if (joined.includes('lrr')) families.push('LRR');
  if (joined.includes('kinase')) families.push('kinase');
  if (joined.includes('wrky')) families.push('WRKY');
  if (joined.includes('transcription')) families.push('TF');
  if (families.length === 0) return '기타 annotated function';
  return families.slice(0, 3).join(' / ');
}

function formatCandidateTypeMix(counts: Record<string, number>): string {
  if (!counts || Object.keys(counts).length === 0) return '';
  const ordered = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  return ordered.map(([k, v]) => `${k} ${v}`).join(' · ');
}

function formatTopSv(
  topSvs: Array<{ eventId: string; count: number }> | undefined,
): string {
  if (!topSvs || topSvs.length === 0) return '';
  const first = topSvs[0];
  if (!first) return '';
  return `lead SV ${first.eventId} (${first.count}회 반복 관찰)`;
}
