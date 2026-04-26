import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { blockCountOf } from '@/lib/discovery-runs';
import type { AnalysisRun } from '@/types/analysis-run';

interface Props {
  run: AnalysisRun;
  traitLabel: string;
}

export function DiscoveryRunRow({ run, traitLabel }: Props) {
  const blockCount = blockCountOf(run);

  return (
    <li className="grid grid-cols-1 gap-2 px-1 py-2.5 text-sm hover:bg-green-50/40 lg:grid-cols-[minmax(180px,1fr)_120px_110px_160px] lg:items-center lg:gap-3">
      <div className="min-w-0">
        <div className="font-medium text-gray-900">{traitLabel}</div>
      </div>

      <Metric value={run.candidateCount} label="candidates" />

      <div>
        {blockCount > 0 ? (
          <Metric value={blockCount} label="blocks" />
        ) : (
          <Badge variant="outline" className="h-auto rounded px-1.5 py-0.5 text-[10px]">
            candidate-only
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs lg:justify-end">
        <Link
          to={`/discovery/${run.runId}/candidates`}
          className="text-gray-600 hover:text-green-700 hover:underline"
        >
          Candidates
        </Link>
        <Link
          to={`/discovery/${run.runId}/blocks`}
          className="text-gray-600 hover:text-green-700 hover:underline"
        >
          Blocks
        </Link>
        <Link
          to={`/discovery/${run.runId}`}
          className="inline-flex items-center gap-1 text-green-700 hover:underline"
        >
          Open
          <ArrowRight className="size-3" aria-hidden />
        </Link>
      </div>
    </li>
  );
}

function Metric({ value, label }: { value: number | null | undefined; label: string }) {
  return (
    <div>
      <div className="tabular-nums text-gray-900">{Number(value ?? 0).toLocaleString()}</div>
      <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
    </div>
  );
}
