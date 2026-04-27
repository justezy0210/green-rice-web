import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

const LINKS = [
  ['/cultivars', 'Cultivars'],
  ['/genes', 'Genes'],
  ['/og', 'Orthogroups'],
  ['/pangenome', 'Pangenome'],
  ['/sv', 'Structural Variants'],
  ['/discovery', 'Discovery'],
];

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <Card>
        <CardContent className="space-y-4 py-8 text-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              404
            </p>
            <h1 className="mt-1 text-xl font-semibold text-gray-900">
              Page not found
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              This route is not part of the current Green Rice DB public structure.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              to="/"
              className="rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-800 hover:bg-green-100"
            >
              Overview
            </Link>
            {LINKS.map(([href, label]) => (
              <Link
                key={href}
                to={href}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                {label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
