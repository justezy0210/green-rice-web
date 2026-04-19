import { publicDownloadUrl } from '@/lib/download-urls';
import { useDownloadManifest } from '@/hooks/useDownloadManifest';
import type { DownloadManifest } from '@/types/download-manifest';

interface Props {
  traitId: string;
}

// File rendering order. Unknown names fall back to alphabetical
// (stable tail) — keeps README at the end instead of scattered.
const DISPLAY_ORDER = [
  'candidates.tsv',
  'candidate_irgsp_coords.bed',
  'candidate_copycount_matrix.tsv',
  'candidate_members.tsv',
  'trait_metadata.tsv',
  'README.md',
];

function orderFiles(names: string[]): string[] {
  const known = new Set(DISPLAY_ORDER);
  const first = DISPLAY_ORDER.filter((n) => names.includes(n));
  const extra = names.filter((n) => !known.has(n)).sort();
  return [...first, ...extra];
}

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
 * beside the grouping summary. Files and sizes come from whatever the
 * manifest lists for this trait — no hardcoded file set. This honors
 * the rev2 contract "UI renders whatever files the manifest lists"
 * and keeps README / Tier B discoverable if the generator emits them.
 */
export function TraitDownloadCard({ traitId }: Props) {
  const { manifest, loading, error } = useDownloadManifest();

  if (error) return null;
  const entry = manifest?.traits[traitId];
  if (manifest && !entry) return null;

  const tag = manifest ? versionTag(manifest) : '';
  const fileNames = entry ? orderFiles(Object.keys(entry.files)) : [];

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
        {entry
          ? fileNames.map((name) => {
              const meta = entry.files[name];
              return (
                <li key={name} className="flex items-center justify-between text-xs">
                  <FileLink
                    path={`downloads/traits/${traitId}/${tag}/${name}`}
                    name={name}
                  />
                  <span className="text-[10px] text-gray-400 tabular-nums ml-2">
                    {humanSize(meta.size)}
                  </span>
                </li>
              );
            })
          : // Loading skeleton — three generic rows so the card has a
            // stable footprint while the manifest fetch is in flight.
            [0, 1, 2].map((i) => (
              <li key={i} className="flex items-center justify-between text-xs">
                <span className="h-3 w-40 bg-green-100/60 rounded animate-pulse" />
                <span className="text-[10px] text-gray-400 tabular-nums ml-2">
                  {loading ? '…' : ''}
                </span>
              </li>
            ))}
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
