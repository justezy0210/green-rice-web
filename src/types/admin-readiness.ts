export type ReadinessStatus = 'ready' | 'partial' | 'missing' | 'loading' | 'error';

export interface StorageArtifactDescriptor {
  id: string;
  label: string;
  path: string;
}

export interface StorageArtifactProbe extends StorageArtifactDescriptor {
  status: Exclude<ReadinessStatus, 'partial' | 'loading'>;
  statusCode: number | null;
  error: string | null;
}

export interface AdminReadinessItem {
  id: string;
  label: string;
  surface: string;
  status: ReadinessStatus;
  detail: string;
  meta?: string;
  path?: string;
}

export interface AdminReadinessSection {
  id: string;
  title: string;
  description: string;
  items: AdminReadinessItem[];
}
