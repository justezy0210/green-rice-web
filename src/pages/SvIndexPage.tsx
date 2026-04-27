import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SvIndexRow } from '@/components/sv/SvIndexRow';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { OrthogroupDiffPagination } from '@/components/explore/OrthogroupDiffPagination';
import { useAllSvEvents, useSvManifest } from '@/hooks/useSvMatrix';
import {
  buildSvBrowseRows,
  compareSvChr,
  filterSvBrowseRows,
  type SvCarrierFilter,
  type SvSizeFilter,
} from '@/lib/sv-browse';
import { SV_RELEASE_ID } from '@/lib/releases';
import type { SvType } from '@/types/sv-event';

const PAGE_SIZE = 100;
const ALL_TYPE = 'all' as const;
const TYPE_OPTIONS: Array<[string, string]> = [['all', 'All types'], ['INS', 'INS'], ['DEL', 'DEL'], ['COMPLEX', 'COMPLEX']];
const SIZE_OPTIONS: Array<[SvSizeFilter, string]> = [
  ['all', 'All sizes'], ['50-99', '50-99 bp'], ['100-999', '100-999 bp'],
  ['1k-9k', '1-9.9 kb'], ['10k-plus', '10 kb+'],
];
const CARRIER_OPTIONS: Array<[SvCarrierFilter, string]> = [
  ['all', 'Any state'], ['any-alt', 'Has ALT'], ['private-alt', 'Private ALT'],
  ['shared-alt', 'Shared ALT'],
];
const emptyRows = [['all', 'All chr']] as Array<[string, string]>;

