import { useMemo, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DiscoveryShell } from '@/components/discovery/DiscoveryShell';
import {
  DiscoveryStepSvTable,
  type RankedSvRow,
} from '@/components/discovery/DiscoveryStepSvTable';
import { useAnalysisRun } from '@/hooks/useAnalysisRun';
import {
  useSvManifest,
  useAllSvEvents,
  useSvTraitGroupFreq,
} from '@/hooks/useSvMatrix';
import { isValidRunId, decodeRunId } from '@/lib/analysis-run-id';
import { SV_RELEASE_ID } from '@/lib/releases';
import type { SvType } from '@/types/sv-event';

const TYPE_OPTIONS: SvType[] = ['INS', 'DEL', 'COMPLEX'];
const PAGE_SIZE = 50;

export function DiscoveryStepVariantsPage() {
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

  if (!validRunId) return <Navigate to="/discovery" replace />;
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
    <DiscoveryShell runId={validRunId} stepAvailability={run.stepAvailability}>
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
                  <Button
                    key={t}
                    type="button"
                    variant={active ? 'secondary' : 'outline'}
                    size="xs"
                    className={`font-mono ${active ? 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100' : ''}`}
                    onClick={() => {
                      const next = new Set(typeFilter);
                      if (active) next.delete(t);
                      else next.add(t);
                      if (next.size === 0) next.add(t);
                      setTypeFilter(next);
                      setPage(0);
                    }}
                  >
                    {t}
                  </Button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-wide text-gray-500">
                Min |ΔAF|
              </span>
              {/* raw: <input type="range"> — shadcn doesn't ship a Slider primitive in this kit yet (Phase 5+ follow-up). */}
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
                <DiscoveryStepSvTable rows={pageRows} cultivar={run.traitId} />
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-3 text-xs">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      ← Prev
                    </Button>
                    <span className="text-gray-500">
                      {page + 1} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                    >
                      Next →
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DiscoveryShell>
  );
}
