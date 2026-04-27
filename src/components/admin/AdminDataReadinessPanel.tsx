import { Card, CardContent } from '@/components/ui/card';
import { useAdminReadiness } from '@/hooks/useAdminReadiness';
import type {
  AdminReadinessItem,
  AdminReadinessSection,
  ReadinessStatus,
} from '@/types/admin-readiness';

export function AdminDataReadinessPanel() {
  const { sections, loading, artifactLoading } = useAdminReadiness();
  const items = sections.flatMap((section) => section.items);
  const ready = items.filter((item) => item.status === 'ready').length;
  const problem = items.filter((item) =>
    item.status === 'missing' || item.status === 'error' || item.status === 'partial',
  ).length;

  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Data Readiness</h2>
            <p className="mt-0.5 max-w-3xl text-xs leading-relaxed text-gray-500">
              Operational status for the Firestore documents and Storage artifacts
              required by the public pages. Derived artifacts should be produced by
              pipeline scripts, then checked here before release.
            </p>
          </div>
          <div className="flex shrink-0 gap-2 text-xs">
            <SummaryPill label="Ready" value={ready} tone="ready" />
            <SummaryPill label="Needs attention" value={problem} tone={problem ? 'partial' : 'ready'} />
          </div>
        </div>

        {(loading || artifactLoading) && (
          <p className="rounded border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-500">
            Checking current release artifacts...
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {sections.map((section) => (
            <ReadinessSection key={section.id} section={section} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReadinessSection({ section }: { section: AdminReadinessSection }) {
  return (
    <section className="rounded-md border border-gray-100 bg-white">
      <div className="border-b border-gray-100 px-3 py-2">
        <h3 className="text-sm font-medium text-gray-900">{section.title}</h3>
        <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
          {section.description}
        </p>
      </div>
      <div className="divide-y divide-gray-100">
        {section.items.map((item) => (
          <ReadinessRow key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function ReadinessRow({ item }: { item: AdminReadinessItem }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-2">
      <div className="min-w-0">
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="truncate text-xs font-medium text-gray-900">{item.label}</p>
          <span className="shrink-0 text-[10px] text-gray-400">{item.surface}</span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-gray-500" title={item.detail}>
          {item.detail}
        </p>
        {item.path && (
          <p className="mt-0.5 truncate font-mono text-[10px] text-gray-400" title={item.path}>
            {item.path}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <StatusBadge status={item.status} />
        {item.meta && (
          <span className="max-w-40 truncate text-[10px] text-gray-400" title={item.meta}>
            {item.meta}
          </span>
        )}
      </div>
    </div>
  );
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: ReadinessStatus;
}) {
  return (
    <span className={`rounded border px-2 py-1 ${statusClass(tone)}`}>
      {label}: <span className="font-mono font-semibold">{value}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: ReadinessStatus }) {
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${statusClass(status)}`}>
      {status}
    </span>
  );
}

function statusClass(status: ReadinessStatus): string {
  switch (status) {
    case 'ready':
      return 'border-green-200 bg-green-50 text-green-800';
    case 'partial':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'missing':
      return 'border-gray-200 bg-gray-50 text-gray-600';
    case 'loading':
      return 'border-sky-200 bg-sky-50 text-sky-800';
    case 'error':
      return 'border-red-200 bg-red-50 text-red-700';
  }
}
