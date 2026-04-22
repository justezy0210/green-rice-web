import type { CandidateBlock } from '@/types/candidate-block';

/**
 * Template-based auto narrative. No free generation; the shape is fixed
 * and every phrase is scope-safe ("observed along with", "candidate",
 * "proposed"). Do not introduce "causal", "validated", "driver",
 * "determinant", "marker-ready", "explains", "confers".
 */
export function BlockNarrative({ block }: { block: CandidateBlock }) {
  const region = `${block.region.chr}:${(block.region.start / 1_000_000).toFixed(1)}–${(block.region.end / 1_000_000).toFixed(1)} Mb`;
  const groupA = block.groupLabels[0];
  const groupB = block.groupLabels[1];
  const nA = block.groupCounts[groupA] ?? 0;
  const nB = block.groupCounts[groupB] ?? 0;
  const annotationPhrase = formatAnnotations(block.representativeAnnotations);
  const impactPhrase = 'gene_body / promoter overlap';

  const sentence = block.curated
    ? `이 curated review region은 ${region} 영역의 인접 candidate rows를 하나의 구조적 이웃 맥락에서 함께 보여준다. ${impactPhrase}과 ${annotationPhrase} annotation이 함께 관찰되며, 독립 locus 여러 개보다 하나의 review unit으로 읽는 편이 적절하다.`
    : `제안된 ${groupA}/${groupB} 그룹 (n=${nA}/${nB}) 분할에서 ${region} window의 일부 SV events는 반대 그룹보다 더 높은 allele frequency 차이를 보이며, 같은 window 안에 copy-count contrast를 보이는 ${block.candidateOgCount}개 orthogroup과 ${block.intersectionCount}개 OG×SV overlap row가 함께 관찰된다. 따라서 이 1 Mb window는 ${block.traitId} run에서 우선 검토할 candidate locus로 표시된다.`;

  return (
    <div className="text-[13px] text-gray-700 leading-relaxed bg-gray-50 border border-gray-200 rounded px-3 py-2">
      {sentence}
    </div>
  );
}

function formatAnnotations(annotations: string[]): string {
  if (annotations.length === 0) return 'annotated function-family';
  const families: string[] = [];
  const joined = annotations.join(' ').toLowerCase();
  if (joined.includes('wak')) families.push('WAK-like');
  if (joined.includes('nlr') || joined.includes('nb-arc')) families.push('NLR-like');
  if (joined.includes('lrr')) families.push('LRR');
  if (joined.includes('kinase')) families.push('kinase');
  if (families.length === 0) return 'annotated function';
  return families.slice(0, 3).join(' / ');
}
