import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TierBadge } from '@/components/badges/TierBadge';
import { useOgCategories } from '@/hooks/useOgCategories';
import { useOgIndex } from '@/hooks/useOgIndex';
import { useOrthogroupDiff } from '@/hooks/useOrthogroupDiff';
import { useSvManifest } from '@/hooks/useSvMatrix';
import { DEFAULT_TRAIT_ID } from '@/config/traits';
import {
  PANEL_LABEL,
  PANGENOME_CULTIVAR_COUNT,
  TOTAL_CULTIVARS,
} from '@/config/panel';
import { SV_RELEASE_ID } from '@/lib/releases';
import { summarizePangenomeOgs } from '@/lib/pangenome-summary';
import { formatBp } from '@/lib/region-helpers';
import type { ConservationTier } from '@/lib/og-conservation';
import type { SvType } from '@/types/sv-event';

const SV_TYPE_ORDER: SvType[] = ['INS', 'DEL', 'COMPLEX'];
const TIER_PRESET: Record<ConservationTier, string> = {
  universal: 'universal',
  common: 'common',
  rare: 'rare',
  private: 'private',
  absent: 'panel-absent',
};

export function PangenomeSummaryPage() {
  const { doc } = useOrthogroupDiff(DEFAULT_TRAIT_ID);
  const orthofinderVersion = doc?.orthofinderVersion ?? null;
  const { bundle, loading, error } = useOgIndex(orthofinderVersion);
  const categories = useOgCategories(orthofinderVersion);
  const svState = useSvManifest(SV_RELEASE_ID);
  const summary = bundle ? summarizePangenomeOgs(bundle, categories) : null;

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-gray-900">Pangenome Summary</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-gray-600">
          Panel-level catalog of orthogroup conservation, copy variation, functional categories,
          and structural variants. Counts are panel-scoped and should not be read as validated
          gene absence or Korean-rice-wide frequency.
        </p>
        <SummaryLine
          items={[
            ['Panel cultivars', `${TOTAL_CULTIVARS} total; ${PANGENOME_CULTIVAR_COUNT} with SV coverage`],
            ['Graph coverage', PANEL_LABEL.coverageFraction],
            ['Orthogroups', summary ? summary.totalOgs.toLocaleString() : '...'],
            ['SV events', svState.manifest ? svState.manifest.eventCount.toLocaleString() : '...'],
          ]}
        />
      </header>

      {loading ? (
        <MessageCard>Loading pangenome orthogroup catalog...</MessageCard>
      ) : error ? (
        <MessageCard tone="error">{error.message}</MessageCard>
      ) : !summary || !bundle ? (
        <MessageCard>No pangenome orthogroup catalog is available.</MessageCard>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card>
              <CardContent className="space-y-3 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Orthogroup Conservation</h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Core/accessory catalog derived from cultivar copy counts.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {summary.tierRows.map((row) => (
                    <TierRow
                      key={row.tier}
                      label={row.label}
                      description={row.description}
                      count={row.count}
                      total={summary.totalOgs}
                      tier={row.tier}
                      href={ogPresetHref(TIER_PRESET[row.tier])}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 py-4">
                <h2 className="text-sm font-semibold text-gray-900">Quick Catalog Counts</h2>
                <div className="grid grid-cols-2 gap-2">
                  <SmallMetric label="Core OGs" value={summary.coreCount} href={ogPresetHref('universal')} />
                  <SmallMetric label="Variable OGs" value={summary.variableCount} href={ogPresetHref('variable')} />
                  <SmallMetric label="Private OGs" value={summary.privateCount} href={ogPresetHref('private')} />
                  <SmallMetric label="IRGSP-absent OGs" value={summary.irgspAbsentCount} href={ogPresetHref('irgsp-absent')} />
                  <SmallMetric label="Trait-linked OGs" value={summary.traitLinkedCount} href={ogPresetHref('trait-linked')} />
                  <SmallMetric label="Multi-copy-like OGs" value={summary.multiCopyLikeCount} href={ogPresetHref('multi-copy-like')} />
                </div>
                <p className="text-[11px] leading-relaxed text-gray-500">
                  Variable and multi-copy-like counts are copy-count descriptors, not validated
                  deletion or duplication calls.
                </p>
              </CardContent>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card>
              <CardContent className="space-y-3 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">Functional Pangenome</h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Top functional categories among classified orthogroups.
                    </p>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {categories ? `${categories.totalClassified.toLocaleString()} classified` : 'classification unavailable'}
                  </span>
                </div>
                {summary.functionalRows.length === 0 ? (
                  <p className="text-sm text-gray-500">Functional category index is not available.</p>
                ) : (
                  <div className="space-y-2">
                    {summary.functionalRows.slice(0, 10).map((row) => (
                      <FunctionalRow
                        key={row.id}
                        label={row.label}
                        color={row.color}
                        count={row.count}
                        variableCount={row.variableCount}
                        total={summary.totalOgs}
                        href={`/og?preset=all&category=${encodeURIComponent(row.id)}`}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">SV Release</h2>
                    <p className="mt-0.5 text-xs text-gray-500">Event-normalized structural variant matrix.</p>
                  </div>
                </div>
                {svState.loading ? (
                  <p className="text-sm text-gray-400">Loading SV manifest...</p>
                ) : !svState.manifest ? (
                  <p className="text-sm text-gray-500">SV manifest is not available.</p>
                ) : (
                  <div className="space-y-2">
                    {SV_TYPE_ORDER.map((type) => (
                      <SvTypeRow
                        key={type}
                        type={type}
                        count={svState.manifest?.typeCounts[type] ?? 0}
                        total={svState.manifest?.eventCount ?? 0}
                        href={`/sv?type=${type}`}
                      />
                    ))}
                    <div className="rounded border border-gray-100 bg-gray-50 px-3 py-2 text-[11px] leading-relaxed text-gray-600">
                      {svState.manifest.sampleCount} samples · {Object.keys(svState.manifest.chrCounts).length} chromosomes · min SV threshold {formatBp(50)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function SummaryLine({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-1 border-y border-gray-100 py-2 text-xs">
      {items.map(([label, value]) => (
        <div key={label} className="flex items-baseline gap-1.5">
          <dt className="text-gray-500">{label}</dt>
          <dd className="font-mono text-gray-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ogPresetHref(preset: string): string {
  return `/og?preset=${encodeURIComponent(preset)}`;
}

function SmallMetric({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link to={href} className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 hover:border-green-200 hover:bg-green-50/60">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-0.5 font-mono text-base font-semibold text-gray-900">
        {value.toLocaleString()}
      </div>
    </Link>
  );
}

function TierRow({ label, description, count, total, tier, href }: {
  label: string;
  description: string;
  count: number;
  total: number;
  tier: ConservationTier;
  href: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <Link to={href} className="grid grid-cols-[150px_minmax(0,1fr)_80px] items-center gap-3 rounded-md border border-gray-100 bg-white px-3 py-2 hover:border-green-200 hover:bg-green-50/50">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <TierBadge tier={tier} />
          <span className="truncate text-xs font-medium text-gray-900">{label}</span>
        </div>
        <div className="mt-0.5 truncate text-[11px] text-gray-500" title={description}>
          {description}
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded bg-gray-100">
        <div className="h-full rounded bg-green-500" style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <div className="text-right font-mono text-xs text-gray-700">
        {count.toLocaleString()}
      </div>
    </Link>
  );
}

function FunctionalRow({ label, color, count, variableCount, total, href }: {
  label: string;
  color: string;
  count: number;
  variableCount: number;
  total: number;
  href: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <Link to={href} className="grid grid-cols-[minmax(150px,0.8fr)_minmax(0,1fr)_110px] items-center gap-3 rounded-md border border-gray-100 bg-white px-3 py-2 hover:border-green-200 hover:bg-green-50/50">
      <div className="flex min-w-0 items-center gap-2">
        <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
        <span className="truncate text-xs font-medium text-gray-800">{label}</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-gray-100">
        <div className="h-full rounded" style={{ width: `${Math.max(2, pct)}%`, backgroundColor: color }} />
      </div>
      <div className="text-right text-[11px] text-gray-600">
        <span className="font-mono text-gray-900">{count.toLocaleString()}</span>
        <span className="ml-1 text-gray-400">({variableCount.toLocaleString()} variable)</span>
      </div>
    </Link>
  );
}

function SvTypeRow({ type, count, total, href }: { type: SvType; count: number; total: number; href: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <Link to={href} className="grid grid-cols-[72px_minmax(0,1fr)_72px] items-center gap-2 rounded-md border border-gray-100 bg-white px-3 py-2 hover:border-green-200 hover:bg-green-50/50">
      <span className="font-mono text-xs font-medium text-gray-800">{type}</span>
      <div className="h-2 overflow-hidden rounded bg-gray-100">
        <div className="h-full rounded bg-emerald-500" style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <span className="text-right font-mono text-xs text-gray-700">{count.toLocaleString()}</span>
    </Link>
  );
}

function MessageCard({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'error' }) {
  return (
    <Card>
      <CardContent className={`py-5 text-sm ${tone === 'error' ? 'text-red-500' : 'text-gray-500'}`}>
        {children}
      </CardContent>
    </Card>
  );
}
