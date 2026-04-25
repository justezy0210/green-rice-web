import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { CultivarDoc } from '@/types/cultivar';

interface Props {
  cultivars: (CultivarDoc & { id: string })[];
  onEdit: (cultivar: CultivarDoc & { id: string }) => void;
  onDelete: (id: string) => void;
}

export function CultivarTable({ cultivars, onEdit, onDelete }: Props) {
  if (cultivars.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8">No cultivars found.</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="text-gray-500">
          <TableHead>Name</TableHead>
          <TableHead>Heading (E/N/L)</TableHead>
          <TableHead>Culm</TableHead>
          <TableHead>Panicle L.</TableHead>
          <TableHead>Grain Wt.</TableHead>
          <TableHead>BLB</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cultivars.map((c) => {
          const blb = c.resistance.bacterialLeafBlight;
          const blbCount = [blb.k1, blb.k2, blb.k3, blb.k3a].filter(Boolean).length;
          return (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell className="tabular-nums">
                {fmt(c.daysToHeading.early)} / {fmt(c.daysToHeading.normal)} / {fmt(c.daysToHeading.late)}
              </TableCell>
              <TableCell className="tabular-nums">{fmt(c.morphology.culmLength)}</TableCell>
              <TableCell className="tabular-nums">{fmt(c.morphology.panicleLength)}</TableCell>
              <TableCell className="tabular-nums">{fmt(c.quality.grainWeight)}</TableCell>
              <TableCell className="tabular-nums">{blbCount}/4</TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => onEdit(c)}
                  className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="xs"
                  onClick={() => {
                    if (confirm(`Delete "${c.name}"?`)) onDelete(c.id);
                  }}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function fmt(v: number | null): string {
  return v != null ? String(v) : '–';
}
