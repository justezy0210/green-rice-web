import {
  formatBlockRegion,
  type DiscoveryBlockGroup,
} from '@/lib/discovery-block-groups';
import type { BlockRegion } from '@/types/candidate-block';

const CURATED_LOCI: Record<string, { slug: string; label: string }> = {
  curated_shared_chr11_dev_block: {
    slug: 'chr11-21-25mb-development',
    label: 'Shared development locus',
  },
  curated_heading_shared_chr06: {
    slug: 'chr06-9-11mb-heading-culm',
    label: 'Heading / culm shared locus',
  },
  curated_blb_chr11_resistance_block: {
    slug: 'chr11-27-29mb-blb-resistance',
    label: 'BLB resistance locus',
  },
};

export function slugForDiscoveryBlockGroup(group: DiscoveryBlockGroup): string {
  const curated = CURATED_LOCI[group.blockId];
  if (curated) return curated.slug;
  return slugForRegion(group.region);
}

export function resolveDiscoveryLocusSlug(
  slug: string | null | undefined,
  groups: DiscoveryBlockGroup[],
): DiscoveryBlockGroup | null {
  if (!slug) return null;
  return groups.find((group) => slugForDiscoveryBlockGroup(group) === slug) ?? null;
}

export function displayNameForDiscoveryBlockGroup(group: DiscoveryBlockGroup): string {
  const curated = CURATED_LOCI[group.blockId];
  if (curated) return curated.label;
  const shared = group.traitIds.length > 1;
  const region = formatBlockRegion(group.region).replace(/^chr/, 'Chr ');
  return shared ? `${region} shared locus` : `${region} locus`;
}

function slugForRegion(region: BlockRegion): string {
  const chr = region.chr.toLowerCase();
  const start = formatSlugMb(region.start / 1_000_000);
  const end = formatSlugMb(Math.ceil(region.end / 1_000_000));
  return `${chr}-${start}-${end}mb`;
}

function formatSlugMb(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}
