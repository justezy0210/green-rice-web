import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import type { CandidateBestSv } from '@/types/candidate';

interface Props {
  bestSv: CandidateBestSv | null;
  traitId: string | null;
  groupLabels: string[];
  meansByGroup: Record<string, number> | null | undefined;
  presenceByGroup: Record<string, number> | null | undefined;
}

/**
 * Foregrounds the OG's trait-linked SV signal. Do not link raw
 * `bestSv.cultivar`, `bestSv.geneId`, or `bestSv.impactClass` fields from
 * here: those fields are overlap provenance and may name a REF cultivar. SV
 * detail chooses an ALT-carrier region from genotype data.
 */
export function OgLeadSvCard({
  bestSv,
  traitId,
  groupLabels,
  meansByGroup,
  presenceByGroup,
}: Props) {
  if (!bestSv) return null;

  const span =
    bestSv.start === bestSv.end
      ? `${bestSv.start.toLocaleString()}`
      : `${bestSv.start.toLocaleString()}–${bestSv.end.toLocaleString()}`;
  const region = `${bestSv.chr}:${span}`;

  return (
    <Card>
      <CardContent className="py-3 space-y-1">
        <div className="flex items-baseline justify-between">
          <h3 className="text-xs uppercase tracking-wide text-gray-500">
            Trait-linked SV signal
          </h3>
          {traitId && (
            <span className="text-[10px] font-mono text-gray-400">{traitId}</span>
          )}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-gray-700">
          <Link
            to={`/sv/${encodeURIComponent(bestSv.eventId)}`}
            className="font-mono text-[13px] text-green-700 hover:underline"
          >
            {bestSv.eventId}
          </Link>
          <span className="text-[10px] font-mono font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
            {bestSv.svType}
          </span>
          <span className="text-[12px] font-mono text-gray-600">{region}</span>
          {typeof bestSv.absDeltaAf === 'number' && (
            <span className="tabular-nums text-[12px] text-gray-600">
              |ΔAF|{' '}
              <strong className="text-gray-900">
                {bestSv.absDeltaAf.toFixed(2)}
              </strong>
            </span>
          )}
        </div>
        <p className="text-[11px] text-gray-500">
          SV-level signal for this OG and trait. Cultivar/gene/impact overlap
          provenance is not shown here because it is not carrier-confirmed.
        </p>
        <SummaryRow
          label="means"
          values={meansByGroup ?? null}
          labels={groupLabels}
          format={(v) => v.toFixed(2)}
        />
        <SummaryRow
          label="presence"
          values={presenceByGroup ?? null}
          labels={groupLabels}
          format={(v) => `${(v * 100).toFixed(0)}%`}
        />
        <div className="pt-1">
          <Link
            to={`/sv/${encodeURIComponent(bestSv.eventId)}`}
            className="text-[11px] text-green-700 hover:underline"
          >
            SV detail →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryRow({
  label,
  values,
  labels,
  format,
}: {
  label: string;
  values: Record<string, number> | null;
  labels: string[];
  format: (v: number) => string;
}) {
  if (!values || labels.length === 0) return null;
  return (
    <p className="text-[11px] text-gray-500">
      {label}:{' '}
      {labels.map((g, i) => (
        <span key={g}>
          <span className="text-gray-700">{g}</span>{' '}
          <span className="tabular-nums">{format(values[g] ?? 0)}</span>
          {i < labels.length - 1 ? ' · ' : ''}
        </span>
      ))}
    </p>
  );
}
