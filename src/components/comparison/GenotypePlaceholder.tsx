import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function GenotypePlaceholder() {
  return (
    <Card className="border-dashed border-2 border-gray-200 bg-gray-50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base text-gray-500">Genotype Comparison</CardTitle>
          <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-12 h-12 mb-3 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
            />
          </svg>
          <p className="font-medium text-sm">Genotype comparison results will appear here</p>
          <p className="text-xs mt-1 max-w-xs">
            SNP, marker, and gene-level annotation data will be displayed here once integrated.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
