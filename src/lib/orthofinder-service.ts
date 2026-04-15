import { ref, uploadBytesResumable } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { storage, functions } from '@/lib/firebase';

const GENE_COUNT_FILE = 'Orthogroups.GeneCount.tsv';
const GENES_FILE = 'Orthogroups.tsv';

export interface UploadProgress {
  phase: 'uploading' | 'processing';
  percent: number;
}

type StartProcessingInput = { uploadId: string };
type StartProcessingOutput = {
  version: number;
  totalOrthogroups: number;
  cultivarIds: string[];
};

export async function uploadOrthofinderFiles(
  geneCountFile: File,
  genesFile: File,
  onProgress: (p: UploadProgress) => void,
): Promise<StartProcessingOutput> {
  const uploadId = crypto.randomUUID();

  onProgress({ phase: 'uploading', percent: 0 });

  try {
    await Promise.all([
      resumableUpload(`orthofinder/staging/${uploadId}/${GENE_COUNT_FILE}`, geneCountFile, (pct) => {
        onProgress({ phase: 'uploading', percent: pct * 0.5 });
      }),
      resumableUpload(`orthofinder/staging/${uploadId}/${GENES_FILE}`, genesFile, (pct) => {
        onProgress({ phase: 'uploading', percent: 50 + pct * 0.5 });
      }),
    ]);

    onProgress({ phase: 'processing', percent: 0 });

    const callable = httpsCallable<StartProcessingInput, StartProcessingOutput>(
      functions,
      'start_orthofinder_processing',
      { timeout: 540000 }, // 9 min (matches server function timeout ceiling)
    );

    try {
      const result = await callable({ uploadId });
      onProgress({ phase: 'processing', percent: 100 });
      return result.data;
    } catch (err) {
      // Deadline-exceeded means the client gave up waiting, but the server Function
      // is still running. State subscription (_orthofinder_meta/state) will reflect
      // completion. Don't surface this as an error.
      if (isDeadlineExceeded(err)) {
        onProgress({ phase: 'processing', percent: 100 });
        return { version: -1, totalOrthogroups: 0, cultivarIds: [] };
      }
      throw err;
    }
  } catch (err) {
    console.error('Orthofinder upload failed:', err);
    throw err instanceof Error ? err : new Error('Upload failed');
  }
}

function isDeadlineExceeded(err: unknown): boolean {
  if (err && typeof err === 'object' && 'code' in err) {
    return (err as { code: string }).code === 'functions/deadline-exceeded';
  }
  return false;
}

function resumableUpload(
  path: string,
  file: File,
  onPercent: (pct: number) => void,
): Promise<void> {
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file);
  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => onPercent((snap.bytesTransferred / snap.totalBytes) * 100),
      (err) => reject(err),
      () => resolve(),
    );
  });
}
