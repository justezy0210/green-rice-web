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
    summary: 'Conservation tiers (universal / common / rare PAV / private) + trait-discriminating OGs across the panel.',
    href: '/og',
  },
  {
    key: 'cultivars',
    title: 'Cultivars',
    summary: 'Per-cultivar assembly and annotation stats, phenotype profile.',
    href: '/cultivars',
  },
  {
    key: 'analysis',
    title: 'Analysis',
    summary: '5-step candidate-discovery workflow over the 16-cultivar panel.',
    href: '/analysis',
  },
];

export function EntityCardsGrid() {
  return (
    <section className="h-full flex flex-col">
      <div className="flex-1 flex flex-col gap-2 min-h-0">
        {CARDS.map((c) => {
          const body = (
            <>
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{c.title}</h3>
                {c.key === 'analysis' && (
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
          const cardCls = 'flex-1 flex flex-col justify-center rounded-lg border px-4 py-3 transition-colors';
          if (c.href) {
            return (
              <Link
                key={c.key}
                to={c.href}
                className={`${cardCls} border-gray-200 hover:border-green-300 hover:bg-green-50 bg-white`}
              >
                {body}
              </Link>
            );
          }
          return (
            <div
              key={c.key}
              className={`${cardCls} border-gray-200 bg-gray-50 cursor-not-allowed opacity-70`}
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
