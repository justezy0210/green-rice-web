# Phenotype Groups — auto-grouping (v4)

Auto-generated from Firestore `groupings/{traitId}` (latest update 2026-04-15T06:18:23.627317+00:00). Panel size: 11 cultivars (including IRGSP reference if present).

Most traits use a Gaussian Mixture Model over observed cultivar values (`summary.method == 'gmm'`); some traits use an explicit fixed-class labelling (`fixed-class`) when the phenotype is binary (e.g. resistance). Inactive groupings appear as `none` and are not used downstream.

**Scope caveat.** Group membership is a *proposed* grouping, not a biological ground truth. With at most 11 annotated cultivars the silhouette is informative but the sample size cannot support population-scale claims. See `docs/product-specs/scope.md` for banned framings.

## Legend

- Each trait has two group labels, named for the trait semantics (e.g. early/late, short/tall, susceptible/resistant). The labels come from `data/traits.json`.
- **borderline** — GMM posterior probability is not decisively ≥ 0.7 for either group; the cultivar is still assigned to a label but flagged, and downstream tests (Mann-Whitney U, candidate scoring) exclude it.
- **n** — number of cultivars used in the grouping fit; the remaining (11 − n) lack a measurement for this trait.

## Bacterial Leaf Blight &mdash; `bacterial_leaf_blight`

- Direction: not-applicable
- Method: `fixed-class` · Usable: yes
- Group labels: `susceptible` (low side) / `resistant` (high side)
- n (observed / used): 11 / 11
- Missing rate: 0.0%
- Note: fixed-class labelling — silhouette does not apply; the two groups are assigned by an explicit rule rather than GMM.

- **susceptible** (4): Baegilmi, Jungmo1024, Namil, Pyeongwon
- **resistant** (7): Chamdongjin, Chindeul, Hyeonpum, Jopyeong, Namchan, Saeilmi, Samgwang

## Culm Length &mdash; `culm_length`

- Direction: higher-is-more
- Method: `gmm` · Usable: yes
- Group labels: `short` (low side) / `tall` (high side)
- n (observed / used): 11 / 11
- Missing rate: 0.0%
- Silhouette: 0.497

- **short** (3): Jopyeong, Jungmo1024, Pyeongwon
- **tall** (8): Baegilmi, Chamdongjin, Chindeul, Hyeonpum, Namchan, Namil, Saeilmi, Samgwang

## 1000-Grain Weight &mdash; `grain_weight`

- Direction: higher-is-more
- Method: `gmm` · Usable: yes
- Group labels: `light` (low side) / `heavy` (high side)
- n (observed / used): 11 / 11
- Missing rate: 0.0%
- Silhouette: 0.656

- **light** (9): Baegilmi, Chindeul, Hyeonpum, Jopyeong, Jungmo1024, Namchan, Pyeongwon, Saeilmi, Samgwang
- **heavy** (2): Chamdongjin, Namil

## Days to Heading &mdash; `heading_date`

- Direction: higher-is-more
- Method: `gmm` · Usable: yes
- Group labels: `early` (low side) / `late` (high side)
- n (observed / used): 11 / 11
- Missing rate: 0.0%
- Silhouette: 0.732

- **early** (5): Baegilmi, Jopyeong, Jungmo1024, Namil, Pyeongwon
- **late** (6): Chamdongjin, Chindeul, Hyeonpum, Namchan, Saeilmi, Samgwang

## Panicle Length &mdash; `panicle_length`

- Direction: higher-is-more
- Method: `gmm` · Usable: yes
- Group labels: `short` (low side) / `long` (high side)
- n (observed / used): 11 / 11
- Missing rate: 0.0%
- Silhouette: 0.489

- **short** (10): Baegilmi, Chamdongjin, Chindeul, Hyeonpum, Jopyeong, Jungmo1024, Namchan, Pyeongwon, Saeilmi, Samgwang
- **long** (1): Namil
- ⚠ Skewed split (10:1); treat as discovery hint only.

## Panicle Number &mdash; `panicle_number`

- Direction: higher-is-more
- Method: `gmm` · Usable: yes
- Group labels: `low` (low side) / `high` (high side)
- n (observed / used): 11 / 11
- Missing rate: 0.0%
- Silhouette: 0.556

- **low** (7): Baegilmi, Chamdongjin, Chindeul, Hyeonpum, Namil, Pyeongwon, Saeilmi
- **high** (2): Jungmo1024, Samgwang
- **borderline** (2): Jopyeong (→low, p=0.52), Namchan (→low, p=0.52)

## Pre-harvest Sprouting &mdash; `pre_harvest_sprouting`

- Direction: higher-is-more
- Method: `gmm` · Usable: yes
- Group labels: `low` (low side) / `high` (high side)
- n (observed / used): 7 / 7
- Missing rate: 36.4%
- Silhouette: 0.850

- **low** (4): Baegilmi, Chindeul, Hyeonpum, Namchan
- **high** (3): Chamdongjin, Jungmo1024, Saeilmi

## Ripening Rate &mdash; `ripening_rate`

- Direction: higher-is-more
- Method: `gmm` · Usable: yes
- Group labels: `low` (low side) / `high` (high side)
- n (observed / used): 11 / 11
- Missing rate: 0.0%
- Silhouette: 0.646

- **low** (2): Jungmo1024, Namil
- **high** (9): Baegilmi, Chamdongjin, Chindeul, Hyeonpum, Jopyeong, Namchan, Pyeongwon, Saeilmi, Samgwang

## Spikelets / Panicle &mdash; `spikelets_per_panicle`

- Direction: higher-is-more
- Method: `gmm` · Usable: yes
- Group labels: `low` (low side) / `high` (high side)
- n (observed / used): 11 / 11
- Missing rate: 0.0%
- Silhouette: 0.735

- **low** (4): Baegilmi, Jopyeong, Jungmo1024, Pyeongwon
- **high** (7): Chamdongjin, Chindeul, Hyeonpum, Namchan, Namil, Saeilmi, Samgwang
