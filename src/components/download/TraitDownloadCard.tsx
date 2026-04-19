import { publicDownloadUrl } from '@/lib/download-urls';
import { useDownloadManifest } from '@/hooks/useDownloadManifest';
import type { DownloadManifest } from '@/types/download-manifest';

interface Props {
  traitId: string;
}

const TIER_A = [
  'candidates.tsv',
  'candidate_irgsp_coords.bed',
  'candidate_copycount_matrix.tsv',
] as const;

function versionTag(m: DownloadManifest): string {
  return `v${m.orthofinderVersion}_g${m.groupingVersion}`;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Contextual download links for one trait, rendered on the Explore page
 * beside the grouping summary. This is the primary entry point for
 * discovery result downloads — /download keeps a browse/bulk overview.
 *
 * Renders a card shell immediately so it does not pop in a few hundred
 * ms later. The manifest fetch is module-preloaded in
 * useDownloadManifest, so by the time Explore mounts the cache is
 * usually already warm.
 */
export function TraitDownloadCard({ traitId }: Props) {
  const { manifest, loading, error } = useDownloadManifest();

  // Hard failures (manifest unavailable, trait missing) hide the card —
  // there is nothing useful to link to. Loading shows the shell so the
  // layout does not shift when the manifest arrives.
  if (error) return null;
  const entry = manifest?.traits[traitId];
  if (manifest && !entry) return null;

  const tag = manifest ? versionTag(manifest) : '';

  return (
    <div className="border border-green-100 rounded-md bg-green-50/40 px-3 py-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-green-800">Downloads</span>
        {tag ? (
          <span className="font-mono text-[10px] text-green-700">{tag}</span>
        ) : (
          <span className="h-3 w-12 bg-green-100/60 rounded animate-pulse" />
        )}
      </div>
      <ul className="space-y-1">
        {TIER_A.map((name) => {
          const meta = entry?.files[name];
          return (
            <li key={name} className="flex items-center justify-between text-xs">
              {meta && manifest ? (
                <FileLink
                  path={`downloads/traits/${traitId}/${tag}/${name}`}
                  name={name}
                />
              ) : (
                <span className="font-mono text-gray-400 truncate">{name}</span>
              )}
              <span className="text-[10px] text-gray-400 tabular-nums ml-2">
                {meta ? humanSize(meta.size) : loading ? '…' : ''}
              </span>
            </li>
          );
        })}
      </ul>
      {entry && !entry.usable && (
        <p className="mt-1.5 text-[10px] text-amber-700">
          Files are header-only: trait was not usable for grouping.
        </p>
      )}
    </div>
  );
}

function FileLink({ path, name }: { path: string; name: string }) {
  // Public-read paths (downloads/**) — no network call to resolve URL.
  return (
    <a
      href={publicDownloadUrl(path)}
      download={name}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-green-700 hover:underline truncate"
    >
      {name}
    </a>
  );
}
