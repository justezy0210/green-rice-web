interface Props {
  page: number;            // 0-indexed
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function OrthogroupDiffPagination({ page, pageSize, totalItems, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  const first = page * pageSize + 1;
  const last = Math.min((page + 1) * pageSize, totalItems);

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  // Compact window: first, prev-2, current, next-2, last
  const pages = buildPageWindow(page, totalPages);

  return (
    <nav
      aria-label="Orthogroup results pagination"
      className="flex items-center justify-between gap-2 text-xs text-gray-600"
    >
      <span className="tabular-nums">
        {first.toLocaleString()}–{last.toLocaleString()} of {totalItems.toLocaleString()}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => canPrev && onPageChange(page - 1)}
          disabled={!canPrev}
          className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Prev
        </button>
        {pages.map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="px-1 text-gray-400">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`min-w-[2rem] px-2 py-1 rounded border tabular-nums ${
                p === page
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              {p + 1}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => canNext && onPageChange(page + 1)}
          disabled={!canNext}
          className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </nav>
  );
}

function buildPageWindow(page: number, totalPages: number): (number | null)[] {
  const out: (number | null)[] = [];
  const push = (n: number) => {
    if (n < 0 || n >= totalPages) return;
    if (out[out.length - 1] === n) return;
    out.push(n);
  };
  const pushGap = () => {
    if (out[out.length - 1] !== null) out.push(null);
  };

  push(0);
  if (page - 2 > 1) pushGap();
  for (let p = Math.max(1, page - 1); p <= Math.min(totalPages - 2, page + 1); p++) push(p);
  if (page + 2 < totalPages - 2) pushGap();
  push(totalPages - 1);
  return out;
}
