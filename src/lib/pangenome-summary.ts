import type { OgCategoriesData } from '@/lib/orthogroup-service';
import { getCategoryById, type CategoryId } from '@/lib/og-functional-categories';
import type { ConservationTier } from '@/lib/og-conservation';
import type { OgIndexBundle, OgIndexRow } from '@/lib/og-index-service';

export interface TierSummaryRow {
  tier: ConservationTier;
  label: string;
  description: string;
  count: number;
}

export interface FunctionalSummaryRow {
  id: CategoryId;
  label: string;
  color: string;
  count: number;
  variableCount: number;
}

export interface PangenomeOgSummary {
  totalOgs: number;
  panelTotalCount: number;
  tierRows: TierSummaryRow[];
  coreCount: number;
  variableCount: number;
  privateCount: number;
  irgspAbsentCount: number;
  traitLinkedCount: number;
  multiCopyLikeCount: number;
  functionalRows: FunctionalSummaryRow[];
}

const TIER_META: Record<ConservationTier, { label: string; description: string }> = {
  universal: {
    label: 'Core OGs',
    description: 'Present in every pangenome-panel cultivar.',
  },
  common: {
    label: 'Common variable OGs',
    description: 'Present in most, but not all, panel cultivars.',
  },
  rare: {
    label: 'Rare accessory OGs',
    description: 'Present in at least two cultivars but below the common threshold.',
  },
  private: {
    label: 'Private OGs',
    description: 'Present in one panel cultivar.',
  },
  absent: {
    label: 'Panel-absent reference OGs',
    description: 'Not observed in the pangenome panel, but retained for reference context.',
  },
};

const TIER_ORDER: ConservationTier[] = ['universal', 'common', 'rare', 'private', 'absent'];

const CATEGORY_ORDER: CategoryId[] = [
  'defense',
  'kinase',
  'receptor',
  'tf',
  'signaling',
  'transporter',
  'flowering',
  'starch',
  'cell_wall',
  'photosynthesis',
  'metabolism',
  'repeat_domain',
  'transposon',
  'ribosomal',
  'structural',
  'ubiquitin',
  'hypothetical',
  'other',
  'no_annotation',
];

export function summarizePangenomeOgs(
  bundle: OgIndexBundle,
  categories: OgCategoriesData | null,
): PangenomeOgSummary {
  const tierCounts = new Map<ConservationTier, number>();
  let irgspAbsentCount = 0;
  let traitLinkedCount = 0;
  let multiCopyLikeCount = 0;

  for (const row of bundle.ogs) {
    tierCounts.set(row.tier, (tierCounts.get(row.tier) ?? 0) + 1);
    if (row.irgspCopyCount === 0) irgspAbsentCount += 1;
    if ((row.traits?.length ?? 0) > 0) traitLinkedCount += 1;
    if (row.memberCount > row.presentCount) multiCopyLikeCount += 1;
  }

  const tierRows = TIER_ORDER.map((tier) => ({
    tier,
    label: TIER_META[tier].label,
    description: TIER_META[tier].description,
    count: tierCounts.get(tier) ?? 0,
  }));

  const coreCount = tierCounts.get('universal') ?? 0;
  const privateCount = tierCounts.get('private') ?? 0;
  const variableCount =
    (tierCounts.get('common') ?? 0) +
    (tierCounts.get('rare') ?? 0) +
    privateCount;

  return {
    totalOgs: bundle.count,
    panelTotalCount: bundle.panelTotalCount,
    tierRows,
    coreCount,
    variableCount,
    privateCount,
    irgspAbsentCount,
    traitLinkedCount,
    multiCopyLikeCount,
    functionalRows: categories ? summarizeFunctionalCategories(bundle.ogs, categories) : [],
  };
}

function summarizeFunctionalCategories(
  rows: OgIndexRow[],
  categories: OgCategoriesData,
): FunctionalSummaryRow[] {
  const counts = new Map<CategoryId, { count: number; variableCount: number }>();

  for (const row of rows) {
    const id = categoryIdForOg(row.ogId, categories);
    const prev = counts.get(id) ?? { count: 0, variableCount: 0 };
    prev.count += 1;
    if (row.tier !== 'universal' && row.tier !== 'absent') prev.variableCount += 1;
    counts.set(id, prev);
  }

  return CATEGORY_ORDER.flatMap((id) => {
    const count = counts.get(id);
    const def = getCategoryById(id);
    if (!count || !def) return [];
    return [{
      id,
      label: def.label,
      color: def.color,
      count: count.count,
      variableCount: count.variableCount,
    }];
  }).sort((a, b) => b.count - a.count);
}

function categoryIdForOg(ogId: string, categories: OgCategoriesData): CategoryId {
  const raw = categories.categories[ogId]?.p;
  const def = raw ? getCategoryById(raw) : null;
  return def?.id ?? 'no_annotation';
}
