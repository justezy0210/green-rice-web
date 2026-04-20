import { Link } from 'react-router-dom';

interface Card {
  key: string;
  title: string;
  summary: string;
  href: string | null;
  comingSoon?: boolean;
}

const CARDS: Card[] = [
  {
    key: 'genes',
    title: 'Genes',
    summary: 'Lookup by gene ID across panel cultivars, orthogroup membership.',
    href: '/genes',
  },
  {
    key: 'orthogroups',
    title: 'Orthogroups',
    summary: 'Copy-count matrix per cultivar, core / soft-core / shell / private, member gene list.',
    href: null,
    comingSoon: true,
  },
  {
    key: 'cultivars',
    title: 'Cultivars',
    summary: 'Per-cultivar assembly and annotation stats, phenotype profile.',
    href: '/cultivars',
  },
  {
    key: 'trait-association',
    title: 'Trait Association',
    summary: 'Orthogroups ranked by copy-count contrast between phenotype groups.',
    href: '/explore',
  },
];

export function EntityCardsGrid() {
  return (
    <section>
      <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
        Entry points
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {CARDS.map((c) => {
          const body = (
            <>
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{c.title}</h3>
                {c.key === 'trait-association' && (
                  <span className="text-[10px] uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                    beta
                  </span>
                )}
                {c.comingSoon && (
                  <span className="text-[10px] uppercase tracking-wide text-gray-400 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                    soon
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-snug">{c.summary}</p>
            </>
          );
          if (c.href) {
            return (
              <Link
                key={c.key}
                to={c.href}
                className="block rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 bg-white px-4 py-3 transition-colors"
              >
                {body}
              </Link>
            );
          }
          return (
            <div
              key={c.key}
              className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 cursor-not-allowed opacity-70"
              aria-disabled="true"
              title="Coming in Stage 2"
            >
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
