import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { PhenotypeRecord } from '@/types/phenotype';
import type { ComparisonGroup } from '@/types/common';
import { PHENOTYPE_FIELDS, getNumericValue } from '@/lib/utils';

interface TopDifferencesTableProps {
  groups: ComparisonGroup[];
  records: PhenotypeRecord[];
}

export function TopDifferencesTable({ groups, records }: TopDifferencesTableProps) {
  if (groups.length < 2) return null;

  const recordMap = Object.fromEntries(records.map((r) => [r.cultivar, r]));

  // Compute per-field mean difference between group 0 and group 1
  const fieldDiffs = PHENOTYPE_FIELDS.map((field) => {
    const means = groups.map((group) => {
      const vals = group.cultivars
        .map((c) => recordMap[c] ? getNumericValue(recordMap[c], field.key) : null)
        .filter((v): v is number => v !== null);
      return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    });
    const diff = means[0] !== null && means[1] !== null ? Math.abs(means[0] - means[1]) : null;
    return { field, means, diff };
  });

  const sorted = fieldDiffs
    .filter((d) => d.diff !== null)
    .sort((a, b) => (b.diff ?? 0) - (a.diff ?? 0))
    .slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top Trait Differences Between Groups</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Trait</TableHead>
              {groups.map((g) => (
                <TableHead key={g.name}>{g.name} Mean</TableHead>
              ))}
              <TableHead>Difference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map(({ field, means, diff }) => (
              <TableRow key={field.key}>
                <TableCell className="font-medium">
                  {field.label}
                  <span className="ml-1 text-xs text-gray-400">({field.unit})</span>
                </TableCell>
                {means.map((m, i) => (
                  <TableCell key={i}>{m !== null ? m.toFixed(2) : '-'}</TableCell>
                ))}
                <TableCell className="font-semibold text-orange-600">
                  {diff !== null ? diff.toFixed(2) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
