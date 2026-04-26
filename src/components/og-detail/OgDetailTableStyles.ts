import { cn } from '@/lib/utils';

type CellPosition = 'first' | 'middle' | 'last';

export const ogDetailTableClass = 'table-fixed border-separate border-spacing-y-1';
export const ogDetailTableHeaderClass = '[&_tr]:border-0';
export const ogDetailTableHeadRowClass =
  'border-0 text-[10px] uppercase tracking-wide text-gray-500 hover:bg-transparent [&_th]:text-gray-500';
export const ogDetailTableRowClass = 'group border-0 hover:bg-transparent';

export function ogDetailTableCellClass({
  position = 'middle',
  className,
}: {
  position?: CellPosition;
  className?: string;
} = {}) {
  return cn(
    'border-y border-gray-100 bg-white group-hover:bg-amber-50/50',
    position === 'first' && 'rounded-l-md border-l',
    position === 'last' && 'rounded-r-md border-r',
    className,
  );
}
