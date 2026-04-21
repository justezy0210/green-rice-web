import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { publicDownloadUrl } from '@/lib/download-urls';
import { useDownloadManifest } from '@/hooks/useDownloadManifest';
import type { DownloadManifest } from '@/types/download-manifest';

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function versionTag(m: DownloadManifest): string {
  return `v${m.orthofinderVersion}_g${m.groupingVersion}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}

/**
 * Dashboard-style summary of the active discovery release:
 * version pair + generation date + counts + link to Explore for per-trait
 * downloads + direct link to the cross-trait master file.
 *
 * Per-trait file links live on the Explore page (TraitDownloadCard),
 * where the user already has trait context. This page is for browse /
 * bulk / citation users.
 */
export function DiscoveryDownloadSection() {
  const { manifest, loading, error } = useDownloadManifest();

  if (loading) {
    return <Shell>Loading discovery downloads…</Shell>;
  }
  if (error || !manifest) {
    return (
      <Shell>
        Discovery downloads are not published yet for this deployment.
        <span className="block text-[11px] text-gray-400 mt-1">{error ?? 'manifest missing'}</span>
      </Shell>
    );
  }

  const tag = versionTag(manifest);
  const date = formatDate(manifest.generatedAt);
  const traitCount = Object.keys(manifest.traits).length;
  const usableTraits = Object.values(manifest.traits).filter((t) => t.usable).length;
  const totalBytes = [
    ...Object.values(manifest.traits).flatMap((t) => Object.values(t.files)),
    ...Object.values(manifest.crossTrait.files),
  ].reduce((n, f) => n + f.size, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-baseline gap-2">
          <span>Discovery results</span>
          <span className="font-mono text-green-700 text-sm">{tag}</span>
          <span className="text-[11px] text-gray-400 font-normal">generated {date}</span>
        </CardTitle>
        <p className="text-[11px] text-gray-500 leading-relaxed mt-1">
          Panel-scoped candidate exports. Version <span className="font-mono">{tag}</span> is
          immutable — cite the full URL in Methods. Not marker-ready, not primer-ready,
          not causal.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Traits" value={`${usableTraits}/${traitCount}`} sub="usable / total" />
          <Stat label="Bundle size" value={humanSize(totalBytes)} sub={`${tag}`} />
          <Stat label="Generated" value={date} sub={manifest.appVersion ?? ''} />
        </div>

        <div className="border-t border-gray-100 pt-3 space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Per-trait files</p>
              <p className="text-[11px] text-gray-500">
                `candidates.tsv`, BED coordinates, copy-count matrix — choose a trait first.
              </p>
            </div>
            <Link
              to="/analysis"
              className="shrink-0 text-xs text-green-700 hover:underline whitespace-nowrap"
            >
              Go to Analysis →
            </Link>
          </div>

          <CrossTraitRow manifest={manifest} />
        </div>
      </CardContent>
    </Card>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Discovery results</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-gray-500">{children}</CardContent>
    </Card>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="border border-gray-100 rounded px-2 py-1.5 bg-gray-50/50">
      <p className="text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-semibold text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 truncate">{sub}</p>}
    </div>
  );
}

// Preferred render order; unknowns fall through alphabetically at the end.
const CROSS_TRAIT_ORDER = ['cross_trait_candidates.tsv', 'README.md'];

function orderCrossTraitFiles(names: string[]): string[] {
  const known = new Set(CROSS_TRAIT_ORDER);
  const first = CROSS_TRAIT_ORDER.filter((n) => names.includes(n));
  const extra = names.filter((n) => !known.has(n)).sort();
  return [...first, ...extra];
}

function CrossTraitRow({ manifest }: { manifest: DownloadManifest }) {
  const tag = versionTag(manifest);
  const files = orderCrossTraitFiles(Object.keys(manifest.crossTrait.files));
  if (files.length === 0) return null;

  return (
    <div className="flex items-start justify-between gap-4 pt-2 border-t border-gray-100">
      <div>
        <p className="text-sm font-medium text-gray-900">Cross-trait master</p>
        <p className="text-[11px] text-gray-500">
          One row per (trait, candidate OG). Long format. Ranks are not comparable across traits.
        </p>
      </div>
      <ul className="shrink-0 space-y-0.5">
        {files.map((name) => {
          const meta = manifest.crossTrait.files[name];
          return (
            <li key={name} className="flex items-center gap-2 justify-end">
              <CrossTraitLink
                path={`downloads/cross-trait/${tag}/${name}`}
                name={name}
              />
              <span className="text-[10px] text-gray-400 tabular-nums w-14 text-right">
                {humanSize(meta.size)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CrossTraitLink({ path, name }: { path: string; name: string }) {
  // Server-side Content-Disposition: attachment drives the download;
  // target="_blank" would just flash an empty tab.
  return (
    <a
      href={publicDownloadUrl(path)}
      download={name}
      className="font-mono text-xs text-green-700 hover:underline"
    >
      {name}
    </a>
  );
}
