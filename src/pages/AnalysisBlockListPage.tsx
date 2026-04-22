import { useMemo, useState } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { AnalysisShell } from '@/components/analysis/AnalysisShell';
import { BlockCaveatStrip } from '@/components/analysis/BlockCaveatStrip';
import { BlockTypeBadge } from '@/components/analysis/BlockTypeBadge';
import { useAnalysisRun } from '@/hooks/useAnalysisRun';
import { useBlocks } from '@/hooks/useBlock';
import { isValidRunId } from '@/lib/analysis-run-id';
import type { CandidateBlock } from '@/types/candidate-block';

type Filter = 'all' | 'curated' | 'auto';

export function AnalysisBlockListPage() {
  const { runId } = useParams<{ runId: string }>();
  const validRunId = runId && isValidRunId(runId) ? runId : null;
  const { run, error } = useAnalysisRun(validRunId);
  const { blocks, loading } = useBlocks(validRunId);
  const [filter, setFilter] = useState<Filter>('all');
  const [chrFilter, setChrFilter] = useState<string | 'all'>('all');
  const [minCount, setMinCount] = useState<number>(0);

  const chromosomes = useMemo(() => {
    const set = new Set<string>();
    for (const b of blocks) set.add(b.region.chr);
    return Array.from(set).sort();
  }, [blocks]);

  const visible = useMemo(() => {
    return blocks
      .filter((b) => (filter === 'all' ? true : filter === 'curated' ? b.curated : !b.curated))
      .filter((b) => (chrFilter === 'all' ? true : b.region.chr === chrFilter))
      .filter((b) => b.candidateOgCount >= minCount)
      .sort(sortBlocks);
  }, [blocks, filter, chrFilter, minCount]);

  if (!validRunId) return <Navigate to="/analysis" replace />;
  if (error || !run) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        {error?.message ?? 'Run not found.'}
      </div>
    );
  }

  return (
    <AnalysisShell runId={validRunId} stepAvailability={run.stepAvailability}>
      <div className="space-y-4">
        <header>
          <h1 className="text-xl font-semibold text-gray-900">Review blocks</h1>
          <p className="text-sm text-gray-600 mt-1">
            Review-unit aggregation of candidate rows for trait{' '}
            <strong>{run.traitId}</strong>. Curated regions float to the top;
            auto-aggregated 1 Mb windows fill in the rest.
          </p>
        </header>

        <BlockCaveatStrip />

        <Card>
          <CardContent className="py-3 flex flex-wrap items-center gap-4 text-xs">
            <FilterChips value={filter} onChange={setFilter} />
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-wide text-gray-500">Chr</span>
              <select
                value={chrFilter}
                onChange={(e) => setChrFilter(e.target.value as typeof chrFilter)}
                className="text-[11px] border border-gray-200 rounded px-1.5 py-0.5 bg-white"
              >
                <option value="all">all</option>
                {chromosomes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="uppercase tracking-wide text-gray-500">
                min OG count
              </span>
              <input
                type="number"
                min={0}
                value={minCount}
                onChange={(e) => setMinCount(Number(e.target.value) || 0)}
                className="w-16 text-[11px] border border-gray-200 rounded px-1.5 py-0.5 bg-white"
              />
            </div>
            <span className="ml-auto text-gray-500">
              {visible.length} / {blocks.length} blocks
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-3">
            {loading ? (
              <p className="text-sm text-gray-400">Loading blocks…</p>
            ) : visible.length === 0 ? (
              <p className="text-sm text-gray-500">No blocks match the filters.</p>
            ) : (
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col className="w-32" />
                  <col className="w-20" />
                  <col className="w-28" />
                  <col />
                  <col className="w-20" />
                  <col className="w-20" />
                </colgroup>
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
                    <th className="text-left pl-3 pr-2 py-1.5">Region</th>
                    <th className="text-left px-3 py-1.5">Kind</th>
                    <th className="text-left px-3 py-1.5">Type</th>
                    <th className="text-left px-3 py-1.5">Annotations</th>
                    <th className="text-right px-3 py-1.5">OGs</th>
                    <th className="text-right pl-3 pr-4 py-1.5">Overlaps</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((b) => (
                    <Row key={b.blockId} runId={validRunId} block={b} />
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </AnalysisShell>
  );
}

function sortBlocks(a: CandidateBlock, b: CandidateBlock): number {
  if (a.curated !== b.curated) return a.curated ? -1 : 1;
  if (b.candidateOgCount !== a.candidateOgCount)
    return b.candidateOgCount - a.candidateOgCount;
  if (a.region.chr !== b.region.chr) return a.region.chr.localeCompare(b.region.chr);
  return a.region.start - b.region.start;
}

function FilterChips({
  value,
  onChange,
}: {
  value: Filter;
  onChange: (v: Filter) => void;
}) {
  const options: Array<{ v: Filter; label: string }> = [
    { v: 'all', label: 'all' },
    { v: 'curated', label: 'curated only' },
    { v: 'auto', label: 'auto only' },
  ];
  return (
    <div className="flex items-center gap-1">
      <span className="uppercase tracking-wide text-gray-500 mr-1">filter</span>
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`px-2 py-1 rounded border font-mono text-[10px] ${
            value === o.v
              ? 'border-green-300 bg-green-50 text-green-700'
              : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Row({ runId, block }: { runId: string; block: CandidateBlock }) {
  const region = `${block.region.chr}:${(block.region.start / 1_000_000).toFixed(1)}–${(block.region.end / 1_000_000).toFixed(1)} Mb`;
  const annotations = block.representativeAnnotations.slice(0, 2);
  return (
    <tr className="border-b border-gray-100 hover:bg-green-50">
      <td className="pl-3 pr-2 py-1.5 text-gray-800 font-mono text-[11px]">
        <Link
          to={`/analysis/${runId}/block/${encodeURIComponent(block.blockId)}`}
          className="hover:text-green-700"
        >
          {region}
        </Link>
      </td>
      <td className="px-3 py-1.5">
        {block.curated ? (
          <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 py-[1px]">
            curated
          </span>
        ) : (
          <span className="text-[10px] font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded px-1 py-[1px]">
            auto 1 Mb
          </span>
        )}
      </td>
      <td className="px-3 py-1.5">
        <BlockTypeBadge blockType={block.blockType} />
      </td>
      <td className="px-3 py-1.5 text-[11px] text-gray-600 truncate">
        {annotations.length === 0 ? (
          <span className="text-gray-400">none</span>
        ) : (
          annotations.join(' · ') +
          (block.representativeAnnotations.length > 2 ? ` · +${block.representativeAnnotations.length - 2}` : '')
        )}
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums text-gray-800">
        {block.candidateOgCount}
      </td>
      <td className="pl-3 pr-4 py-1.5 text-right tabular-nums text-gray-800">
        {block.intersectionCount}
      </td>
    </tr>
  );
}
