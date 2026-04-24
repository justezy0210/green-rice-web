import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { buildRegionBins, type RegionGene } from '@/lib/region-helpers';
import type { CandidateBlock } from '@/types/candidate-block';

const W = 960;
const H = 42;
const MARGIN_L = 8;
const MARGIN_R = 12;
const CURATED_BAND_Y = 12;
const CURATED_BAND_H = 3;
const CHR_Y = 18;
const CHR_H = 16;
const DENSITY_BIN_COUNT = 240;

/**
 * Full-chromosome thumbnail with a click-to-navigate brush.
 *
 * The mini-map shows the whole chromosome (0 → `chrLength`) as a
 * thin grey bar with:
 * - a grey gene-density strip derived from the loaded partition's
 *   genes on this chr (240 bins), so dense regions pop visually,
 * - amber ticks at each overlapping block's midpoint,
 * - a blue translucent window highlighting the current URL span.
 *
 * Clicking anywhere on the bar recenters the current window on that
 * coordinate and navigates. The window width is preserved, clamped
 * to chromosome bounds. Query params (`?svScope=`, `?og=`) are
 * forwarded so scope/focus state survives navigation.
 */
export function RegionOverviewMap({
  cultivar,
  chr,
  start,
  end,
  chrLength,
  genes,
  blocks,
}: {
  cultivar: string;
  chr: string;
  start: number;
  end: number;
  chrLength: number | undefined;
  genes: RegionGene[];
  blocks: CandidateBlock[];
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const plotW = W - MARGIN_L - MARGIN_R;
  const totalLen = chrLength && chrLength > 0 ? chrLength : Math.max(end, 1);
  const bpToPx = (pos: number) => MARGIN_L + (pos / totalLen) * plotW;
  const pxToBp = (px: number) =>
    Math.max(0, Math.min(totalLen, ((px - MARGIN_L) / plotW) * totalLen));

  // Gene density bins across the full chr. buildRegionBins filters by
  // the provided window, so we pass 0..totalLen to get chr-wide bins.
  const chrGenes = useMemo(
    () => genes.filter((g) => g.chr === chr),
    [genes, chr],
  );
  const bins = useMemo(
    () => buildRegionBins(0, totalLen, chrGenes, [], DENSITY_BIN_COUNT),
    [totalLen, chrGenes],
  );
  const maxBin = useMemo(
    () => bins.reduce((m, b) => Math.max(m, b.geneCount), 0),
    [bins],
  );

  const winX1 = bpToPx(start);
  const winX2 = bpToPx(end);
  const winW = Math.max(2, winX2 - winX1);
  const spanBp = Math.max(1, end - start);

  const onClick = (ev: React.MouseEvent<SVGSVGElement>) => {
    const svg = ev.currentTarget;
    const rect = svg.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / rect.width) * W;
    const centerBp = Math.round(pxToBp(px));
    let newStart = Math.max(0, Math.round(centerBp - spanBp / 2));
    const newEnd = Math.min(totalLen, newStart + spanBp);
    if (newEnd - newStart < spanBp && totalLen >= spanBp) {
      newStart = Math.max(0, newEnd - spanBp);
    }
    if (newStart === start && newEnd === end) return;
    navigate(
      `/region/${cultivar}/${chr}/${newStart}-${newEnd}${location.search}`,
    );
  };

  return (
    <Card>
      <CardContent className="py-2">
        <div className="flex items-baseline justify-between mb-1">
          <h3 className="text-xs uppercase tracking-wide text-gray-500">
            Chromosome overview
          </h3>
          <span className="text-[10px] font-mono text-gray-400">
            {chr} · {(totalLen / 1_000_000).toFixed(1)} Mb
            {chrLength == null && ' (approx)'}
          </span>
        </div>
        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Chromosome overview ${chr}, click to navigate`}
          preserveAspectRatio="none"
          style={{ cursor: 'pointer' }}
          onClick={onClick}
        >
          {/* chromosome baseline */}
          <rect
            x={MARGIN_L}
            y={CHR_Y}
            width={plotW}
            height={CHR_H}
            fill="#f3f4f6"
            stroke="#d1d5db"
            strokeWidth={0.5}
            rx={1}
          />
          {/* gene density bins (gray) */}
          {bins.map((b) => {
            if (b.geneCount === 0 || maxBin === 0) return null;
            const w = plotW / DENSITY_BIN_COUNT;
            const x = MARGIN_L + b.i * w;
            const h =
              (Math.sqrt(b.geneCount) / Math.sqrt(maxBin)) * CHR_H;
            return (
              <rect
                key={b.i}
                x={x}
                y={CHR_Y + CHR_H - h}
                width={Math.max(0.5, w - 0.2)}
                height={h}
                fill="#6b7280"
                opacity={0.55}
              />
            );
          })}
          {/* Curated blocks — always-visible extent bars above the
              chromosome baseline. Auto 1 Mb bins are intentionally
              omitted (systematic grid, not a reviewer signal). */}
          {blocks
            .filter((b) => b.curated)
            .map((b) => {
              const x1 = bpToPx(b.region.start);
              const x2 = bpToPx(b.region.end);
              const w = Math.max(3, x2 - x1);
              return (
                <rect
                  key={`${b.runId}:${b.blockId}`}
                  x={x1}
                  y={CURATED_BAND_Y}
                  width={w}
                  height={CURATED_BAND_H}
                  fill="#d97706"
                  opacity={0.9}
                  rx={1}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(
                      `/analysis/${b.runId}/block/${encodeURIComponent(b.blockId)}`,
                    );
                  }}
                >
                  <title>
                    {b.blockId} · {b.traitId} · curated review ·{' '}
                    {b.candidateOgCount} OG · {b.intersectionCount} int
                    (click to open)
                  </title>
                </rect>
              );
            })}
          {/* current window */}
          <rect
            x={winX1}
            y={CHR_Y - 3}
            width={winW}
            height={CHR_H + 6}
            fill="#2563eb"
            opacity={0.18}
            stroke="#1d4ed8"
            strokeWidth={1}
            pointerEvents="none"
          />
        </svg>
        <p className="mt-1 text-[10px] text-gray-500">
          Click anywhere above to recenter the current window on that
          position.
        </p>
      </CardContent>
    </Card>
  );
}
