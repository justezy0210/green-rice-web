import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { PhenotypeRecord } from '@/types/phenotype';
import type { ComparisonGroup } from '@/types/common';
import { PHENOTYPE_FIELDS, getNumericValue } from '@/lib/utils';

interface GroupConfigPanelProps {
  records: PhenotypeRecord[];
  onGroupsChange: (groups: ComparisonGroup[], groupByField: string) => void;
}

export function GroupConfigPanel({ records, onGroupsChange }: GroupConfigPanelProps) {
  const [groupByField, setGroupByField] = useState('earlyseason22');
  const [threshold, setThreshold] = useState(60);

  const handleChange = useCallback(
    (field: string, thr: number) => {
      const lowGroup: ComparisonGroup = { name: `< ${thr} days (early-maturing)`, cultivars: [] };
      const highGroup: ComparisonGroup = { name: `≥ ${thr} days (late-maturing)`, cultivars: [] };

      records.forEach((r) => {
        const val = getNumericValue(r, field);
        if (val === null) return;
        if (val < thr) lowGroup.cultivars.push(r.cultivar);
        else highGroup.cultivars.push(r.cultivar);
      });

      onGroupsChange([lowGroup, highGroup], field);
    },
    [records, onGroupsChange]
  );

  const handleFieldChange = (f: string) => {
    setGroupByField(f);
    handleChange(f, threshold);
  };

  const handleThresholdChange = (v: number) => {
    setThreshold(v);
    handleChange(groupByField, v);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Group Configuration</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Group by Trait</label>
          <Select value={groupByField} onValueChange={(v) => v && handleFieldChange(v)}>
            <SelectTrigger className="w-48 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PHENOTYPE_FIELDS.map((f) => (
                <SelectItem key={f.key} value={f.key}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Threshold</label>
          <Input
            type="number"
            value={threshold}
            onChange={(e) => handleThresholdChange(Number(e.target.value))}
            className="w-24 h-8 text-sm"
          />
        </div>
        <button
          className="h-8 px-3 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
          onClick={() => handleChange(groupByField, threshold)}
        >
          Apply
        </button>
      </CardContent>
    </Card>
  );
}
