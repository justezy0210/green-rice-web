import type { OgVariantSummary, RegionData } from '@/types/orthogroup';

export function toOgVariantSummary(r: RegionData): OgVariantSummary | null {
  if (!r.alleleFrequency) {
    return r.liftover.irgspRegion
      ? {
          geneRegions: [
            {
              geneId: `${r.anchor.cultivar}_cluster`,
              chr: r.liftover.irgspRegion.chr,
              start: r.liftover.irgspRegion.start,
              end: r.liftover.irgspRegion.end,
            },
          ],
          totalVariants: 0,
          variants: [],
        }
      : null;
  }
  const variants = r.alleleFrequency.variants;
  return {
    geneRegions: r.liftover.irgspRegion
      ? [
          {
            geneId: `${r.anchor.cultivar}_cluster`,
            chr: r.liftover.irgspRegion.chr,
            start: r.liftover.irgspRegion.start,
            end: r.liftover.irgspRegion.end,
          },
        ]
      : [],
    totalVariants: variants.length,
    // Default to genomic position (chr then pos). ΔAF ordering was removed
    // to prevent reading AF as a ranking axis — it is supporting evidence only.
    variants: [...variants].sort((a, b) => {
      if (a.chr !== b.chr) return a.chr.localeCompare(b.chr);
      return a.pos - b.pos;
    }),
  };
}
