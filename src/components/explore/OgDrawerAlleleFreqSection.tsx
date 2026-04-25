import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OgVariantSummary } from '@/types/orthogroup';
import {
  classifyVariant,
  eventClassBadgeClass,
  shouldShowLength,
  SV_THRESHOLD_BP,
} from '@/lib/variant-event-class';
import { PANEL_LABEL } from '@/config/panel';

interface Props {
  summary: OgVariantSummary;
  groupLabels: string[];
  groupColorMap: Record<string, { bg: string; border: string }>;
  title?: string;
}

export function OgDrawerAlleleFreqSection({
  summary,
  groupLabels,
  groupColorMap,
  title = 'Anchor-locus variants',
}: Props) {
  return (
    <section className="px-4 py-3 border-b border-gray-100 text-xs">
      <h3 className="font-medium text-gray-500 uppercase tracking-wide mb-2">
        {title}
      </h3>

      <div className="flex gap-4 text-gray-600 mb-2">
        <span>{summary.totalVariants.toLocaleString()} variants in region</span>
      </div>

      {summary.geneRegions.length > 0 && (
        <div className="text-[10px] text-gray-400 mb-2 font-mono">
          {summary.geneRegions.map((r) => (
            <span key={r.geneId} className="mr-3">
              {r.geneId} ({r.chr}:{r.start.toLocaleString()}-{r.end.toLocaleString()})
            </span>
          ))}
        </div>
      )}

      <p className="text-[10px] text-amber-600 mb-2">
        AF is based on {PANEL_LABEL.coverageOf} cultivars present in the pangenome VCF.
      </p>
      <p className="text-[10px] text-gray-400 mb-2">
        Event class is a length-based heuristic (≥ {SV_THRESHOLD_BP}bp → SV-like). <code>vg deconstruct</code>{' '}
        can split a single structural event across multiple SNP-like rows.
      </p>

      {summary.variants.length === 0 ? (
        <p className="text-gray-400 italic">No variants found in this gene region.</p>
      ) : (
        <div>
          <Table density="dense" className="text-[11px]">
            <TableHeader>
              <TableRow className="text-gray-500">
                <TableHead className="pr-2">Position</TableHead>
                <TableHead className="px-1">Event</TableHead>
                <TableHead className="px-1">Ref</TableHead>
                <TableHead className="px-1">Alt</TableHead>
                {groupLabels.map((lbl) => (
                  <TableHead key={lbl} className="px-1 text-right">
                    {lbl} AF
                  </TableHead>
                ))}
                <TableHead className="pl-1 text-right">ΔAF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.variants.slice(0, 30).map((v, i) => (
                <VariantRow
                  key={`${v.chr}-${v.pos}-${i}`}
                  variant={v}
                  groupLabels={groupLabels}
                  groupColorMap={groupColorMap}
                />
              ))}
            </TableBody>
          </Table>
          {summary.variants.length > 30 && (
            <p className="text-[10px] text-gray-400 mt-1">
              Showing the first 30 rows in genomic order. Use for local context; not a ranked list.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function VariantRow({
  variant,
  groupLabels,
  groupColorMap,
}: {
  variant: { chr: string; pos: number; ref: string; alt: string; afByGroup: Record<string, number>; deltaAf: number };
  groupLabels: string[];
  groupColorMap: Record<string, { bg: string; border: string }>;
}) {
  const evtClass = classifyVariant(variant.ref, variant.alt);
  const showLen = shouldShowLength(variant.ref, variant.alt);
  return (
    <TableRow>
      <TableCell className="pr-2 font-mono text-gray-700 whitespace-nowrap">
        {variant.chr}:{variant.pos.toLocaleString()}
      </TableCell>
      <TableCell className="px-1 whitespace-nowrap">
        <Badge
          variant="outline"
          className={cn('text-[10px] px-1.5 py-0.5 rounded border h-auto', eventClassBadgeClass(evtClass))}
        >
          {evtClass}
        </Badge>
      </TableCell>
      <TableCell className="px-1 font-mono text-gray-500 max-w-[80px]">
        <span className="truncate inline-block max-w-full align-bottom">
          {variant.ref.length > 8 ? `${variant.ref.slice(0, 8)}…` : variant.ref}
        </span>
        {showLen && (
          <span className="text-[9px] text-gray-400 ml-1">
            ({variant.ref.length}bp)
          </span>
        )}
      </TableCell>
      <TableCell className="px-1 font-mono text-gray-500 max-w-[80px]">
        <span className="truncate inline-block max-w-full align-bottom">
          {variant.alt.length > 8 ? `${variant.alt.slice(0, 8)}…` : variant.alt}
        </span>
        {showLen && (
          <span className="text-[9px] text-gray-400 ml-1">
            ({variant.alt.length}bp)
          </span>
        )}
      </TableCell>
      {groupLabels.map((lbl) => {
        const af = variant.afByGroup[lbl] ?? 0;
        const color = groupColorMap[lbl];
        return (
          <TableCell key={lbl} className="px-1 text-right tabular-nums">
            <AfBar af={af} color={color?.border ?? '#9ca3af'} />
          </TableCell>
        );
      })}
      <TableCell className="pl-1 text-right tabular-nums text-gray-500">
        {variant.deltaAf.toFixed(2)}
      </TableCell>
    </TableRow>
  );
}

function AfBar({ af, color }: { af: number; color: string }) {
  const pct = Math.round(af * 100);
  // Number-first; bar is a muted visual cue at ~40% opacity so it does not
  // invite length-based causal reading.
  return (
    <div className="flex items-center gap-1.5 justify-end">
      <span className="text-gray-700 w-8 text-right tabular-nums">{pct}%</span>
      <div className="w-10 h-1 bg-gray-100 rounded-sm overflow-hidden">
        <div
          className="h-full rounded-sm"
          style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.4 }}
        />
      </div>
    </div>
  );
}
