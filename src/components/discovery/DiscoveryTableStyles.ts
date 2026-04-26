import { cn } from '@/lib/utils';

type CellPosition = 'first' | 'middle' | 'last';
type CellTone = 'default' | 'active';

export const discoveryTableClass = 'table-fixed border-separate border-spacing-y-1';
export const discoveryTableHeaderClass = '[&_tr]:border-0';
export const discoveryTableHeadRowClass =
  'border-0 text-[10px] uppercase tracking-wide text-gray-500 hover:bg-transparent [&_th]:text-gray-500';
export const discoveryTableRowClass = 'group border-0 hover:bg-transparent';

export function discoveryTableCellClass({
  position = 'middle',
  tone = 'default',
  className,
}: {
  position?: CellPosition;
  tone?: CellTone;
  className?: string;
} = {}) {
  return cn(
    'border-y',
    position === 'first' && 'rounded-l-md border-l',
    position === 'last' && 'rounded-r-md border-r',
    tone === 'active'
      ? 'border-green-100 bg-green-50/80 group-hover:bg-green-50'
      : 'border-gray-100 bg-white group-hover:bg-amber-50/50',
    className,
  );
}
