type PaginationItem = number | 'ellipsis';

interface Props {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  onPage: (page: number) => void;
}

export function NumberedPagination({
  page,
  totalPages,
  onPrevious,
  onNext,
  onPage,
}: Props) {
  const items = paginationItems(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
      <span className="text-xs text-gray-500">
        Page {page} of {totalPages}
      </span>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className={pageButtonClass(false)}
          disabled={page <= 1}
          onClick={onPrevious}
        >
          Previous
        </button>
        {items.map((item, index) =>
          item === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="px-2 py-1.5 text-xs text-gray-400"
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={pageButtonClass(item === page)}
              onClick={() => onPage(item)}
            >
              {item}
            </button>
          ),
        )}
        <button
          type="button"
          className={pageButtonClass(false)}
          disabled={page >= totalPages}
          onClick={onNext}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function paginationItems(page: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  const sorted = Array.from(pages)
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);

  const items: PaginationItem[] = [];
  for (const value of sorted) {
    const previous = items.at(-1);
    if (typeof previous === 'number' && value - previous > 1) {
      items.push('ellipsis');
    }
    items.push(value);
  }
  return items;
}

function pageButtonClass(active: boolean): string {
  const base = 'rounded border px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed';
  if (active) return `${base} border-green-600 bg-green-600 text-white`;
  return `${base} border-gray-200 text-green-700 hover:bg-green-50 disabled:text-gray-300 disabled:hover:bg-white`;
}
