import { useState } from 'react';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
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
 */
export function TraitDownloadCard({ traitId }: Props) {
  const { manifest, loading, error } = useDownloadManifest();
  if (loading) return null;
  if (error || !manifest) return null;

  const entry = manifest.traits[traitId];
  if (!entry) return null;

  const tag = versionTag(manifest);

  return (
    <div className="border border-green-100 rounded-md bg-green-50/40 px-3 py-2">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-green-800">Downloads</span>
        <span className="font-mono text-[10px] text-green-700">{tag}</span>
      </div>
      <ul className="space-y-1">
        {TIER_A.map((name) => {
          const meta = entry.files[name];
          if (!meta) return null;
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
        })}
      </ul>
      {!entry.usable && (
        <p className="mt-1.5 text-[10px] text-amber-700">
          Files are header-only: trait was not usable for grouping.
        </p>
      )}
    </div>
  );
}

function FileLink({ path, name }: { path: string; name: string }) {
  const [state, setState] = useState<{ url?: string; error?: string }>({});

  const resolve = async () => {
    if (state.url || state.error) return;
    try {
      const url = await getDownloadURL(storageRef(storage, path));
      setState({ url });
    } catch (err) {
      setState({ error: err instanceof Error ? err.message : 'unavailable' });
    }
  };

  if (state.error) {
    return <span className="text-red-500 font-mono">{name} · error</span>;
  }
  if (state.url) {
    return (
      <a
        href={state.url}
        download={name}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-green-700 hover:underline truncate"
      >
        {name}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={resolve}
      className="font-mono text-gray-700 hover:text-green-700 hover:underline truncate text-left"
    >
      {name}
    </button>
  );
}
