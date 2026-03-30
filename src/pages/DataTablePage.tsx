import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePhenotypeData } from '@/hooks/usePhenotypeData';
import { PhenotypeTable } from '@/components/data-table/PhenotypeTable';
import { ColumnVisibilityToggle } from '@/components/data-table/ColumnVisibilityToggle';
import { DownloadButton } from '@/components/data-table/DownloadButton';
import { PHENOTYPE_FIELDS } from '@/lib/utils';

export function DataTablePage() {
  const { records, loading, error } = usePhenotypeData();
  const [search, setSearch] = useState('');
  const [visibleFields, setVisibleFields] = useState<string[]>(PHENOTYPE_FIELDS.map((f) => f.key));

  const filteredRecords = records.filter((r) =>
    r.cultivar.toLowerCase().includes(search.toLowerCase())
  );

  if (loading === 'loading') {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Table</h1>
        <p className="text-sm text-gray-500 mt-1">Browse and download cultivar phenotype data</p>
      </div>

      <Tabs defaultValue="phenotype">
        <TabsList>
          <TabsTrigger value="phenotype">Phenotype</TabsTrigger>
          <TabsTrigger value="genotype" disabled>
            Genotype <Badge variant="secondary" className="ml-1 text-xs">Coming Soon</Badge>
          </TabsTrigger>
          <TabsTrigger value="metadata" disabled>
            Metadata <Badge variant="secondary" className="ml-1 text-xs">Coming Soon</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="phenotype" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search cultivar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs h-8 text-sm"
            />
            <ColumnVisibilityToggle visibleFields={visibleFields} onChange={setVisibleFields} />
            <DownloadButton records={filteredRecords} filename="rice_phenotype" />
            <span className="text-xs text-gray-400">{filteredRecords.length} cultivars</span>
          </div>
          <PhenotypeTable
            records={filteredRecords}
            search=""
            visibleFields={visibleFields}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
