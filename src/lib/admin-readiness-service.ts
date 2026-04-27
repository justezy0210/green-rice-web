import { publicDownloadUrl } from '@/lib/download-urls';
import type {
  StorageArtifactDescriptor,
  StorageArtifactProbe,
} from '@/types/admin-readiness';

export async function probeStorageArtifacts(
  descriptors: readonly StorageArtifactDescriptor[],
): Promise<StorageArtifactProbe[]> {
  return Promise.all(descriptors.map(probeStorageArtifact));
}

async function probeStorageArtifact(
  descriptor: StorageArtifactDescriptor,
): Promise<StorageArtifactProbe> {
  try {
    const response = await fetch(publicDownloadUrl(descriptor.path), {
      method: 'HEAD',
      cache: 'no-store',
    });
    return {
      ...descriptor,
      status: response.ok ? 'ready' : response.status === 404 ? 'missing' : 'error',
      statusCode: response.status,
      error: response.ok ? null : response.statusText || `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      ...descriptor,
      status: 'error',
      statusCode: null,
      error: error instanceof Error ? error.message : 'probe failed',
    };
  }
}
