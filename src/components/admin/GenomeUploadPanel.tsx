import { useGenomeUpload, } from '@/hooks/useGenomeUpload';
import type { GenomeFileType } from '@/lib/genome-upload-service';
import type { GenomeSummary } from '@/types/genome';

const FILE_LABELS: Record<GenomeFileType, { label: string; accept: string }> = {
  genomeFasta: { label: 'Genome FASTA', accept: '.fasta,.fa,.fna' },
  geneGff3: { label: 'Gene GFF3', accept: '.gff3,.gff' },
  repeatGff: { label: 'Repeat (.out)', accept: '.out' },
};

interface Props {
  cultivarId: string;
  genomeSummary?: GenomeSummary;
}

export function GenomeUploadPanel({ cultivarId, genomeSummary }: Props) {
  const { files, selectFile, progress, uploading, uploadAll, isComplete } =
    useGenomeUpload(cultivarId, genomeSummary);

  const status = genomeSummary?.status;
  const hasFiles = Object.values(files).some((f) => f !== null);

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">Genome Files</h3>

      {status === 'processing' && (
        <div className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded">
          Parsing in progress...
        </div>
      )}
      {status === 'complete' && (
        <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded">
          Parsing complete
        </div>
      )}
      {status === 'error' && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
          Error: {genomeSummary?.errorMessage ?? 'Unknown error'}
        </div>
      )}

      <div className="space-y-3">
        {(Object.keys(FILE_LABELS) as GenomeFileType[]).map((type) => {
          const { label, accept } = FILE_LABELS[type];
          const p = progress[type];
          const complete = isComplete(type);
          const existing = genomeSummary?.files[type];

          return (
            <div key={type} className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-600">{label}</label>
                {complete && <span className="text-xs text-green-600">Uploaded</span>}
              </div>

              {existing?.uploaded && !files[type] && (
                <p className="text-xs text-gray-400">
                  {existing.fileName} ({(existing.fileSize / 1024 / 1024).toFixed(1)} MB)
                </p>
              )}

              <input
                type="file"
                accept={accept}
                disabled={uploading}
                onChange={(e) => selectFile(type, e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />

              {p && p.state === 'running' && (
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              )}
              {p?.state === 'error' && (
                <p className="text-xs text-red-500">{p.error}</p>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={uploadAll}
        disabled={uploading || !hasFiles}
        className="px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? 'Uploading...' : 'Upload Selected Files'}
      </button>
    </div>
  );
}
