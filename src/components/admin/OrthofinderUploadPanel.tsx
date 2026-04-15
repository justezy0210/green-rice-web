import { useState } from 'react';
import { uploadOrthofinderFiles, type UploadProgress } from '@/lib/orthofinder-service';
import { useOrthofinderStatus } from '@/hooks/useOrthofinderStatus';
import { useAdminClaim } from '@/hooks/useAdminClaim';

export function OrthofinderUploadPanel() {
  const { isAdmin, loading: claimLoading } = useAdminClaim();
  const { state } = useOrthofinderStatus(isAdmin);

  const [geneCountFile, setGeneCountFile] = useState<File | null>(null);
  const [genesFile, setGenesFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUpload = isAdmin && geneCountFile && genesFile && !busy;

  async function handleUpload() {
    if (!geneCountFile || !genesFile) return;
    setBusy(true);
    setError(null);
    setProgress({ phase: 'uploading', percent: 0 });
    try {
      await uploadOrthofinderFiles(geneCountFile, genesFile, (p) => setProgress(p));
      setGeneCountFile(null);
      setGenesFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  if (claimLoading) {
    return <p className="text-sm text-gray-400">Checking admin status…</p>;
  }

  if (!isAdmin) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <p className="text-sm text-gray-600">
          OrthoFinder upload requires admin role. Contact project owner to grant the <code>admin</code> custom claim.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">OrthoFinder Results</h3>
        <StatusBadge status={state?.status ?? 'idle'} />
      </div>

      {state && state.activeVersion > 0 && (
        <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded">
          Active version: <strong>v{state.activeVersion}</strong> ·{' '}
          {state.totalOrthogroups.toLocaleString()} orthogroups ·{' '}
          {state.cultivarIds.length} cultivars ·{' '}
          uploaded {state.activeVersionUploadedAt ? new Date(state.activeVersionUploadedAt).toLocaleString() : '—'}
        </div>
      )}

      {state?.status === 'error' && state.errorMessage && (
        <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded">
          Error: {state.errorMessage}
        </div>
      )}

      <FileInput
        label="Orthogroups.GeneCount.tsv"
        file={geneCountFile}
        onChange={setGeneCountFile}
        disabled={busy}
      />
      <FileInput
        label="Orthogroups.tsv"
        file={genesFile}
        onChange={setGenesFile}
        disabled={busy}
      />

      {progress && (
        <div>
          <p className="text-xs text-gray-500 mb-1">
            {progress.phase === 'uploading' ? 'Uploading…' : 'Processing on server…'}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        onClick={handleUpload}
        disabled={!canUpload}
        className="px-4 py-2 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? 'Processing…' : 'Upload & Compute'}
      </button>
    </div>
  );
}

function FileInput({
  label,
  file,
  onChange,
  disabled,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <label className="text-gray-600">{label}</label>
        {file && (
          <span className="text-xs text-gray-400">
            {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
          </span>
        )}
      </div>
      <input
        type="file"
        accept=".tsv"
        disabled={disabled}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="block w-full text-xs text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
      />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    idle: 'bg-gray-100 text-gray-600',
    uploading: 'bg-amber-50 text-amber-700',
    processing: 'bg-amber-50 text-amber-700',
    complete: 'bg-green-50 text-green-700',
    error: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${cls[status] ?? cls.idle}`}>
      {status}
    </span>
  );
}
