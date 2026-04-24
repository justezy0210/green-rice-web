import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  GeneBin, HighlightOverlay, HoverBinOutline, TrackRuler,
} from '@/components/region/RegionTrackBins';
import {
  RegionTrackBlockLane, RegionTrackBlockLaneLabel,
} from '@/components/region/RegionTrackBlockLane';
import { GeneModel } from '@/components/region/RegionTrackGeneModel';
import {
  SvBaseline, SvBin, SvGlyph, SvGlyphDefs,
} from '@/components/region/RegionTrackSv';
import { StatusLine, TrackLegend } from '@/components/region/RegionTrackStatusLine';
import { TrackHeader } from '@/components/region/RegionTrackHeader';
import { buildRegionBins, type RegionGene } from '@/lib/region-helpers';
import type { CandidateBlock } from '@/types/candidate-block';
import {
  BIN_COUNT, DETAIL_GENE_LIMIT, DETAIL_GENE_SPAN_LIMIT, DETAIL_SV_LIMIT,
  DETAIL_SV_SPAN_LIMIT, GENE_COLOR_FOCUSED, GENE_COLOR_OG, GENE_COLOR_ORPHAN,
  GENE_TOP, MARGIN_LEFT, MARGIN_RIGHT, MIN_ZOOM_BP,
  SV_H_DETAIL, SV_H_SUMMARY, SV_TOP, WIDTH, buildTicks,
} from '@/lib/region-track-layout';
import type { SvEvent, SvType } from '@/types/sv-event';

interface Props {
  cultivar: string;
  cultivarName?: string;
  chr: string;
  start: number;
  end: number;
  genes: RegionGene[];
  svEvents: SvEvent[];
  svLoading?: boolean;
  /**
   * Optional gene id the caller wants visually pinned — the gene's
   * span is painted as a full-height amber overlay across both lanes.
   * Typically wired from the Overlapping-genes row click.
   */
  highlightedGeneId?: string | null;
  /**
   * Optional orthogroup id from the URL `?og=` param — genes belonging
   * to this OG are tinted indigo in detail mode and stacked as an
   * indigo segment on top of the per-bin gene histogram in summary
   * mode, so an arrived-from OG pops against the rest of the region.
   */
  focusedOgId?: string | null;
  /** Clear the focused OG (removes `?og=` from the URL). */
  onClearFocusedOg?: () => void;
  /** 'cultivar' = only SVs the URL cultivar carries; 'all' = pangenome view. */
  svScope?: 'cultivar' | 'all';
  /** Toggle the SV scope via the URL `?svScope=` param. */
  onToggleSvScope?: () => void;
  /** Total samples in the active SV release — drives the "all N" pill. */
  svSampleCount?: number | null;
  /** Candidate blocks whose region window overlaps the viewport. */
  overlappingBlocks?: CandidateBlock[];
}

/**
 * Adaptive region track.
 *
 * Detail mode (<=200 genes AND <=2 Mb span for the gene lane,
 * <=150 SVs AND <=1 Mb for the SV lane): per-gene bars + per-SV ticks,
 * matching the original layout. Summary mode (anything wider):
 * 120-bin histograms with sqrt(count) height, OG-assigned stacked on
 * top of orphan in the gene lane, SV type-stacked in the SV lane.
 *
 * Gene and SV detail thresholds are independent, so a short window
 * with many SVs still renders bar+tick for genes, and a wide window
 * with few SVs still gets tick rendering in the SV lane.
 *
 * Interactions: hover a gene (detail) or bin (summary) to update the
 * aria-live status row. Click a bin to rewrite the region URL to that
 * bin span — the URL stays the single source of truth for the viewport.
 */
