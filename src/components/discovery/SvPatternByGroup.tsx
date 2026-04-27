import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { CultivarGenotypeStrip } from '@/components/discovery/CultivarGenotypeStrip';
import { NumberedPagination } from '@/components/discovery/NumberedPagination';
import { SvPatternGroupFrequencyBar } from '@/components/discovery/SvPatternGroupFrequencyBar';
import { TRAITS } from '@/config/traits';
import { useLocusSvGroupFreq } from '@/hooks/useLocusSvGroupFreq';
import { useAllSvEvents } from '@/hooks/useSvMatrix';
import { SV_RELEASE_ID } from '@/lib/releases';
import {
  describeSvGroupDirection,
  regionTargetForSvPatternRow,
} from '@/lib/discovery-sv-inspection';
import { impactClassLabel } from '@/lib/impact-class-label';
import {
  buildSvPatternRows,
  collectLeadSvSources,
  isHighPrioritySvPattern,
  priorityReasonForSvPattern,
  type SvPatternRow,
} from '@/lib/discovery-sv-pattern';
import type { Candidate } from '@/types/candidate';
import type { CandidateBlock } from '@/types/candidate-block';
import type { SvEvent } from '@/types/sv-event';

const PAGE_SIZE = 10;
const traitLabel = new Map<string, string>(TRAITS.map((trait) => [trait.id, trait.label]));

interface Props { candidates: Candidate[]; blocks: CandidateBlock[]; candidatesLoading: boolean; candidatesError: Error | null; }

