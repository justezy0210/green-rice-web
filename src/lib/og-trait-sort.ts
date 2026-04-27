import type { TraitId } from '@/types/traits';

interface TraitHitLike {
  t: string;
  p: number;
}

interface TraitHitsIndexLike {
  hits: Record<string, TraitHitLike[]>;
}

export function traitPValues(
  index: TraitHitsIndexLike | null,
  trait: TraitId,
): Map<string, number> | null {
  if (!index) return null;
  const values = new Map<string, number>();
  for (const [ogId, hits] of Object.entries(index.hits)) {
    const hit = hits.find((h) => h.t === trait);
    if (hit) values.set(ogId, hit.p);
  }
  return values;
}
