import { useEffect, useState } from 'react';
import { ref as storageRef, getDownloadURL } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { storage } from '@/lib/firebase';
import type { FileUploadStatus, GenomeSummary } from '@/types/genome';

interface Props {
  genomeSummary: GenomeSummary | undefined;
}

interface Entry {
  key: 'genomeFasta' | 'geneGff3' | 'repeatGff';
  label: string;
  description: string;
  file: FileUploadStatus | undefined;
}

export function GenomeDownloadSection({ genomeSummary }: Props) {
  const entries: Entry[] = [
    {
      key: 'genomeFasta',
      label: 'Genome assembly',
      description: 'Reference FASTA sequence',
      file: genomeSummary?.files?.genomeFasta,
    },
    {
      key: 'geneGff3',
      label: 'Gene annotation',
      description: 'GFF3 gene / transcript / exon coordinates',
      file: genomeSummary?.files?.geneGff3,
    },
    {
      key: 'repeatGff',
      label: 'Repeat annotation',
      description: 'GFF repeat elements',
      file: genomeSummary?.files?.repeatGff,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Downloads</CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-gray-100">
        {entries.map((e) => (
          <DownloadRow key={e.key} entry={e} />
        ))}
      </CardContent>
    </Card>
  );
}

function DownloadRow({ entry }: { entry: Entry }) {
  const { file } = entry;
  const available = !!file?.uploaded && !!file?.storagePath;

  return (
    <div className="flex items-center justify-between gap-4 py-3 text-sm">
      <div className="min-w-0 flex-1">
        <div className="font-medium text-gray-900">{entry.label}</div>
        <div className="text-xs text-gray-500">{entry.description}</div>
        {available && (
          <div className="text-[11px] text-gray-400 mt-0.5 font-mono truncate">
            {file!.fileName} · {formatBytes(file!.fileSize)}
          </div>
        )}
      </div>
      {available ? (
        <DownloadButton storagePath={file!.storagePath} fileName={file!.fileName} />
      ) : (
        <span className="text-xs text-gray-400 italic shrink-0">Not uploaded</span>
      )}
    </div>
  );
}

type DownloadState = { key: string; url?: string; error?: string };

function DownloadButton({ storagePath, fileName }: { storagePath: string; fileName: string }) {
  const [state, setState] = useState<DownloadState>({ key: '' });

  useEffect(() => {
    let cancelled = false;
    getDownloadURL(storageRef(storage, storagePath))
      .then((u) => {
        if (!cancelled) setState({ key: storagePath, url: u });
      })
      .catch((err) => {
        if (!cancelled) setState({
          key: storagePath,
          error: err instanceof Error ? err.message : 'Unavailable',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [storagePath]);

  const isCurrent = state.key === storagePath;
  const url = isCurrent ? state.url : undefined;
  const error = isCurrent ? state.error : undefined;

  if (error) {
    return <span className="text-xs text-red-500 shrink-0">Error</span>;
  }
  if (!url) {
    return <span className="text-xs text-gray-400 shrink-0">Preparing…</span>;
  }
  return (
    <a
      href={url}
      download={fileName}
      target="_blank"
      rel="noopener noreferrer"
      className="px-3 py-1.5 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 shrink-0"
    >
      Download
    </a>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
