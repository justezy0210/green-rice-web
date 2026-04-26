import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BlockTypeBadge } from '@/components/discovery/BlockTypeBadge';
import { TRAITS } from '@/config/traits';
import { formatBlockRegion, type DiscoveryBlockGroup } from '@/lib/discovery-block-groups';
import type { Candidate } from '@/types/candidate';

const traitLabel = new Map<string, string>(TRAITS.map((trait) => [trait.id, trait.label]));

interface Props {
  group: DiscoveryBlockGroup;
  title: string;
  exactBlockUrl: string;
  candidates: Candidate[];
  candidatesLoading: boolean;
}

export function DiscoveryLocusSummaryCard({
  group,
  title,
  exactBlockUrl,
  candidates,
  candidatesLoading,
}: Props) {
  const topCandidate = pickTopCandidate(candidates);
  const topOgId = topCandidate?.primaryOgId ?? group.representative.topOgIds[0] ?? null;
  const topGeneId = topCandidate?.leadGeneId ?? null;
  const topSvId = topCandidate?.bestSv?.eventId ?? group.representative.leadSvs[0]?.eventId ?? null;
  const regionUrl = `/region/baegilmi/${group.region.chr}/${group.region.start}-${group.region.end}`;
  const reason = buildReason(group);

  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            <p className="mt-0.5 font-mono text-sm text-gray-600">
              {formatBlockRegion(group.region)}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-700">
              {reason}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <BlockTypeBadge blockType={group.representative.blockType} />
            <Badge
              variant={group.curated ? 'warning' : 'outline'}
              className="h-auto rounded px-1.5 py-0.5 text-[10px]"
            >
              {group.curated ? 'curated locus' : 'auto locus'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm lg:grid-cols-4">
          <LeadItem
            label="Inspect first"
            value={topOgId ?? (candidatesLoading ? 'Loading candidates' : 'No OG lead')}
            to={topOgId ? `/og/${encodeURIComponent(topOgId)}` : null}
            mono={Boolean(topOgId)}
          />
          <LeadItem
            label="Lead gene"
            value={topGeneId ?? 'Inspect OG members'}
            to={topGeneId ? `/genes/${encodeURIComponent(topGeneId)}` : null}
            mono={Boolean(topGeneId)}
          />
          <LeadItem
            label="Lead SV"
            value={topSvId ?? 'No SV lead'}
            to={topSvId ? regionUrl : null}
            mono={Boolean(topSvId)}
          />
          <LeadItem label="Region browser" value="Open region" to={regionUrl} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {group.traitIds.map((traitId) => (
            <span
              key={traitId}
              className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] text-gray-600"
            >
              {traitLabel.get(traitId) ?? traitId}
            </span>
          ))}
          <span className="mx-1 text-gray-300">/</span>
          <span className="text-gray-500">
            {group.candidateOgTotal.toLocaleString()} candidate OG observations
          </span>
          <span className="text-gray-300">/</span>
          <span className="text-gray-500">
            {group.intersectionTotal.toLocaleString()} OG-SV overlaps
          </span>
          <span className="text-gray-300">/</span>
          <Link to={exactBlockUrl} className="text-green-700 hover:underline">
            source block
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function LeadItem({
  label,
  value,
  to,
  mono,
}: {
  label: string;
  value: string;
  to: string | null;
  mono?: boolean;
}) {
  const valueNode = (
    <span className={mono ? 'font-mono text-[12px]' : undefined}>{value}</span>
  );

  return (
    <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      {to ? (
        <Link to={to} className="mt-0.5 block truncate font-medium text-green-700 hover:underline">
          {valueNode}
        </Link>
      ) : (
        <div className="mt-0.5 truncate text-gray-500">{valueNode}</div>
      )}
    </div>
  );
}

function pickTopCandidate(candidates: Candidate[]): Candidate | null {
  return [...candidates].sort((a, b) => {
    const scoreDelta = (b.combinedScore ?? b.totalScore) - (a.combinedScore ?? a.totalScore);
    if (scoreDelta !== 0) return scoreDelta;
    return a.rank - b.rank;
  })[0] ?? null;
}

function buildReason(group: DiscoveryBlockGroup): string {
  const traitText =
    group.traitIds.length === 1
      ? 'one trait context'
      : `${group.traitIds.length} trait contexts`;
  const curation = group.curated ? 'curated review locus' : 'candidate review locus';
  return `A ${curation} flagged in ${traitText}, with ${group.candidateOgTotal.toLocaleString()} candidate OG observations and ${group.intersectionTotal.toLocaleString()} OG-SV overlaps. Use this page to choose which lead OG, gene, SV, or region to inspect next.`;
}
