import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  summarizeSvGenotypes,
  svGenotypeState,
  type SvGenotypeState,
} from '@/lib/sv-event-helpers';
import type { SvEvent } from '@/types/sv-event';

interface Props {
  event: SvEvent;
  samples: string[];
  cultivarNameById: Record<string, string>;
}

export function SvCultivarPattern({
  event,
  samples,
  cultivarNameById,
}: Props) {
  const summary = summarizeSvGenotypes(event, samples);

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-xs uppercase tracking-wide text-gray-500">
              Cultivar genotype pattern
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              ALT/REF state across the current SV matrix samples.
            </p>
          </div>
          <div className="flex flex-wrap gap-1 text-[10px]">
            <CountChip label="ALT" count={summary.alt.length} tone="alt" />
            <CountChip label="REF" count={summary.ref.length} tone="ref" />
            <CountChip label="Missing" count={summary.missing.length} tone="missing" />
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-1.5">
          {samples.map((sample) => {
            const gt = event.gts[sample] ?? '.';
            const state = svGenotypeState(gt);
            const name = cultivarNameById[sample] ?? sample;
            return (
              <Link
                key={sample}
                to={`/cultivar/${encodeURIComponent(name)}`}
                className={`min-w-0 rounded-md border px-2 py-1.5 text-[11px] transition-colors ${stateClass(state)}`}
                title={`${name} (${sample}): ${gt}`}
              >
                <span className="block truncate font-medium">{name}</span>
                <span className="font-mono text-[10px]">
                  {state === 'alt' ? gt : state.toUpperCase()}
                </span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function CountChip({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: SvGenotypeState;
}) {
  return (
    <span className={`rounded border px-1.5 py-0.5 ${stateClass(tone)}`}>
      {label} <span className="font-mono">{count}</span>
    </span>
  );
}

function stateClass(state: SvGenotypeState): string {
  if (state === 'alt') return 'border-green-200 bg-green-50 text-green-800 hover:bg-green-100';
  if (state === 'ref') return 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100';
  return 'border-dashed border-gray-200 bg-white text-gray-400 hover:bg-gray-50';
}
