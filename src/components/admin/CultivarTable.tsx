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
    <Table density="dense" className="table-fixed border-separate border-spacing-y-1">
      <colgroup>
        <col className="w-40" />
        <col className="w-36" />
        <col className="w-20" />
        <col className="w-24" />
        <col className="w-24" />
        <col className="w-16" />
        <col className="w-32" />
      </colgroup>
      <TableHeader className="[&_tr]:border-0">
        <TableRow className="border-0 text-[10px] uppercase tracking-wide text-gray-500 hover:bg-transparent [&_th]:text-gray-500">
          <TableHead className="pl-3">Name</TableHead>
          <TableHead className="px-3">Heading (E/N/L)</TableHead>
          <TableHead className="px-3">Culm</TableHead>
          <TableHead className="px-3">Panicle L.</TableHead>
          <TableHead className="px-3">Grain Wt.</TableHead>
          <TableHead className="px-3">BLB</TableHead>
          <TableHead className="pl-3 pr-4 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cultivars.map((c) => {
          const blb = c.resistance.bacterialLeafBlight;
          const blbCount = [blb.k1, blb.k2, blb.k3, blb.k3a].filter(Boolean).length;
          return (
            <TableRow key={c.id} className="group border-0 hover:bg-transparent">
              <TableCell className="rounded-l-md border-y border-l border-gray-100 bg-white pl-3 font-medium text-gray-900 group-hover:bg-amber-50/50">
                {c.name}
              </TableCell>
              <TableCell className="border-y border-gray-100 bg-white px-3 tabular-nums text-gray-700 group-hover:bg-amber-50/50">
                {fmt(c.daysToHeading.early)} / {fmt(c.daysToHeading.normal)} / {fmt(c.daysToHeading.late)}
              </TableCell>
              <TableCell className="border-y border-gray-100 bg-white px-3 tabular-nums text-gray-700 group-hover:bg-amber-50/50">
                {fmt(c.morphology.culmLength)}
              </TableCell>
              <TableCell className="border-y border-gray-100 bg-white px-3 tabular-nums text-gray-700 group-hover:bg-amber-50/50">
                {fmt(c.morphology.panicleLength)}
              </TableCell>
              <TableCell className="border-y border-gray-100 bg-white px-3 tabular-nums text-gray-700 group-hover:bg-amber-50/50">
                {fmt(c.quality.grainWeight)}
              </TableCell>
              <TableCell className="border-y border-gray-100 bg-white px-3 tabular-nums text-gray-700 group-hover:bg-amber-50/50">
                {blbCount}/4
              </TableCell>
              <TableCell className="rounded-r-md border-y border-r border-gray-100 bg-white pl-3 pr-4 text-right group-hover:bg-amber-50/50">
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
