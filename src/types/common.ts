export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface FilterOptions {
  cultivarSearch: string;
  selectedFields: string[];
  category?: string;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}
