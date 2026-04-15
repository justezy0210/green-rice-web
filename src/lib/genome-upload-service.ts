import { ref, uploadBytesResumable, type UploadTask } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';
import { emptyGenomeSummary } from '@/lib/genome-helpers';
import type { FileUploadStatus, GenomeSummary } from '@/types/genome';

export type GenomeFileType = 'genomeFasta' | 'geneGff3' | 'repeatGff';

const FILE_NAMES: Record<GenomeFileType, string> = {
  genomeFasta: 'genome.fasta',
  geneGff3: 'gene.gff3',
  repeatGff: 'repeat.out',
};

export interface UploadProgress {
  type: GenomeFileType;
  progress: number;
  state: 'running' | 'paused' | 'success' | 'error';
  error?: string;
}

export function uploadGenomeFile(
  cultivarId: string,
  fileType: GenomeFileType,
  file: File,
  onProgress: (p: UploadProgress) => void,
): UploadTask {
  const storagePath = `genomes/${cultivarId}/${FILE_NAMES[fileType]}`;
  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file);

  uploadTask.on(
    'state_changed',
    (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      onProgress({
        type: fileType,
        progress,
        state: snapshot.state === 'paused' ? 'paused' : 'running',
      });
    },
    (error) => {
      onProgress({ type: fileType, progress: 0, state: 'error', error: error.message });
    },
    async () => {
      onProgress({ type: fileType, progress: 100, state: 'success' });
      await updateFileStatus(cultivarId, fileType, {
        uploaded: true,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        storagePath,
      });
    },
  );

  return uploadTask;
}

async function updateFileStatus(
  cultivarId: string,
  fileType: GenomeFileType,
  status: FileUploadStatus,
) {
  try {
    const cultivarRef = doc(db, 'cultivars', cultivarId);
    await updateDoc(cultivarRef, {
      [`genomeSummary.files.${fileType}`]: status,
      'genomeSummary.status': 'pending',
      'genomeSummary.updatedAt': new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to update file status:', err);
    throw new Error('Failed to update file status.');
  }
}

export async function initGenomeSummaryIfNeeded(cultivarId: string, current?: GenomeSummary) {
  if (current) return;
  try {
    const cultivarRef = doc(db, 'cultivars', cultivarId);
    await updateDoc(cultivarRef, { genomeSummary: emptyGenomeSummary() });
  } catch (err) {
    console.error('Failed to initialize genome summary:', err);
    throw new Error('Failed to initialize genome summary.');
  }
}
