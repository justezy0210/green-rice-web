import { Card, CardContent } from '@/components/ui/card';

type ReadinessState = 'ready' | 'partial' | 'pending' | 'external';

interface ReadinessRow {
  label: string;
  state: ReadinessState;
  note: string;
}

const ROWS: ReadinessRow[] = [
  { label: 'Orthogroup matrix', state: 'ready', note: '16 cultivars · copy / PAV' },
  { label: 'Functional annotation', state: 'ready', note: 'Pfam · InterPro · GO' },
  { label: 'Anchor-locus variants', state: 'ready', note: '4067 clusters, SNP / indel / SV-like' },
  { label: 'Gene models', state: 'partial', note: '11 / 16 cultivars (funannotate ongoing)' },
  { label: 'SV genotype matrix', state: 'pending', note: 'VCF present, event normalization needed' },
  { label: 'OG × SV intersections', state: 'pending', note: 'Follows SV matrix' },
  { label: 'Expression (bulk RNA-seq)', state: 'pending', note: 'Binary expressed / not when data arrives' },
  { label: 'QTL / GWAS overlap', state: 'external', note: 'External DB integration deferred' },
];

const STATE_BADGE: Record<ReadinessState, string> = {
  ready: 'bg-green-50 text-green-700 border-green-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  pending: 'bg-gray-50 text-gray-500 border-gray-200',
  external: 'bg-blue-50 text-blue-700 border-blue-200',
};

const STATE_LABEL: Record<ReadinessState, string> = {
  ready: 'ready',
  partial: 'partial',
  pending: 'pending',
  external: 'external',
};

export function DataReadinessCard() {
  return (
    <Card>
      <CardContent className="py-4">
        <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
          Data readiness
        </h3>
        <ul className="divide-y divide-gray-100 text-[12px]">
          {ROWS.map((r) => (
            <li key={r.label} className="flex items-center justify-between py-1.5 gap-3">
              <span className="flex-1 min-w-0">
                <span className="font-medium text-gray-800">{r.label}</span>
                <span className="block text-[11px] text-gray-500 truncate">
                  {r.note}
                </span>
              </span>
              <span
                className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border ${STATE_BADGE[r.state]}`}
              >
                {STATE_LABEL[r.state]}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
