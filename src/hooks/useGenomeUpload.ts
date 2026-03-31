import { useState, useCallback, useRef } from 'react';
import {
  uploadGenomeFile,
  initGenomeSummaryIfNeeded,
  type GenomeFileType,
  type UploadProgress,
} from '@/lib/genome-upload-service';
import type { GenomeSummary } from '@/types/genome';
import type { UploadTask } from 'firebase/storage';

interface FileSelection {
  genomeFasta: File | null;
  geneGff3: File | null;
  repeatGff: File | null;
}

export function useGenomeUpload(cultivarId: string, currentSummary?: GenomeSummary) {
  const [files, setFiles] = useState<FileSelection>({
    genomeFasta: null,
    geneGff3: null,
    repeatGff: null,
  });
  const [progress, setProgress] = useState<Record<GenomeFileType, UploadProgress | null>>({
    genomeFasta: null,
    geneGff3: null,
    repeatGff: null,
  });
  const [uploading, setUploading] = useState(false);
  const tasksRef = useRef<UploadTask[]>([]);

  const selectFile = useCallback((type: GenomeFileType, file: File | null) => {
    setFiles((prev) => ({ ...prev, [type]: file }));
  }, []);

  const uploadAll = useCallback(async () => {
    const entries = (Object.entries(files) as [GenomeFileType, File | null][]).filter(
      ([, f]) => f !== null,
    );
    if (entries.length === 0) return;

    setUploading(true);
    await initGenomeSummaryIfNeeded(cultivarId, currentSummary);

    const tasks = entries.map(([type, file]) =>
      uploadGenomeFile(cultivarId, type, file!, (p) => {
        setProgress((prev) => ({ ...prev, [type]: p }));
      }),
    );
    tasksRef.current = tasks;

    await Promise.allSettled(tasks.map((t) => new Promise<void>((resolve, reject) => {
      t.on('state_changed', null, reject, () => resolve());
    })));

    setUploading(false);
  }, [files, cultivarId, currentSummary]);

  const isComplete = (type: GenomeFileType) =>
    progress[type]?.state === 'success' ||
    currentSummary?.files[type]?.uploaded === true;

  return { files, selectFile, progress, uploading, uploadAll, isComplete };
}
