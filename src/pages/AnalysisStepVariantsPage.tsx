import { useMemo, useState } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { AnalysisShell } from '@/components/analysis/AnalysisShell';
import { useAnalysisRun } from '@/hooks/useAnalysisRun';
import {
  useSvManifest,
  useAllSvEvents,
  useSvTraitGroupFreq,
} from '@/hooks/useSvMatrix';
import { isValidRunId, decodeRunId } from '@/lib/analysis-run-id';
import { SV_RELEASE_ID } from '@/lib/releases';
import type { SvEvent, SvType } from '@/types/sv-event';

const TYPE_OPTIONS: SvType[] = ['INS', 'DEL', 'COMPLEX'];
const PAGE_SIZE = 50;

interface RankedSvRow {
  event: SvEvent;
  freqA: number | null;
  freqB: number | null;
  groupALabel: string | null;
  groupBLabel: string | null;
  absDeltaAf: number;
}

export function AnalysisStepVariantsPage() {
  const { runId } = useParams<{ runId: string }>();
  const validRunId = runId && isValidRunId(runId) ? runId : null;
  const parts = validRunId ? decodeRunId(validRunId) : null;
  const traitId = parts?.traitId ?? null;
  const { run, error } = useAnalysisRun(validRunId);

  const svReleaseId = run?.svReleaseId ?? SV_RELEASE_ID;
  const { manifest, loading: manifestLoading } = useSvManifest(svReleaseId);
  const chrList = manifest ? Object.keys(manifest.chrCounts).sort() : null;
  const { eventsByChr, loading: eventsLoading, loadedChrs, totalChrs } = useAllSvEvents(
    svReleaseId,
    chrList,
  );
  const { byEvent: freqByEvent, loading: freqLoading } = useSvTraitGroupFreq(svReleaseId, traitId);

  const [typeFilter, setTypeFilter] = useState<Set<SvType>>(new Set(TYPE_OPTIONS));
  const [minAbsDelta, setMinAbsDelta] = useState<number>(0);
  const [page, setPage] = useState(0);

  const ranked: RankedSvRow[] = useMemo(() => {
    const rows: RankedSvRow[] = [];
    const chrs = Object.keys(eventsByChr).sort();
    for (const chr of chrs) {
      for (const ev of eventsByChr[chr] ?? []) {
        if (!typeFilter.has(ev.svType)) continue;
        const freq = freqByEvent[ev.eventId];
        let freqA: number | null = null;
        let freqB: number | null = null;
        let aLabel: string | null = null;
        let bLabel: string | null = null;
        if (freq) {
          const entries = Object.entries(freq.byGroup);
          if (entries.length >= 1) {
            [aLabel, freqA] = [entries[0][0], entries[0][1].freq];
          }
          if (entries.length >= 2) {
            [bLabel, freqB] = [entries[1][0], entries[1][1].freq];
          }
        }
        const absDelta =
          freqA !== null && freqB !== null ? Math.abs(freqA - freqB) : 0;
        if (absDelta < minAbsDelta) continue;
        rows.push({
          event: ev,
          freqA,
          freqB,
          groupALabel: aLabel,
          groupBLabel: bLabel,
          absDeltaAf: absDelta,
        });
      }
    }
    rows.sort((a, b) => b.absDeltaAf - a.absDeltaAf || b.event.svLenAbs - a.event.svLenAbs);
    return rows;
  }, [eventsByChr, freqByEvent, typeFilter, minAbsDelta]);

  if (!validRunId) return <Navigate to="/analysis" replace />;
  if (error || !run) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        {error?.message ?? 'Run not found.'}
      </div>
    );
  }

  const loading = manifestLoading || eventsLoading || freqLoading;
  const totalPages = Math.max(1, Math.ceil(ranked.length / PAGE_SIZE));
  const pageRows = ranked.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <AnalysisShell runId={validRunId} stepAvailability={run.stepAvailability}>
      <div className="space-y-4">
        <header>
          <h1 className="text-xl font-semibold text-gray-900">Step 3 — Variants</h1>
          <p className="text-sm text-gray-600 mt-1">
            Event-normalized SV browser ({manifest?.eventCount ?? '—'} events from{' '}
            <code className="text-[11px] bg-gray-100 px-1 py-0.5 rounded">{svReleaseId}</code>),
            per-group allele frequency for <strong>{run.traitId}</strong>.
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            LV=0 top-level snarls only · SV length ≥ 50 bp · vg deconstruct
            folds inversions into COMPLEX. Not validation-grade; use as
            candidate-discovery signal only.
          </p>
        </header>

        <Card>
          <CardContent className="py-3 flex flex-wrap gap-4 items-center text-xs">
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-wide text-gray-500">Type</span>
              {TYPE_OPTIONS.map((t) => {
                const active = typeFilter.has(t);
                return (
                  <button
                    key={t}
                    onClick={() => {
                      const next = new Set(typeFilter);
                      if (active) next.delete(t);
                      else next.add(t);
                      if (next.size === 0) next.add(t);
                      setTypeFilter(next);
                      setPage(0);
                    }}
                    className={`px-2 py-1 rounded border font-mono ${
                      active
                        ? 'border-green-300 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-wide text-gray-500">
                Min |ΔAF|
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={minAbsDelta}
                onChange={(e) => {
                  setMinAbsDelta(parseFloat(e.target.value));
                  setPage(0);
                }}
              />
              <span className="tabular-nums text-gray-700 w-10 text-right">
                {minAbsDelta.toFixed(2)}
              </span>
            </div>
            {loading && (
              <span className="text-gray-400 ml-auto">
                loading {loadedChrs}/{totalChrs} chromosomes…
              </span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-3">
            {loading && ranked.length === 0 ? (
              <p className="text-sm text-gray-400">Loading SV matrix…</p>
            ) : ranked.length === 0 ? (
              <p className="text-sm text-gray-500">
                No events match the filters.
              </p>
            ) : (
              <>
                <div className="text-xs text-gray-500 mb-2">
                  {ranked.length} event{ranked.length === 1 ? '' : 's'} · page{' '}
                  {page + 1} / {totalPages}
                </div>
                <SvTable rows={pageRows} cultivar={run.traitId} />
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-3 text-xs">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-2 py-1 rounded border border-gray-200 text-gray-700 disabled:text-gray-300 disabled:border-gray-100 hover:bg-gray-50"
                    >
                      ← Prev
                    </button>
                    <span className="text-gray-500">
                      {page + 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-2 py-1 rounded border border-gray-200 text-gray-700 disabled:text-gray-300 disabled:border-gray-100 hover:bg-gray-50"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AnalysisShell>
  );
}

function SvTable({ rows }: { rows: RankedSvRow[]; cultivar: string }) {
  return (
    <table className="w-full text-sm table-fixed">
      <colgroup>
        <col className="w-20" />
        <col className="w-16" />
        <col className="w-20" />
        <col className="w-20" />
        <col />
        <col />
        <col className="w-20" />
      </colgroup>
      <thead>
        <tr className="text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
          <th className="text-left pl-3 pr-2 py-1.5">Chr</th>
          <th className="text-left px-3 py-1.5">Type</th>
          <th className="text-right px-3 py-1.5">Pos</th>
          <th className="text-right px-3 py-1.5">|svLen|</th>
          <th className="text-left px-3 py-1.5">Group A freq</th>
          <th className="text-left px-3 py-1.5">Group B freq</th>
          <th className="text-right pl-3 pr-4 py-1.5">|ΔAF|</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ event, freqA, freqB, groupALabel, groupBLabel, absDeltaAf }) => {
          const regionStart = Math.max(0, event.pos - 2000);
          const regionEnd = event.pos + Math.max(event.refLen, event.altLen) + 2000;
          const regionLink = `/region/baegilmi/${event.chr}/${regionStart}-${regionEnd}`;
          return (
            <tr
              key={event.eventId}
              className="border-b border-gray-100 hover:bg-green-50 transition-colors"
            >
              <td className="pl-3 pr-2 py-1.5 text-gray-700 font-mono text-[11px]">
                <Link to={regionLink} className="hover:underline hover:text-green-700">
                  {event.chr}
                </Link>
              </td>
              <td className="px-3 py-1.5">
                <span className="text-[10px] font-mono font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                  {event.svType}
                </span>
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-[11px] text-gray-600">
                {event.pos.toLocaleString()}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-[11px] text-gray-600">
                {event.svLenAbs.toLocaleString()}
              </td>
              <td className="px-3 py-1.5 text-[11px] text-gray-600">
                {groupALabel && freqA !== null ? (
                  <>
                    <span className="text-gray-400">{groupALabel}: </span>
                    <span className="tabular-nums">{freqA.toFixed(2)}</span>
                  </>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="px-3 py-1.5 text-[11px] text-gray-600">
                {groupBLabel && freqB !== null ? (
                  <>
                    <span className="text-gray-400">{groupBLabel}: </span>
                    <span className="tabular-nums">{freqB.toFixed(2)}</span>
                  </>
                ) : (
                  <span className="text-gray-300">—</span>
                )}
              </td>
              <td className="pl-3 pr-4 py-1.5 text-right tabular-nums font-medium text-gray-900">
                {freqA !== null && freqB !== null ? absDeltaAf.toFixed(2) : '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
