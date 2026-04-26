import type { CandidateAxisScore, CandidateAxisStatus, CandidateEvidenceAxis } from '@/types/candidate';

interface Props {
  scores: CandidateAxisScore[];
}

const AXIS_LABEL: Record<CandidateEvidenceAxis, string> = {
  group_specificity: 'Group specificity',
  function: 'Function',
  og_pattern: 'OG pattern',
  sv_impact: 'SV impact',
  synteny: 'Synteny',
  expression: 'Expression',
  qtl: 'QTL overlap',
};

const STATUS_CLASSES: Record<CandidateAxisStatus, string> = {
  ready: 'bg-green-50 text-green-700 border-green-200',
  pending: 'bg-gray-50 text-gray-500 border-gray-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  external_future: 'bg-blue-50 text-blue-700 border-blue-200',
};

const STATUS_LABEL: Record<CandidateAxisStatus, string> = {
  ready: 'ready',
  pending: 'pending',
  partial: 'partial',
  external_future: 'external',
};

export function CandidateScoreBoard({ scores }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
      {scores.map((s) => (
        <AxisTile key={s.axis} score={s} />
      ))}
    </div>
  );
}

function AxisTile({ score }: { score: CandidateAxisScore }) {
  const isReady = score.status === 'ready';
  const hasScore = isReady && score.score !== null && Number.isFinite(score.score);
  return (
    <div className="rounded-md border border-gray-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="text-xs font-medium text-gray-800">{AXIS_LABEL[score.axis]}</div>
        <span
          className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${STATUS_CLASSES[score.status]}`}
        >
          {STATUS_LABEL[score.status]}
        </span>
      </div>
      {hasScore ? (
        <div className="tabular-nums text-lg font-semibold text-gray-900">
          {(score.score ?? 0).toFixed(2)}
        </div>
      ) : (
        <div className="text-[11px] text-gray-400">—</div>
      )}
      {score.note && (
        <div className="text-[10px] text-gray-500 mt-1 leading-snug break-words">
          {score.note}
        </div>
      )}
    </div>
  );
}
