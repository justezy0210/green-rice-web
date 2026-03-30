export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface FilterOptions {
  cultivarSearch: string;
  selectedFields: string[];
  category?: string;
}

export interface ComparisonConfig {
  targetField: string;
  groupByField: string;
  groups: ComparisonGroup[];
}

export interface ComparisonGroup {
  name: string;
  cultivars: string[];
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
