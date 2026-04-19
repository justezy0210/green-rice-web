import { useMemo, useState } from 'react';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { storage } from '@/lib/firebase';
import { TRAITS } from '@/config/traits';
import { useDownloadManifest } from '@/hooks/useDownloadManifest';
import type { DownloadManifest, DownloadTraitEntry } from '@/types/download-manifest';

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function versionTag(manifest: DownloadManifest): string {
  return `v${manifest.orthofinderVersion}_g${manifest.groupingVersion}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}

export function DiscoveryDownloadSection() {
  const { manifest, loading, error } = useDownloadManifest();

  if (loading) {
    return <InfoCard>Loading discovery downloads…</InfoCard>;
  }
  if (error || !manifest) {
    return (
      <InfoCard>
        Discovery downloads are not published yet for this deployment.
        <span className="block text-[11px] text-gray-400 mt-1">{error ?? 'manifest missing'}</span>
      </InfoCard>
    );
  }

  return (
    <>
      <PerTraitCard manifest={manifest} />
      <CrossTraitCard manifest={manifest} />
    </>
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Discovery results</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-gray-500">{children}</CardContent>
    </Card>
  );
}

function PerTraitCard({ manifest }: { manifest: DownloadManifest }) {
  const tag = versionTag(manifest);
  const date = formatDate(manifest.generatedAt);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Discovery results · <span className="font-mono text-green-700">{tag}</span>
          <span className="ml-2 text-xs text-gray-400 font-normal">generated {date}</span>
        </CardTitle>
        <p className="text-[11px] text-gray-500 leading-relaxed mt-1">
          Panel-scoped discovery exports. Candidate tables, BED coordinates, and per-OG copy
          count for each trait. Not marker-ready, not primer-ready, not causal. Version
          <span className="font-mono"> {tag}</span> is immutable — cite the full URL in Methods.
        </p>
      </CardHeader>
      <CardContent className="divide-y divide-gray-100">
        {TRAITS.map((t) => {
          const entry = manifest.traits[t.id];
          if (!entry) return null;
          return <TraitRow key={t.id} traitId={t.id} label={t.label} entry={entry} />;
        })}
      </CardContent>
    </Card>
  );
}

function CrossTraitCard({ manifest }: { manifest: DownloadManifest }) {
  const tag = versionTag(manifest);
  const [open, setOpen] = useState(false);
  const files = useMemo(
    () => Object.entries(manifest.crossTrait.files).sort(([a], [b]) => a.localeCompare(b)),
    [manifest.crossTrait.files],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Cross-trait master · <span className="font-mono text-green-700">{tag}</span>
        </CardTitle>
        <p className="text-[11px] text-gray-500 leading-relaxed mt-1">
          Long-format table: one row per (trait, candidate OG). Ranks are per-trait and NOT
          comparable across traits.
        </p>
      </CardHeader>
      <CardContent>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs text-green-700 hover:underline"
        >
          {open ? 'Hide' : 'Show'} files ({files.length})
        </button>
        {open && (
          <ul className="mt-2 space-y-1">
            {files.map(([name, meta]) => (
              <li key={name} className="flex items-center justify-between text-sm">
                <DownloadLink
                  path={`downloads/cross-trait/${tag}/${name}`}
                  name={name}
                />
                <span className="text-[11px] text-gray-400 tabular-nums">
                  {humanSize(meta.size)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function TraitRow({
  traitId,
  label,
  entry,
}: {
  traitId: string;
  label: string;
  entry: DownloadTraitEntry;
}) {
  const [open, setOpen] = useState(false);
  const { manifest } = useDownloadManifest();
  if (!manifest) return null;
  const tag = versionTag(manifest);
  const files = Object.entries(entry.files).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{label}</span>
          <span className="text-[10px] uppercase tracking-wide text-gray-400">{traitId}</span>
          {!entry.usable && (
            <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700">
              usable=false
            </span>
          )}
        </span>
        <span className="text-xs text-green-700">
          {open ? 'Hide' : 'Show'} ({files.length})
        </span>
      </button>
      {open && (
        <ul className="mt-2 pl-2 space-y-1">
          {files.map(([name, meta]) => (
            <li key={name} className="flex items-center justify-between text-sm">
              <DownloadLink
                path={`downloads/traits/${traitId}/${tag}/${name}`}
                name={name}
              />
              <span className="text-[11px] text-gray-400 tabular-nums">
                {humanSize(meta.size)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DownloadLink({ path, name }: { path: string; name: string }) {
  const [state, setState] = useState<{ key: string; url?: string; error?: string }>({ key: '' });

  const prime = async () => {
    if (state.key === path) return;
    try {
      const url = await getDownloadURL(storageRef(storage, path));
      setState({ key: path, url });
    } catch (err) {
      setState({ key: path, error: err instanceof Error ? err.message : 'unavailable' });
    }
  };

  if (state.key === path && state.error) {
    return <span className="text-red-500 text-xs">{name} · error</span>;
  }
  if (state.key === path && state.url) {
    return (
      <a
        href={state.url}
        download={name}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-green-700 hover:underline"
      >
        {name}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={prime}
      className="font-mono text-gray-700 hover:text-green-700 hover:underline"
    >
      {name}
    </button>
  );
}
