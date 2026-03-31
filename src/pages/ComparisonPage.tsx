import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePhenotypeData } from '@/hooks/usePhenotypeData';
import { GroupConfigPanel } from '@/components/comparison/GroupConfigPanel';
import { ComparisonStatsCards } from '@/components/comparison/ComparisonStatsCards';
import { GroupComparisonChart } from '@/components/comparison/GroupComparisonChart';
import { TopDifferencesTable } from '@/components/comparison/TopDifferencesTable';
import { GenotypePlaceholder } from '@/components/comparison/GenotypePlaceholder';
import type { ComparisonGroup } from '@/types/common';
import { PHENOTYPE_FIELDS } from '@/lib/utils';

export function ComparisonPage() {
  const { records, loading, error } = usePhenotypeData();
  const [targetField, setTargetField] = useState(PHENOTYPE_FIELDS[5].key); // culmLength
  const [groups, setGroups] = useState<ComparisonGroup[]>([]);

  useEffect(() => {
    if (records.length > 0) {
      // default: split by early < 60 / >= 60
      const lowGroup: ComparisonGroup = { name: '< 60 days (early-maturing)', cultivars: [] };
      const highGroup: ComparisonGroup = { name: '≥ 60 days (late-maturing)', cultivars: [] };
      records.forEach((r) => {
        const v = r.daysToHeading.early;
        if (v === null) return;
        if (v < 60) lowGroup.cultivars.push(r.cultivar);
        else highGroup.cultivars.push(r.cultivar);
      });
      setGroups([lowGroup, highGroup]);
    }
  }, [records]);

  if (loading === 'loading') {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-64 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Phenotype Comparison</h1>
        <p className="text-sm text-gray-500 mt-1">Analyze phenotype differences between groups</p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Target Trait</label>
          <Select value={targetField} onValueChange={(v) => v && setTargetField(v)}>
            <SelectTrigger className="w-52 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHENOTYPE_FIELDS.map((f) => (
                <SelectItem key={f.key} value={f.key}>
                  {f.label} ({f.unit})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <GroupConfigPanel
        records={records}
        onGroupsChange={(g) => setGroups(g)}
      />

      {groups.length >= 2 && (
        <>
          <ComparisonStatsCards groups={groups} targetField={targetField} records={records} />
          <GroupComparisonChart groups={groups} targetField={targetField} records={records} />
          <TopDifferencesTable groups={groups} records={records} />
        </>
      )}

      <GenotypePlaceholder />
    </div>
  );
}
