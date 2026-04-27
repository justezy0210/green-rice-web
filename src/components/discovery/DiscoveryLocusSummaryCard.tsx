import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TRAITS } from '@/config/traits';
import { formatBlockRegion, type DiscoveryBlockGroup } from '@/lib/discovery-block-groups';

const traitLabel = new Map<string, string>(TRAITS.map((trait) => [trait.id, trait.label]));

interface Props {
  group: DiscoveryBlockGroup;
  title: string;
}

export function DiscoveryLocusSummaryCard({
  group,
  title,
}: Props) {
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
            <Badge
              variant={group.curated ? 'warning' : 'outline'}
              className="h-auto rounded px-1.5 py-0.5 text-[10px]"
            >
              {group.curated ? 'curated locus' : 'auto locus'}
            </Badge>
          </div>
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
        </div>
      </CardContent>
    </Card>
  );
}

function buildReason(group: DiscoveryBlockGroup): string {
  const traitText =
    group.traitIds.length === 1
      ? 'one trait context'
      : `${group.traitIds.length} trait contexts`;
  const curation = group.curated ? 'curated review locus' : 'candidate review locus';
  return `A ${curation} where ${traitText} point to the same genomic window. Start with the prioritized SV patterns below.`;
}
