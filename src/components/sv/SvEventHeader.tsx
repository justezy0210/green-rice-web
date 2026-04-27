import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatBp } from '@/lib/region-helpers';
import { cn } from '@/lib/utils';
import {
  formatSvCoordinate,
  svRegionWindow,
} from '@/lib/sv-event-helpers';
import type { SvEvent, SvManifest } from '@/types/sv-event';

interface Props {
  event: SvEvent;
  manifest: SvManifest | null;
  svReleaseId: string;
  regionCultivar: string | null;
  regionCultivarLabel: string | null;
}

export function SvEventHeader({
  event,
  manifest,
  svReleaseId,
  regionCultivar,
  regionCultivarLabel,
}: Props) {
  const [copied, setCopied] = useState(false);
  const regionWindow = svRegionWindow(event);
  const regionHref = regionCultivar
    ? `/region/${encodeURIComponent(regionCultivar)}/${encodeURIComponent(regionWindow.chr)}/${regionWindow.start}-${regionWindow.end}`
    : null;

  const copyEventId = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(event.eventId).then(() => {
      setCopied(true);
      globalThis.setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-2xl font-semibold tracking-normal text-gray-950">
                {event.eventId}
              </h1>
              <Badge variant="secondary" className="h-auto px-2 py-0.5 font-mono text-xs">
                {event.svType}
              </Badge>
              <Badge variant="outline" className="h-auto px-2 py-0.5 font-mono text-xs">
                {svReleaseId}
              </Badge>
            </div>
            <p className="mt-1 font-mono text-sm text-gray-600">
              {formatSvCoordinate(event)}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={copyEventId}
              disabled={!navigator.clipboard}
            >
              <Copy />
              {copied ? 'Copied' : 'Copy ID'}
            </Button>
            {regionHref && (
              <Link
                to={regionHref}
                className={cn(buttonVariants({ variant: 'outline', size: 'xs' }), 'gap-1')}
              >
                <ExternalLink />
                Region
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
          <Metric label="Reference length" value={formatBp(event.refLen)} />
          <Metric label="Alternate length" value={formatBp(event.altLen)} />
          <Metric label="Absolute size" value={formatBp(event.svLenAbs)} />
          <Metric label="Signed size" value={formatBp(event.svLen)} />
          <Metric label="Samples" value={`${manifest?.sampleCount ?? Object.keys(event.gts).length}`} />
          <Metric label="Parent snarl" value={event.parentSnarl ?? 'n/a'} mono />
        </div>

        <div className="grid grid-cols-1 gap-2 text-xs lg:grid-cols-[1fr_auto]">
          <div className="min-w-0 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-gray-400">
              Source VCF ID
            </div>
            <div className="mt-0.5 truncate font-mono text-[11px] text-gray-700" title={event.originalId}>
              {event.originalId || 'n/a'}
            </div>
          </div>
          <div className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
            Region link frame:{' '}
            <span className="font-medium text-gray-700">
              {regionCultivarLabel ?? regionCultivar ?? 'unavailable'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-md border border-gray-100 bg-white px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-gray-400">{label}</div>
      <div
        className={cn(
          'mt-0.5 truncate text-sm font-medium text-gray-900',
          mono && 'font-mono text-[12px]',
        )}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}