export function SvPatternByGroup({
  candidates,
  blocks,
  candidatesLoading,
  candidatesError,
}: Props) {
  const [pageState, setPageState] = useState({ locusKey: '', page: 1 });
  const traitIds = useMemo(
    () => Array.from(new Set(blocks.map((block) => block.traitId))).sort(),
    [blocks],
  );
  const locusKey = useMemo(
    () => blocks.map((block) => `${block.runId}:${block.blockId}`).sort().join('|'),
    [blocks],
  );
  const { byTrait, loading: freqLoading, error: freqError } = useLocusSvGroupFreq(
    SV_RELEASE_ID,
    traitIds,
  );
  const sources = useMemo(() => collectLeadSvSources(candidates, blocks), [candidates, blocks]);
  const chrList = useMemo(
    () =>
      Array.from(new Set(sources.map((source) => source.chr).filter(isString))).sort(),
    [sources],
  );
  const { eventsByChr, samples, loading: eventsLoading } = useAllSvEvents(SV_RELEASE_ID, chrList);
  const svEventsById = useMemo(() => {
    const byId = new Map<string, SvEvent>();
    for (const events of Object.values(eventsByChr)) {
      for (const event of events) byId.set(event.eventId, event);
    }
    return byId;
  }, [eventsByChr]);
  const allRows = useMemo(() => buildSvPatternRows(sources, byTrait), [sources, byTrait]);
  const rows = useMemo(() => allRows.filter(isHighPrioritySvPattern), [allRows]);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const requestedPage = pageState.locusKey === locusKey ? pageState.page : 1;
  const safePage = Math.min(requestedPage, totalPages);
  const visibleStart = (safePage - 1) * PAGE_SIZE;
  const visibleEnd = Math.min(visibleStart + PAGE_SIZE, rows.length);
  const visibleRows = rows.slice(visibleStart, visibleEnd);
  const distinctSvCount = useMemo(
    () => new Set(rows.map((row) => row.eventId)).size,
    [rows],
  );
  const canPaginate = rows.length > PAGE_SIZE;

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <h2 className="text-xs uppercase tracking-wide text-gray-500">
              Prioritized SV patterns
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              SVs selected for review by impact and trait-group carrier pattern.
            </p>
          </div>
          {rows.length > 0 && !freqLoading && (
            <span className="text-[10px] text-gray-400">
              {distinctSvCount} SV{distinctSvCount === 1 ? '' : 's'} to review · showing{' '}
              {visibleStart + 1}-{visibleEnd} of {rows.length} trait links
            </span>
          )}
        </div>

        {candidatesLoading && sources.length === 0 && (
          <p className="text-sm text-gray-400">Loading SV events...</p>
        )}
        {candidatesError && <p className="text-sm text-red-500">{candidatesError.message}</p>}
        {freqLoading && sources.length > 0 && (
          <p className="text-sm text-gray-400">Loading SV group frequencies...</p>
        )}
        {freqError && <p className="text-sm text-red-500">{freqError.message}</p>}
        {!candidatesLoading && !candidatesError && sources.length === 0 && (
          <p className="text-sm text-gray-500">No SV events are attached to this locus.</p>
        )}
        {!freqLoading && !freqError && sources.length > 0 && rows.length === 0 && (
          <div className="rounded border border-gray-100 bg-gray-50 px-3 py-3 text-sm text-gray-600">
            No SVs pass the current review threshold for this trait selection.
          </div>
        )}

        {!freqLoading && visibleRows.length > 0 && (
          <div className="space-y-3">
            <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2 text-[11px] leading-relaxed text-gray-600">
              Each row shows one selected SV pattern and the cultivars carrying it.
            </div>
            {visibleRows.map((row) => (
              <SvPatternPanel
                key={`${row.traitId}:${row.eventId}`}
                row={row}
                svEvent={svEventsById.get(row.eventId) ?? null}
                samples={samples}
                eventsLoading={eventsLoading}
              />
            ))}
            {canPaginate && (
              <NumberedPagination
                page={safePage}
                totalPages={totalPages}
                onPrevious={() =>
                  setPageState({ locusKey, page: Math.max(1, safePage - 1) })
                }
                onNext={() =>
                  setPageState({ locusKey, page: Math.min(totalPages, safePage + 1) })
                }
                onPage={(nextPage) => setPageState({ locusKey, page: nextPage })}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SvPatternPanel({
  row,
  svEvent,
  samples,
  eventsLoading,
}: {
  row: SvPatternRow;
  svEvent: SvEvent | null;
  samples: string[];
  eventsLoading: boolean;
}) {
  const regionTarget = regionTargetForSvPatternRow(row, svEvent, samples);
  const direction = describeSvGroupDirection(row);
  const priorityReason = priorityReasonForSvPattern(row);
  const primaryOgId = row.candidate?.primaryOgId ?? null;
  const ogUrl = primaryOgId
    ? `/og/${encodeURIComponent(primaryOgId)}?trait=${row.traitId}`
    : null;

  return (
    <article className="grid grid-cols-1 gap-3 rounded-md border border-gray-100 bg-white p-3 shadow-sm lg:grid-cols-[minmax(220px,0.8fr)_minmax(360px,1.2fr)]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-gray-600">
            {traitLabel.get(row.traitId) ?? row.traitId}
          </span>
          <span className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] text-gray-500">
            {row.svType ?? 'SV'}
          </span>
          {row.score !== null && (
            <span className="rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-800">
              score {row.score.toFixed(2)}
            </span>
          )}
          {priorityReason && (
            <span className="rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] text-sky-800">
              {priorityReason}
            </span>
          )}
          {row.impactClass && (
            <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-800">
              {impactClassLabel(row.impactClass)}
            </span>
          )}
        </div>
        <Link
          to={`/sv/${encodeURIComponent(row.eventId)}`}
          className="mt-2 block truncate font-mono text-sm font-semibold text-green-700 hover:underline"
          title={row.eventId}
        >
          {row.eventId}
        </Link>
        {ogUrl && primaryOgId && (
          <Link
            to={ogUrl}
            className="mt-1 block truncate font-mono text-xs text-green-700 hover:underline"
            title={primaryOgId}
          >
            OG {primaryOgId}
          </Link>
        )}
        {row.candidate?.functionSummary && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-600">
            {row.candidate.functionSummary}
          </p>
        )}
        <div className="mt-1 space-y-0.5 text-[11px] text-gray-500">
          <div className="truncate" title={formatRegion(row)}>
            {formatRegion(row)}
          </div>
          {row.spread !== null && (
            <div className="font-medium text-gray-700">
              group gap {formatPercentPoint(row.spread)}
            </div>
          )}
          {direction && (
            <div className="font-medium text-gray-700">
              {direction.label} <span className="text-gray-500">({direction.summary})</span>
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
          {regionTarget && (
            <Link
              to={regionTarget.url}
              className="text-green-700 hover:underline"
              title={
                regionTarget.altCarrier
                  ? `Open ALT-carrier cultivar ${regionTarget.cultivar}`
                  : `Open cultivar ${regionTarget.cultivar}`
              }
            >
              Region in {regionTarget.cultivar}
              {regionTarget.groupLabel ? ` (${regionTarget.groupLabel})` : ''}
            </Link>
          )}
        </div>
      </div>

      <div className="min-w-0 space-y-3">
        <div className="space-y-2">
          {row.groups.length > 0 ? (
            row.groups.map((group, index) => (
              <SvPatternGroupFrequencyBar key={group.label} group={group} toneIndex={index} />
            ))
          ) : (
            <p className="text-sm text-gray-500">No group-frequency row found for this SV.</p>
          )}
        </div>
        <CultivarGenotypeStrip
          event={svEvent}
          samples={samples}
          loading={eventsLoading}
          traitId={row.traitId}
        />
      </div>
    </article>
  );
}

function formatRegion(row: SvPatternRow): string {
  if (!row.chr || row.start === null || row.end === null) return 'region unavailable';
  return `${row.chr}:${row.start.toLocaleString()}-${row.end.toLocaleString()}`;
}

function formatPercentPoint(value: number): string {
  return `${Math.round(value * 100)} pp`;
}

function isString(value: string | null): value is string {
  return typeof value === 'string';
}
