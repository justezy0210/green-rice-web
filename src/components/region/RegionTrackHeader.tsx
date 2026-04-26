import { Button } from '@/components/ui/button';

/**
 * Controls strip above the Region track SVG: mode badge (summary vs
 * detail), focus-OG chip, range/count readout, SV-scope toggle
 * (cultivar-only vs pangenome-wide), zoom pills, and back button.
 * Pulled out of `RegionTrackStatusLine.tsx` so each file stays under
 * the 300-line cap.
 */
export function TrackHeader({
  anySummary,
  chr,
  start,
  end,
  geneCount,
  svCount,
  svLoading,
  focusedOgId,
  focusedGeneCount,
  onClearFocusedOg,
  onBack,
  zoom,
  onZoomChange,
  cultivarName,
  svScope,
  onToggleSvScope,
  svSampleCount,
}: {
  anySummary: boolean;
  chr: string;
  start: number;
  end: number;
  geneCount: number;
  svCount: number;
  svLoading?: boolean;
  focusedOgId?: string | null;
  focusedGeneCount: number;
  onClearFocusedOg?: () => void;
  onBack: () => void;
  zoom: number;
  onZoomChange: (z: number) => void;
  cultivarName?: string;
  svScope?: 'cultivar' | 'all';
  onToggleSvScope?: () => void;
  svSampleCount?: number | null;
}) {
  const cultivarMode = svScope !== 'all';
  const allLabel =
    svSampleCount != null
      ? `SV · all ${svSampleCount} cultivars`
      : 'SV · all cultivars';
  const scopeLabel = cultivarMode
    ? `SV · ${cultivarName ?? 'this cultivar'} only`
    : allLabel;
  const scopeClass = cultivarMode
    ? 'text-[10px] inline-flex items-center rounded border border-green-200 bg-green-50 text-green-800 px-1.5 py-[1px] hover:bg-green-100'
    : 'text-[10px] inline-flex items-center rounded border border-gray-300 bg-gray-100 text-gray-700 px-1.5 py-[1px] hover:bg-gray-200';
  const scopeTitle = cultivarMode
    ? `Click to expand to pangenome view (${
        svSampleCount != null ? `all ${svSampleCount} cultivars` : 'all cultivars'
      })`
    : `Click to narrow to ${cultivarName ?? 'the URL cultivar'} only`;
  return (
    <div className="flex items-baseline justify-between mb-2 gap-2 flex-wrap">
      <h3 className="text-xs uppercase tracking-wide text-gray-500">
        Region track{' '}
        <span className="text-[10px] font-normal text-gray-400">
          · {anySummary ? 'summary' : 'detail'}
        </span>
      </h3>
      <div className="flex items-baseline gap-3 flex-wrap">
        {focusedOgId && (
          <span className="text-[10px] font-mono inline-flex items-center gap-1 text-indigo-800 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-[1px]">
            focus: {focusedOgId} ·{' '}
            {focusedGeneCount > 0
              ? `${focusedGeneCount} here`
              : 'none in window'}
            {onClearFocusedOg && (
              /* raw: inline × clear glyph adjacent to a chip — see allowed-raw rule. */
              <button
                type="button"
                onClick={onClearFocusedOg}
                className="ml-0.5 text-indigo-500 hover:text-indigo-900"
                title="Clear focus"
                aria-label="Clear focused OG"
              >
                ×
              </button>
            )}
          </span>
        )}
        <span className="text-[10px] text-gray-400 font-mono">
          {chr}:{(start / 1_000_000).toFixed(2)}–{(end / 1_000_000).toFixed(2)} Mb
          · {geneCount} genes
          · {svLoading ? '…' : svCount} SV
        </span>
        {onToggleSvScope && (
          /* raw: dense 10px scope toggle chip with cultivar/pangenome variant — Button primitive over-pads. */
          <button
            type="button"
            onClick={onToggleSvScope}
            className={scopeClass}
            title={scopeTitle}
            aria-pressed={!cultivarMode}
          >
            {scopeLabel}
          </button>
        )}
        <span
          className="inline-flex items-center gap-0.5 text-[10px]"
          role="group"
          aria-label="Zoom level"
        >
          {[1, 2, 4, 8].map((z) => (
            /* raw: dense zoom-level chip group (1× / 2× / 4× / 8×). */
            <button
              key={z}
              type="button"
              onClick={() => onZoomChange(z)}
              className={
                zoom === z
                  ? 'px-1 rounded bg-green-100 text-green-800 font-semibold'
                  : 'px-1 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-100'
              }
              aria-pressed={zoom === z}
              title={`Zoom ${z}×${z > 1 ? ' (scroll horizontally)' : ''}`}
            >
              {z}×
            </button>
          ))}
        </span>
        <Button
          variant="link"
          size="xs"
          onClick={onBack}
          className="text-[10px] text-gray-600 hover:text-green-700"
          title="Go back to the previous region"
        >
          ← Back
        </Button>
      </div>
    </div>
  );
}
