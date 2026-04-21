import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

export function StartAnalysisCard() {
  return (
    <Card>
      <CardContent className="py-4">
        <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-2">
          Start an analysis
        </h3>
        <p className="text-sm text-gray-700 leading-snug">
          Walk the 5-step candidate-discovery workflow: phenotype grouping →
          orthogroups → variants → intersections → ranked candidates.
        </p>
        <p className="text-[11px] text-gray-500 mt-2 leading-snug">
          Phase 1 is information architecture only. Step contents and recent
          runs appear here after Phase 2.
        </p>
        <div className="mt-3">
          <Link
            to="/analysis"
            className="inline-block text-xs font-medium px-3 py-1.5 rounded border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
          >
            Open Analysis →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
