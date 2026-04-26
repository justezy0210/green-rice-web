import { Card, CardContent } from '@/components/ui/card';
import type { CandidateBlock } from '@/types/candidate-block';

export function LocusCuratorNotes({ block }: { block: CandidateBlock }) {
  if (!block.curated && !block.summaryMarkdown && !block.curationNote) return null;

  const summary = extractSummary(block.summaryMarkdown) ?? block.curationNote;
  if (!summary) return null;

  return (
    <Card>
      <CardContent className="py-4">
        <h3 className="mb-2 text-xs uppercase tracking-wide text-gray-500">
          Curator notes
        </h3>
        <p className="text-[13px] leading-relaxed text-gray-700">{summary}</p>
        {block.summaryMarkdown && block.summaryMarkdown !== summary && (
          <details className="mt-3 text-[11px] text-gray-500">
            <summary className="cursor-pointer text-green-700">Source note</summary>
            <pre className="mt-2 whitespace-pre-wrap rounded border border-gray-100 bg-gray-50 p-2 font-mono text-[11px] leading-snug text-gray-600">
              {block.summaryMarkdown}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

function extractSummary(markdown: string | null): string | null {
  if (!markdown) return null;
  const lines = markdown
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith('#'));
  return lines[0] ?? null;
}
