import { Link } from 'react-router-dom';
import {
  GENE_COLOR_FOCUSED,
  GENE_COLOR_OG,
  GENE_COLOR_ORPHAN,
  SIZE_TIER_COLOR_HIGH,
  SIZE_TIER_COLOR_MID,
  SIZE_TIER_HIGH_BP,
  SIZE_TIER_MID_BP,
  SV_COLOR,
} from '@/lib/region-track-layout';
import { formatBp, type RegionBin, type RegionGene } from '@/lib/region-helpers';
import type { SvType } from '@/types/sv-event';

/**
 * Status row rendered below the track SVG. It replaces per-element
 * hover tooltips at summary resolution where individual items become
 * sub-pixel: the row is aria-live so screen readers announce
 * bin/gene context on pointer move without firing one event per pixel.
 *
 * Priority: hovered gene (detail mode only) > hovered bin (summary) >
 * overall window stats. The overall state is the default resting
 * text, so the row never blanks out.
 */

export function StatusLine({
  chr,
  start,
  end,
  hoveredGene,
  hoveredBin,
  totalGenes,
  totalOgAssigned,
  totalSvByType,
  svLoading,
  anySummary,
}: {
  chr: string;
  start: number;
  end: number;
  hoveredGene: RegionGene | null;
  hoveredBin: RegionBin | null;
  totalGenes: number;
  totalOgAssigned: number;
  totalSvByType: Record<SvType, number>;
  svLoading?: boolean;
  anySummary: boolean;
}) {
  if (hoveredGene) {
    return (
      <>
        <Link
          to={`/genes/${encodeURIComponent(hoveredGene.id)}`}
          className="font-mono text-gray-900 hover:text-green-700 hover:underline"
        >
          {hoveredGene.id}
        </Link>
        {hoveredGene.ogId && (
          <Link
            to={`/og/${encodeURIComponent(hoveredGene.ogId)}`}
            className="ml-2 text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-[1px] rounded hover:bg-indigo-100"
          >
            {hoveredGene.ogId}
          </Link>
        )}
        <span className="ml-2 text-gray-500 font-mono">
          {hoveredGene.chr}:{hoveredGene.start.toLocaleString()}-
          {hoveredGene.end.toLocaleString()} ({hoveredGene.strand})
        </span>
        {hoveredGene.annotation?.product && (
          <span className="ml-2 text-gray-600">
            · {hoveredGene.annotation.product}
          </span>
        )}
      </>
    );
  }

  if (hoveredBin) {
    const ogPct =
      hoveredBin.geneCount === 0
        ? 0
        : Math.round((hoveredBin.ogAssignedCount / hoveredBin.geneCount) * 100);
    return (
      <>
        <span className="font-mono text-gray-900">
          {chr}:{(hoveredBin.binStart / 1_000_000).toFixed(3)}–
          {(hoveredBin.binEnd / 1_000_000).toFixed(3)} Mb
        </span>
        <span className="ml-2">
          · {hoveredBin.geneCount} genes
          {hoveredBin.geneCount > 0 && (
            <span className="text-gray-500">
              {' '}
              ({hoveredBin.ogAssignedCount} OG · {ogPct}%)
            </span>
          )}
          {hoveredBin.focusedOgCount > 0 && (
            <span className="ml-1 text-indigo-700">
              · {hoveredBin.focusedOgCount} focused
            </span>
          )}
        </span>
        <span className="ml-2">
          · {hoveredBin.svTotal} SV
          {hoveredBin.svTotal > 0 && (
            <span className="text-gray-500">
              {' '}
              ({hoveredBin.svCount.DEL} DEL / {hoveredBin.svCount.INS} INS /{' '}
              {hoveredBin.svCount.COMPLEX} CPX
              {hoveredBin.maxEventScaleBp > 0 && (
                <> · max ~{formatBp(hoveredBin.maxEventScaleBp)}</>
              )}
              )
            </span>
          )}
        </span>
        <span className="ml-2 text-blue-600">· click to zoom</span>
      </>
    );
  }

  const ogPct =
    totalGenes === 0 ? 0 : Math.round((totalOgAssigned / totalGenes) * 100);
  const totalSv =
    totalSvByType.DEL + totalSvByType.INS + totalSvByType.COMPLEX;
  return (
    <>
      <span className="font-mono text-gray-900">
        {chr}:{(start / 1_000_000).toFixed(2)}–{(end / 1_000_000).toFixed(2)} Mb
      </span>
      <span className="ml-2">
        · {totalGenes} genes{' '}
        <span className="text-gray-500">
          ({totalOgAssigned} OG · {ogPct}%)
        </span>
      </span>
      <span className="ml-2">
        · {svLoading ? '…' : totalSv} SV
        {!svLoading && totalSv > 0 && (
          <span className="text-gray-500">
            {' '}
            ({totalSvByType.DEL} DEL / {totalSvByType.INS} INS /{' '}
            {totalSvByType.COMPLEX} CPX)
          </span>
        )}
      </span>
      {anySummary && (
        <span className="ml-2 text-gray-400">
          · hover a bin for local stats
        </span>
      )}
    </>
  );
}

export function LegendSwatch({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block"
        style={{ width: 10, height: 8, background: color, borderRadius: 2 }}
      />
      <span>{label}</span>
    </span>
  );
}

export function TrackLegend({
  showFocusedOg,
  detailMode,
}: {
  showFocusedOg?: boolean;
  detailMode?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px] text-gray-500">
      <LegendSwatch color="#d97706" label="curated block (click to open)" />
      {showFocusedOg && (
        <LegendSwatch color={GENE_COLOR_FOCUSED} label="gene (focused OG)" />
      )}
      <LegendSwatch color={GENE_COLOR_OG} label="gene (OG-assigned)" />
      <LegendSwatch color={GENE_COLOR_ORPHAN} label="gene (no OG)" />
      {detailMode && (
        <span className="text-gray-400">
          · thick box = CDS · half box = UTR · thin line = intron
        </span>
      )}
      <LegendSwatch
        color={SV_COLOR.INS}
        label={detailMode ? 'INS = new sequence inserted' : 'INS'}
      />
      <LegendSwatch
        color={SV_COLOR.DEL}
        label={detailMode ? 'DEL = reference sequence deleted' : 'DEL'}
      />
      <LegendSwatch
        color={SV_COLOR.COMPLEX}
        label="COMPLEX = ref replaced with different sequence"
      />
      <LegendSwatch
        color={SIZE_TIER_COLOR_MID}
        label={`≥${formatBp(SIZE_TIER_MID_BP)}`}
      />
      <LegendSwatch
        color={SIZE_TIER_COLOR_HIGH}
        label={`≥${formatBp(SIZE_TIER_HIGH_BP)}`}
      />
    </div>
  );
}
