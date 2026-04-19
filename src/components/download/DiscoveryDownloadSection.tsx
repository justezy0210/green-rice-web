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
              to="/explore"
              className="shrink-0 text-xs text-green-700 hover:underline whitespace-nowrap"
            >
              Go to Explore →
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

function CrossTraitRow({ manifest }: { manifest: DownloadManifest }) {
  const tag = versionTag(manifest);
  const tsv = manifest.crossTrait.files['cross_trait_candidates.tsv'];
  if (!tsv) return null;

  return (
    <div className="flex items-center justify-between gap-4 pt-2 border-t border-gray-100">
      <div>
        <p className="text-sm font-medium text-gray-900">Cross-trait master</p>
        <p className="text-[11px] text-gray-500">
          One row per (trait, candidate OG). Long format. Ranks are not comparable across traits.
        </p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-0.5">
        <CrossTraitLink
          path={`downloads/cross-trait/${tag}/cross_trait_candidates.tsv`}
          name="cross_trait_candidates.tsv"
        />
        <span className="text-[10px] text-gray-400 tabular-nums">{humanSize(tsv.size)}</span>
      </div>
    </div>
  );
}

function CrossTraitLink({ path, name }: { path: string; name: string }) {
  // Public-read path — no network round-trip to resolve a token.
  return (
    <a
      href={publicDownloadUrl(path)}
      download={name}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-xs text-green-700 hover:underline"
    >
      {name}
    </a>
  );
}
