import { Button } from '@/components/ui/button';
import type { DiffSortKey } from '@/lib/og-diff-filters';

interface Props {
  current: DiffSortKey;
  value: DiffSortKey;
  label: string;
  onClick: (k: DiffSortKey) => void;
}

export function OrthogroupDiffSortButton({ current, value, label, onClick }: Props) {
  const active = current === value;
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'outline'}
      size="xs"
      onClick={() => onClick(value)}
      aria-pressed={active}
      className={active ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800' : ''}
    >
      {label}
    </Button>
  );
}
