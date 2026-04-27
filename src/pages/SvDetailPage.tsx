import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ScopeStrip } from '@/components/common/ScopeStrip';
import { SvCultivarPattern } from '@/components/sv/SvCultivarPattern';
import { SvEventHeader } from '@/components/sv/SvEventHeader';
import { SvLinkedContext } from '@/components/sv/SvLinkedContext';
import { SvTraitGroupPattern } from '@/components/sv/SvTraitGroupPattern';
import { Card, CardContent } from '@/components/ui/card';
import { useCultivars } from '@/hooks/useCultivars';
import {
  useSvEvent,
  useSvEventTraitPatterns,
} from '@/hooks/useSvEvent';
import { isTraitId } from '@/config/traits';
import { SV_RELEASE_ID } from '@/lib/releases';
import {
  canonicalizeSvEventId,
  summarizeSvGenotypes,
} from '@/lib/sv-event-helpers';
import type { TraitId } from '@/types/traits';

export function SvDetailPage() {
  const { eventId: rawEventId } = useParams<{ eventId: string }>();
  const canonicalEventId = canonicalizeSvEventId(rawEventId);
  const eventState = useSvEvent(SV_RELEASE_ID, canonicalEventId);
  const traitIds = useMemo<readonly TraitId[]>(
    () =>
      eventState.manifest?.traitsWithGroupFreq
        .filter(isTraitId)
        .sort() ?? [],
    [eventState.manifest],
  );
  const traitPatterns = useSvEventTraitPatterns(
    SV_RELEASE_ID,
    canonicalEventId,
    traitIds,
  );
  const { cultivars } = useCultivars();
  const cultivarNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const cultivar of cultivars) map[cultivar.id] = cultivar.name;
    return map;
  }, [cultivars]);

  if (canonicalEventId && rawEventId !== canonicalEventId) {
    return <Navigate to={`/sv/${canonicalEventId}`} replace />;
  }

  if (!canonicalEventId) {
    return (
      <div className="space-y-4">
        <Link to="/sv" className="text-sm text-green-700 hover:underline">
          ← Structural Variants
        </Link>
        <Card>
          <CardContent className="py-8 text-center">
            <h1 className="text-lg font-semibold text-gray-900">Invalid SV event ID</h1>
            <p className="mt-2 text-sm text-gray-500">
              Expected a canonical event ID such as <code>EV0000456</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (eventState.loading) {
    return (
      <div className="space-y-4">
        <Link to="/sv" className="text-sm text-green-700 hover:underline">
          ← Structural Variants
        </Link>
        <Card>
          <CardContent className="py-8 text-center text-sm text-gray-500">
            Loading SV event from {SV_RELEASE_ID}...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (eventState.error) {
    return (
      <div className="space-y-4">
        <Link to="/sv" className="text-sm text-green-700 hover:underline">
          ← Structural Variants
        </Link>
        <Card>
          <CardContent className="py-8 text-center">
            <h1 className="text-lg font-semibold text-gray-900">SV event unavailable</h1>
            <p className="mt-2 text-sm text-red-500">{eventState.error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (eventState.notFound || !eventState.event) {
    return (
      <div className="space-y-4">
        <Link to="/sv" className="text-sm text-green-700 hover:underline">
          ← Structural Variants
        </Link>
        <Card>
          <CardContent className="py-8 text-center">
            <h1 className="text-lg font-semibold text-gray-900">SV event not found</h1>
            <p className="mt-2 text-sm text-gray-500">
              {canonicalEventId} was not found in {SV_RELEASE_ID}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const event = eventState.event;
  const samples = eventState.samples.length > 0
    ? eventState.samples
    : eventState.manifest?.samples ?? Object.keys(event.gts).sort();
  const summary = summarizeSvGenotypes(event, samples);
  const regionCultivar = summary.alt[0] ?? samples[0] ?? null;
  const regionCultivarLabel = regionCultivar
    ? cultivarNameById[regionCultivar] ?? regionCultivar
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/sv" className="hover:text-green-700 hover:underline">
          ← Structural Variants
        </Link>
        <span>/</span>
        <span className="font-mono font-medium text-gray-900">{event.eventId}</span>
      </div>

      <SvEventHeader
        event={event}
        manifest={eventState.manifest}
        svReleaseId={SV_RELEASE_ID}
        regionCultivar={regionCultivar}
        regionCultivarLabel={regionCultivarLabel}
      />

      <ScopeStrip>
        SV events are candidate-discovery evidence from the current matrix
        release. Carrier pattern and trait group frequency are not causal,
        marker-ready, or validation-grade claims.
      </ScopeStrip>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
        <SvCultivarPattern
          event={event}
          samples={samples}
          cultivarNameById={cultivarNameById}
        />
        <SvTraitGroupPattern
          rows={traitPatterns.rows}
          loading={traitPatterns.loading}
          error={traitPatterns.error}
          eventId={event.eventId}
        />
      </div>

      <SvLinkedContext eventId={event.eventId} />
    </div>
  );
}
