import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { PhenotypeRecord } from '@/types/phenotype';
import type { SortConfig } from '@/types/common';
import { PHENOTYPE_FIELDS, getNumericValue } from '@/lib/utils';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

interface PhenotypeTableProps {
  records: PhenotypeRecord[];
  search: string;
  visibleFields: string[];
}

export function PhenotypeTable({ records, search, visibleFields }: PhenotypeTableProps) {
  const [sort, setSort] = useState<SortConfig>({ field: 'cultivar', direction: 'asc' });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const fields = PHENOTYPE_FIELDS.filter((f) => visibleFields.includes(f.key));

  const filtered = useMemo(
    () => records.filter((r) => r.cultivar.toLowerCase().includes(search.toLowerCase())),
    [records, search]
  );

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dir = sort.direction === 'asc' ? 1 : -1;
      if (sort.field === 'cultivar') {
        return a.cultivar.localeCompare(b.cultivar) * dir;
      }
      const av = getNumericValue(a, sort.field) ?? -Infinity;
      const bv = getNumericValue(b, sort.field) ?? -Infinity;
      return (av - bv) * dir;
    });
  }, [filtered, sort]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const pageData = sorted.slice(page * pageSize, (page + 1) * pageSize);

  function toggleSort(field: string) {
    setSort((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { field, direction: 'asc' }
    );
    setPage(0);
  }

  function SortIcon({ field }: { field: string }) {
    if (sort.field !== field) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1 text-green-600">{sort.direction === 'asc' ? '↑' : '↓'}</span>;
  }

  return (
    <div className="space-y-2">
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none sticky left-0 bg-white min-w-32"
                onClick={() => toggleSort('cultivar')}
              >
                Cultivar <SortIcon field="cultivar" />
              </TableHead>
              {fields.map((f) => (
                <TableHead
                  key={f.key}
                  className="cursor-pointer select-none whitespace-nowrap"
                  onClick={() => toggleSort(f.key)}
                >
                  {f.label}
                  <span className="text-xs text-gray-400 ml-0.5">({f.unit})</span>
                  <SortIcon field={f.key} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageData.map((record) => (
              <TableRow key={record.cultivar} className="hover:bg-green-50">
                <TableCell className="font-medium sticky left-0 bg-white">{record.cultivar}</TableCell>
                {fields.map((f) => {
                  const val = getNumericValue(record, f.key);
                  return (
                    <TableCell key={f.key} className="text-right">
                      {val !== null ? val.toFixed(1) : <span className="text-gray-300">-</span>}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            {pageData.length === 0 && (
              <TableRow>
                <TableCell colSpan={fields.length + 1} className="text-center text-gray-400 py-8">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <span>Per page</span>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
            className="border rounded px-1 py-0.5 text-sm"
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span>rows · {filtered.length} cultivars total</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-100"
          >
            ←
          </button>
          <span className="px-2">{page + 1} / {totalPages || 1}</span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="px-2 py-1 rounded border disabled:opacity-40 hover:bg-gray-100"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
