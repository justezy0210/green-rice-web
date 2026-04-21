import type { AnalysisStepStatus } from '@/types/analysis-run';

interface Props {
  status: AnalysisStepStatus;
}

const LABELS: Record<AnalysisStepStatus, string> = {
  ready: 'Ready',
  pending: 'Pending',
  disabled: 'Disabled',
  error: 'Error',
};

const CLASSES: Record<AnalysisStepStatus, string> = {
  ready: 'bg-green-50 text-green-700 border-green-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  disabled: 'bg-gray-50 text-gray-500 border-gray-200',
  error: 'bg-red-50 text-red-700 border-red-200',
};

export function StepStatusBadge({ status }: Props) {
  return (
    <span
      className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${CLASSES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