export function RegionTrackViz({
  cultivar,
  cultivarName,
  chr,
  start,
  end,
  genes,
  svEvents,
  svLoading,
  highlightedGeneId,
  focusedOgId,
  onClearFocusedOg,
  svScope = 'cultivar',
  onToggleSvScope,
  svSampleCount,
  overlappingBlocks,
}: Props) {
  const plotWidth = WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  const span = Math.max(1, end - start);
  const navigate = useNavigate();
  const location = useLocation();

  const xOf = useCallback(
    (pos: number) => MARGIN_LEFT + ((pos - start) / span) * plotWidth,
    [plotWidth, span, start],
  );

  const geneDetail = genes.length <= DETAIL_GENE_LIMIT && span <= DETAIL_GENE_SPAN_LIMIT;
  const svDetail = svEvents.length <= DETAIL_SV_LIMIT && span <= DETAIL_SV_SPAN_LIMIT;
  const anySummary = !geneDetail || !svDetail;

  const bins = useMemo(
    () =>
      anySummary
        ? buildRegionBins(start, end, genes, svEvents, BIN_COUNT, focusedOgId ?? null)
        : [],
    [anySummary, start, end, genes, svEvents, focusedOgId],
  );

  const focusedGeneCount = useMemo(
    () => (focusedOgId ? genes.reduce((n, g) => n + (g.ogId === focusedOgId ? 1 : 0), 0) : 0),
    [focusedOgId, genes],
  );

  const maxGeneBin = useMemo(
    () => bins.reduce((m, b) => Math.max(m, b.geneCount), 0),
    [bins],
  );
  const maxSvBin = useMemo(
    () => bins.reduce((m, b) => Math.max(m, b.svTotal), 0),
    [bins],
  );

  const totalOgAssigned = useMemo(
    () => genes.reduce((n, g) => n + (g.ogId ? 1 : 0), 0),
    [genes],
  );
  const totalSvByType = useMemo(() => {
    const c: Record<SvType, number> = { INS: 0, DEL: 0, COMPLEX: 0 };
    for (const ev of svEvents) c[ev.svType] = (c[ev.svType] ?? 0) + 1;
    return c;
  }, [svEvents]);

  const ticks = useMemo(() => buildTicks(start, end), [start, end]);

  const highlightedGene = useMemo(
    () => (highlightedGeneId ? genes.find((g) => g.id === highlightedGeneId) ?? null : null),
    [highlightedGeneId, genes],
  );

  const [hoveredBin, setHoveredBin] = useState<number | null>(null);
  const [hoveredGene, setHoveredGene] = useState<RegionGene | null>(null);

  // Zoom is a display-only multiplier on SVG width; viewBox is
  // preserved so coords stay valid and the wrapper scrolls. Reset on
  // window change via compare-during-render (no setState-in-effect).
  const windowKey = `${chr}:${start}-${end}`;
  const [zoom, setZoom] = useState(1);
  const [zoomKey, setZoomKey] = useState(windowKey);
  if (zoomKey !== windowKey) {
    setZoomKey(windowKey);
    setZoom(1);
  }

  const binWidth = plotWidth / BIN_COUNT;
  const totalHeight = SV_TOP + Math.max(SV_H_SUMMARY, SV_H_DETAIL) + 12;

  const zoomToBin = (bi: number) => {
    const b = bins[bi];
    if (!b) return;
    const s = Math.max(start, Math.floor(b.binStart));
    const e = Math.min(end, Math.ceil(b.binEnd));
    if (e - s < MIN_ZOOM_BP) return;
    // Preserve `?og=` / `?svScope=` across zoom navigation so the
    // narrative stays intact as the user drills down.
    navigate(`/region/${cultivar}/${chr}/${s}-${e}${location.search}`);
  };

  return (
    <Card>
      <CardContent className="py-3">
        <TrackHeader
          anySummary={anySummary}
          chr={chr}
          start={start}
          end={end}
          geneCount={genes.length}
          svCount={svEvents.length}
          svLoading={svLoading}
          focusedOgId={focusedOgId}
          focusedGeneCount={focusedGeneCount}
          onClearFocusedOg={onClearFocusedOg}
          onBack={() => navigate(-1)}
          zoom={zoom}
          onZoomChange={setZoom}
          cultivarName={cultivarName ?? cultivar}
          svScope={svScope}
          onToggleSvScope={onToggleSvScope}
          svSampleCount={svSampleCount}
        />
        <div className="overflow-x-auto">
        <svg
          style={{ width: `${100 * zoom}%` }}
          viewBox={`0 0 ${WIDTH} ${totalHeight}`}
          role="img"
          aria-label={`Region track ${chr}:${start}-${end}, ${genes.length} genes, ${svEvents.length} SV`}
          preserveAspectRatio="none"
        >
          <SvGlyphDefs />
          <TrackRuler ticks={ticks} xOf={xOf} />

          <RegionTrackBlockLaneLabel />
          {overlappingBlocks && overlappingBlocks.length > 0 && (
            <RegionTrackBlockLane
              blocks={overlappingBlocks}
              xOf={xOf}
              windowStart={start}
              windowEnd={end}
            />
          )}

          <text x={MARGIN_LEFT} y={GENE_TOP - 2} fontSize={8} fill="#6b7280">
            genes {geneDetail ? '' : '(binned)'}
          </text>

          {geneDetail
            ? genes.map((g) => {
                const isFocused = !!focusedOgId && g.ogId === focusedOgId;
                const fill = isFocused ? GENE_COLOR_FOCUSED : g.ogId ? GENE_COLOR_OG : GENE_COLOR_ORPHAN;
                return (
                  <GeneModel
                    key={g.id}
                    gene={g}
                    xOf={xOf}
                    fill={fill}
                    opacity={isFocused ? 0.95 : 0.8}
                    minWidth={isFocused ? 3 : 0.8}
                    onHover={setHoveredGene}
                  />
                );
              })
            : bins.map((b) => (
                <GeneBin
                  key={b.i}
                  bin={b}
                  binWidth={binWidth}
                  maxGeneBin={maxGeneBin}
                  hovered={hoveredBin === b.i}
                  onHover={setHoveredBin}
                  onZoom={(target) => zoomToBin(target.i)}
                />
              ))}

          <text x={MARGIN_LEFT} y={SV_TOP - 2} fontSize={8} fill="#6b7280">
            SV events {svDetail ? '' : '(binned · stacked by type)'}
          </text>

          {svDetail && <SvBaseline />}
          {svDetail
            ? svEvents.map((ev) => (
                <SvGlyph key={ev.eventId} ev={ev} xOf={xOf} />
              ))
            : bins.map((b) => (
                <SvBin
                  key={`sv-${b.i}`}
                  bin={b}
                  binWidth={binWidth}
                  maxSvBin={maxSvBin}
                  hovered={hoveredBin === b.i}
                />
              ))}

          {highlightedGene && (
            <HighlightOverlay
              gene={highlightedGene}
              geneDetail={geneDetail}
              xOf={xOf}
              start={start}
              span={span}
              binWidth={binWidth}
            />
          )}

          {anySummary && hoveredBin !== null && (
            <HoverBinOutline binIndex={hoveredBin} binWidth={binWidth} />
          )}
        </svg>
        </div>

        <TrackLegend showFocusedOg={!!focusedOgId} detailMode={geneDetail} />
        <div className="mt-1 text-[11px] text-gray-700 leading-tight tabular-nums min-h-[18px]" aria-live="polite">
          <StatusLine
            chr={chr} start={start} end={end} hoveredGene={hoveredGene}
            hoveredBin={hoveredBin !== null ? bins[hoveredBin] ?? null : null}
            totalGenes={genes.length} totalOgAssigned={totalOgAssigned}
            totalSvByType={totalSvByType} svLoading={svLoading} anySummary={anySummary}
          />
        </div>
      </CardContent>
    </Card>
  );
}
