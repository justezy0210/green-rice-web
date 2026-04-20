import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GenomeSummary } from '@/types/genome';

interface Props {
  genomeSummary: GenomeSummary | undefined;
}

function fmtBp(bp: number): string {
  if (bp >= 1_000_000) return `${(bp / 1_000_000).toFixed(1)} Mb`;
  if (bp >= 1_000) return `${(bp / 1_000).toFixed(1)} kb`;
  return `${bp} bp`;
}

export function GenomeStatsCard({ genomeSummary }: Props) {
  if (!genomeSummary || genomeSummary.status !== 'complete') {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Assembly &amp; annotation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">
            {genomeSummary?.status === 'processing'
              ? 'Summary still processing.'
              : genomeSummary?.status === 'error'
                ? `Error: ${genomeSummary.errorMessage ?? 'unknown'}`
                : 'No genome summary available for this cultivar yet.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { assembly, geneAnnotation, repeatAnnotation } = genomeSummary;

  const repeatClasses = Object.entries(repeatAnnotation.classDistribution ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Assembly &amp; annotation
          <span className="ml-2 text-xs font-normal text-gray-400">
            summary at upload time · not validation-grade
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          <Stat label="Total size" value={fmtBp(assembly.totalSize)} />
          <Stat label="Chromosomes" value={assembly.chromosomeCount.toString()} />
          <Stat label="Scaffolds" value={assembly.scaffoldCount.toLocaleString()} />
          <Stat label="N50" value={fmtBp(assembly.n50)} />
          <Stat label="GC %" value={`${assembly.gcPercent.toFixed(2)}%`} />
          <Stat
            label="Gene count"
            value={geneAnnotation.geneCount.toLocaleString()}
          />
          <Stat
            label="Mean gene length"
            value={fmtBp(Math.round(geneAnnotation.avgGeneLength))}
          />
          <Stat
            label="Repeat %"
            value={`${repeatAnnotation.repeatPercent.toFixed(1)}%`}
          />
          <Stat
            label="Repeat length"
            value={fmtBp(repeatAnnotation.totalRepeatLength)}
          />
        </div>

        {repeatClasses.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1.5">
              Top repeat classes
            </p>
            <div className="flex flex-wrap gap-1.5">
              {repeatClasses.map(([name, len]) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-600"
                >
                  <span className="font-mono">{name}</span>
                  <span className="text-gray-400">·</span>
                  <span className="tabular-nums">{fmtBp(len)}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="text-sm font-medium text-gray-900 tabular-nums">
        {value}
      </div>
    </div>
  );
}
