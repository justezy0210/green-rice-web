import { IRGSP_DISPLAY_NAME } from '@/lib/irgsp-constants';
import type { OrthogroupRepresentative } from '@/types/orthogroup';

interface Props {
  rep: OrthogroupRepresentative;
}

export function OgDrawerIrgspSection({ rep }: Props) {
  const transcripts = rep.transcripts ?? [];
  if (transcripts.length === 0 && Object.keys(rep.descriptions ?? {}).length === 0) {
    return null;
  }

  // Build display list: walk transcripts in order, include descriptions even if "NA".
  // Also include any description-only entries that didn't appear in transcripts.
  const displayed = new Set<string>();
  const items: { transcript: string; description: string }[] = [];
  for (const tid of transcripts) {
    items.push({ transcript: tid, description: rep.descriptions?.[tid] ?? 'NA' });
    displayed.add(tid);
  }
  for (const [tid, desc] of Object.entries(rep.descriptions ?? {})) {
    if (!displayed.has(tid)) items.push({ transcript: tid, description: desc });
  }

  return (
    <section className="border-b border-gray-100 px-4 py-3 text-xs">
      <h3 className="font-medium text-gray-500 uppercase tracking-wide mb-2">
        {IRGSP_DISPLAY_NAME} reference
      </h3>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.transcript} className="flex gap-2">
            <span className="font-mono text-gray-900 shrink-0">{it.transcript}</span>
            <span className="text-gray-400">—</span>
            <span className={it.description === 'NA' ? 'text-gray-400 italic' : 'text-gray-700'}>
              {it.description}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