export function SvIndexPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const manifestState = useSvManifest(SV_RELEASE_ID);
  const manifest = manifestState.manifest;
  const chrList = useMemo(
    () => Object.keys(manifest?.chrCounts ?? {}).sort(compareSvChr),
    [manifest],
  );
  const allEvents = useAllSvEvents(SV_RELEASE_ID, chrList.length > 0 ? chrList : null);
  const [query, setQuery] = useState('');
  const type = readSvType(searchParams.get('type'));
  const [chr, setChr] = useState('all');
  const [size, setSize] = useState<SvSizeFilter>('all');
  const [carrier, setCarrier] = useState<SvCarrierFilter>('all');
  const [page, setPage] = useState(0);

  const rows = useMemo(
    () => buildSvBrowseRows(allEvents.eventsByChr, allEvents.samples),
    [allEvents.eventsByChr, allEvents.samples],
  );

  const filtered = useMemo(
    () => filterSvBrowseRows(rows, { query, type, chr, size, carrier }),
    [rows, query, type, chr, size, carrier],
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const resetPage = () => setPage(0);
  const setTypeFilter = (nextType: SvType | typeof ALL_TYPE) => {
    const next = new URLSearchParams(searchParams);
    if (nextType === ALL_TYPE) next.delete('type');
    else next.set('type', nextType);
    setSearchParams(next, { replace: true });
    resetPage();
  };

  return (
    <div className="space-y-4">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-gray-900">Structural Variants</h1>
        <p className="max-w-3xl text-sm leading-relaxed text-gray-600">
          Browse event-normalized SVs from the current pangenome matrix. Carrier counts are
          panel-scoped and are not marker-ready frequency estimates.
        </p>
        <SummaryLine
          items={[
            ['Release', manifest?.svReleaseId ?? SV_RELEASE_ID],
            ['Events', manifest ? manifest.eventCount.toLocaleString() : '...'],
            ['Samples', manifest ? `${manifest.sampleCount}` : '...'],
            ['Loaded', `${allEvents.loadedChrs}/${allEvents.totalChrs || chrList.length || 0} chr`],
          ]}
        />
      </header>

      <Card>
        <CardContent className="space-y-3 py-4">
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(220px,1fr)_120px_120px_130px_130px]">
            <label className="grid gap-1 text-[10px] uppercase tracking-wide text-gray-500">
              Search
              <span className="relative block h-8">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex w-8 items-center justify-center text-gray-400">
                  <Search className="size-4" aria-hidden />
                </span>
                <Input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    resetPage();
                  }}
                  placeholder="Search event ID, source ID, or chromosome"
                  className="pl-8"
                />
              </span>
            </label>
            <FilterSelect
              label="Type"
              value={type}
              onChange={(value) => {
                setTypeFilter(readSvType(value));
              }}
              options={TYPE_OPTIONS}
            />
            <FilterSelect
              label="Chr"
              value={chr}
              onChange={(value) => {
                setChr(value);
                resetPage();
              }}
              options={[...emptyRows, ...chrList.map((c) => [c, c] as [string, string])]}
            />
            <FilterSelect
              label="Size"
              value={size}
              onChange={(value) => {
                setSize(value as SvSizeFilter);
                resetPage();
              }}
              options={SIZE_OPTIONS}
            />
            <FilterSelect
              label="Carriers"
              value={carrier}
              onChange={(value) => {
                setCarrier(value as SvCarrierFilter);
                resetPage();
              }}
              options={CARRIER_OPTIONS}
            />
          </div>

          {manifestState.loading || allEvents.loading ? (
            <p className="text-sm text-gray-400">Loading SV matrix...</p>
          ) : !manifest ? (
            <p className="text-sm text-gray-500">SV matrix manifest is not available.</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 text-[11px] text-gray-500">
                <span>{filtered.length.toLocaleString()} / {rows.length.toLocaleString()} events</span>
                <span>{manifest.normalizationMethod}</span>
              </div>

              <div className="overflow-x-auto">
                <Table density="dense" className="min-w-[900px] table-fixed border-separate border-spacing-y-1">
                  <colgroup>
                    <col className="w-28" />
                    <col className="w-20" />
                    <col className="w-52" />
                    <col className="w-24" />
                    <col className="w-28" />
                    <col className="w-28" />
                    <col />
                  </colgroup>
                  <TableHeader className="[&_tr]:border-0">
                    <TableRow className="border-0 text-[10px] uppercase tracking-wide text-gray-500 hover:bg-transparent">
                      <TableHead className="pl-3 text-gray-500">SV</TableHead><TableHead className="text-gray-500">Type</TableHead>
                      <TableHead className="text-gray-500">Coordinate</TableHead><TableHead className="text-right text-gray-500">Size</TableHead>
                      <TableHead className="text-right text-gray-500">ALT carriers</TableHead><TableHead className="text-right text-gray-500">Missing</TableHead>
                      <TableHead className="text-gray-500">Source VCF ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((row) => (
                      <SvIndexRow key={row.event.eventId} row={row} sampleCount={allEvents.samples.length} />
                    ))}
                    {pageRows.length === 0 && (
                      <TableRow className="border-0 hover:bg-transparent">
                        <TableCell
                          colSpan={7}
                          className="rounded-md border border-gray-100 bg-white py-8 text-center text-sm text-gray-500"
                        >
                          No SV events match the current filters.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <OrthogroupDiffPagination
                page={safePage}
                pageSize={PAGE_SIZE}
                totalItems={filtered.length}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryLine({ items }: { items: Array<[string, string]> }) {
  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-1 border-y border-gray-100 py-2 text-xs">
      {items.map(([label, value]) => (
        <div key={label} className="flex items-baseline gap-1.5">
          <dt className="text-gray-500">{label}</dt>
          <dd className="font-mono text-gray-900">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function FilterSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="grid gap-1 text-[10px] uppercase tracking-wide text-gray-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-gray-200 bg-white px-2 text-sm normal-case tracking-normal text-gray-700 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}
function readSvType(value: string | null): SvType | typeof ALL_TYPE {
  return value === 'INS' || value === 'DEL' || value === 'COMPLEX' ? value : ALL_TYPE;
}
