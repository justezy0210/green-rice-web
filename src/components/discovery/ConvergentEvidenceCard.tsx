import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { BlockTypeBadge } from '@/components/discovery/BlockTypeBadge';
import type { CandidateBlock } from '@/types/candidate-block';

interface Props {
  block: CandidateBlock;
  firstSvEventId?: string | null;
  firstOgId?: string | null;
}

/**
 * The single card where the four evidences meet:
 *  SV · OG · Intersection · Function · footer actions.
 *
 * Every other surface (OG/SV/Candidate/Region) links back here rather
 * than re-implementing the convergence rendering.
 */
export function ConvergentEvidenceCard({ block, firstSvEventId, firstOgId }: Props) {
  const region = `${block.region.chr}:${block.region.start.toLocaleString()}-${block.region.end.toLocaleString()}`;
  const regionShort = `${block.region.chr}:${(block.region.start / 1_000_000).toFixed(1)}–${(block.region.end / 1_000_000).toFixed(1)} Mb`;
  const groupLabels = block.groupLabels;
  const groupA = groupLabels[0];
  const groupB = groupLabels[1];
  const annotations = block.representativeAnnotations.slice(0, 6);

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <h3 className="text-xs uppercase tracking-wide text-gray-500">
            Convergent evidence
          </h3>
          <span className="text-[10px] text-gray-400 font-mono">{region}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          {/* SV block */}
          <div className="rounded border border-gray-200 bg-white p-3">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">
              Structural variation
            </div>
            <div className="mt-1 text-[12px] text-gray-700 leading-snug">
              <span className="tabular-nums font-medium">{block.svCount}</span> SV event{block.svCount === 1 ? '' : 's'} in {regionShort}
            </div>
            {block.topSvs && block.topSvs.length > 0 && (
              <div className="mt-1 text-[11px] text-gray-500">
                lead: <span className="font-mono">{block.topSvs[0].eventId}</span>
              </div>
            )}
            <div className="mt-1.5 text-[10px] text-gray-500">
              group-specificity:{' '}
              <span className="text-gray-700">{block.evidenceStatus.svImpact}</span>
            </div>
          </div>

          {/* OG block */}
          <div className="rounded border border-gray-200 bg-white p-3">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">
              Orthogroups
            </div>
            <div className="mt-1 text-[12px] text-gray-700 leading-snug">
              <span className="tabular-nums font-medium">{block.candidateOgCount}</span> candidate OG{block.candidateOgCount === 1 ? '' : 's'}
            </div>
            {firstOgId && (
              <div className="mt-1 text-[11px] text-gray-500">
                lead:{' '}
                <Link
                  to={`/og/${encodeURIComponent(firstOgId)}?trait=${block.traitId}`}
                  className="font-mono text-green-700 hover:underline"
                >
                  {firstOgId}
                </Link>
              </div>
            )}
            <div className="mt-1.5 text-[10px] text-gray-500">
              OG pattern: <span className="text-gray-700">{block.evidenceStatus.ogPattern}</span>
            </div>
          </div>

          {/* Intersection block */}
          <div className="rounded border border-gray-200 bg-white p-3">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">
              OG × SV overlap
            </div>
            <div className="mt-1 text-[12px] text-gray-700 leading-snug">
              <span className="tabular-nums font-medium">{block.intersectionCount}</span> intersection{block.intersectionCount === 1 ? '' : 's'}
            </div>
            <div className="mt-1 text-[11px] text-gray-500">
              impact: gene_body / promoter (mixed)
            </div>
            <div className="mt-1.5 text-[10px] text-gray-500">
              SV impact: <span className="text-gray-700">{block.evidenceStatus.svImpact}</span>
            </div>
          </div>

          {/* Function block */}
          <div className="rounded border border-gray-200 bg-white p-3">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">
              Annotation
            </div>
            {annotations.length > 0 ? (
              <ul className="mt-1 space-y-0.5 text-[11px] text-gray-700 leading-snug">
                {annotations.slice(0, 3).map((a) => (
                  <li key={a} className="truncate" title={a}>
                    • {a}
                  </li>
                ))}
                {annotations.length > 3 && (
                  <li className="text-gray-400">…{annotations.length - 3} more</li>
                )}
              </ul>
            ) : (
              <p className="mt-1 text-[11px] text-gray-400 italic">no annotated OG in block</p>
            )}
            {block.repeatedFamilyFlag && (
              <div className="mt-1.5 text-[10px] text-amber-700">
                repeated family cluster
              </div>
            )}
            <div className="mt-1.5 text-[10px] text-gray-500">
              function: <span className="text-gray-700">{block.evidenceStatus.function}</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-2 border-t border-gray-100 text-[11px]">
          <BlockTypeBadge blockType={block.blockType} />
          <span className="text-gray-500 tabular-nums">
            group balance:{' '}
            <strong className="text-gray-700">
              {block.groupCounts[groupA] ?? 0}
            </strong>{' '}
            {groupA} ·{' '}
            <strong className="text-gray-700">
              {block.groupCounts[groupB] ?? 0}
            </strong>{' '}
            {groupB}
          </span>
          <span className="ml-auto flex gap-3">
            <Link
              to={`/discovery/${block.runId}/candidates`}
              className="text-green-700 hover:underline"
            >
              Candidates →
            </Link>
            <Link
              to={`/discovery/${block.runId}/variants`}
              className="text-green-700 hover:underline"
            >
              SV browser →
            </Link>
            {firstSvEventId && firstOgId && (
              <Link
                to={`/region/baegilmi/${block.region.chr}/${Math.max(0, block.region.start - 5000)}-${block.region.end + 5000}`}
                className="text-green-700 hover:underline"
              >
                Region →
              </Link>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
