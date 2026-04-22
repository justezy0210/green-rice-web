import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { GenomeSummary } from '@/types/genome';

interface Props {
  cultivarId: string;
  genomeSummary: GenomeSummary | undefined;
}

function fmtMb(bp: number): string {
  return `${(bp / 1_000_000).toFixed(1)} Mb`;
}

function chrSortKey(name: string): [number, string] {
  // "chr01" → (1, "chr01"); "chrUn" → (9999, "chrUn")
  const m = name.match(/(\d+)/);
  return [m ? parseInt(m[1], 10) : 9999, name];
}

export function ChromosomeBrowseCard({ cultivarId, genomeSummary }: Props) {
  if (!genomeSummary || genomeSummary.status !== 'complete') return null;
  const lengths = genomeSummary.assembly.chromosomeLengths ?? {};
  const allEntries = Object.entries(lengths).sort((a, b) => {
    const ka = chrSortKey(a[0]);
    const kb = chrSortKey(b[0]);
    return ka[0] - kb[0] || a[0].localeCompare(b[0]);
  });
  // Rice has 12 canonical chromosomes; unplaced contigs and scaffolds
  // (contig_*, scaffold_*, chrUn, chr13+, etc.) are not useful for gene /
  // OG browsing, so we cap the card at chr1-chr12 (matching only the
  // `chr` prefix — "contig_12" must NOT pass) and surface the hidden
  // count as a note.
  const CHR_PATTERN = /^chr(0?[1-9]|1[0-2])$/i;
  const entries = allEntries.filter(([name]) => CHR_PATTERN.test(name));
  const hiddenCount = allEntries.length - entries.length;
  if (entries.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          Chromosomes
          <span className="ml-2 text-xs font-normal text-gray-500">
            click to browse genes and OG clusters on that chromosome
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 text-sm">
          {entries.map(([chr, len]) => (
            <li key={chr}>
              <Link
                to={`/region/${encodeURIComponent(cultivarId)}/${encodeURIComponent(chr)}/0-${len}`}
                className="block rounded border border-gray-200 bg-white hover:border-green-300 hover:bg-green-50 px-3 py-1.5 transition-colors"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-gray-900">{chr}</span>
                  <span className="text-[11px] text-gray-500 tabular-nums">
                    {fmtMb(len)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {hiddenCount > 0 && (
          <p className="mt-2 text-[11px] text-gray-400">
            {hiddenCount} unplaced contig{hiddenCount === 1 ? '' : 's'} /
            scaffold{hiddenCount === 1 ? '' : 's'} hidden (rice has 12 canonical chromosomes).
          </p>
        )}
      </CardContent>
    </Card>
  );
}
