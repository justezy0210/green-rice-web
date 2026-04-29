# Green Rice DB Demo Scenarios

Last updated: 2026-04-29

## Purpose

This document defines five concrete presentation scenarios for Green Rice DB.
The goal is not to list every page, but to show how a researcher can move
through the database from a real biological question.

Use these as demo scripts. Each case should be presented as candidate evidence,
not as validated causal proof.

## Scenario 1: Pangenome Overview

### User Question

> Before I inspect one gene or SV, what is the scale and structure of this
> pangenome database?

### Demo Entry

- Page: `/pangenome`

### Why This Is A Good Example

- It orients new users before they drill into one entity.
- It shows the panel scope, graph/SV coverage, orthogroup conservation tiers,
  functional categories, and SV release counts.
- It makes clear that later candidate examples are panel-scoped, not
  population-wide frequency claims.

### Click Flow

1. Open `/pangenome`.
2. Review panel cultivars, graph coverage, orthogroup count, and SV event count.
3. Compare Orthogroup Conservation tiers.
4. Check Functional Pangenome and SV Release summaries.
5. Decide whether to continue into Orthogroups, Genes, SV, or Discovery.

### Speaking Point

This scenario sets the frame. Green Rice DB is not only a candidate table; it
has a panel-level pangenome catalog that helps users understand the scale and
limits of the database before they interpret detailed evidence.

### Do Not Say

- Do not describe catalog counts as Korean-rice-wide frequencies.
- Say they are current-release, panel-scoped counts.

## Scenario 2: Cultivar-To-Region Track

### User Question

> I am starting from a cultivar, not a known gene or SV. What genome evidence
> can I inspect for Samgwang, and how do I move into a region track?

### Demo Entry

- Page: `/cultivar/Samgwang`
- Example region: `/region/samgwang/chr06/10000000-10650000?svScope=cultivar`

### Why This Is A Good Example

- Many users will know a cultivar name before they know an OG or SV ID.
- The cultivar page is the natural entry point for phenotype profile,
  genome summary, chromosome browsing, and downloadable genome resources.
- The region page shows the assembly-level view directly: gene models, nearby
  SV events, discovery block overlap, and trait-context links in the same
  coordinate window.

### Click Flow

1. Open `/cultivar/Samgwang`.
2. Review the phenotype profile and genome summary.
3. Use the chromosome browser to enter a region view.
4. Open the example chr06 region if a live shortcut is needed.
5. Point out gene models and cultivar-carried SVs on the same track.

### Speaking Point

This scenario is for a user who arrives with a cultivar-centered question. It
shows that the database is not only a table of analysis results; it also lets
users inspect assembly-level genome context by cultivar.

### Do Not Say

- Do not say the region track itself proves trait association.
- Say it is a visual inspection layer for gene and SV context.

## Scenario 3: Known Gene Or Resistance-Like Gene Family

### User Question

> I know either a gene ID or a functional class such as bacterial blight
> resistance. Can I connect that entry point to gene family, phenotype-group,
> and SV context?

### Demo Entry

- Page: `/genes` or `/og`
- Search keyword: `bacterial blight`
- Trait filter: `Bacterial Leaf Blight`
- Example result to open: `OG0000297`
- Detail URL after selecting the row: `/og/OG0000297?trait=bacterial_leaf_blight`

### Why This Is A Good Example

- Gene search lets users start from a specific transcript or cultivar gene ID.
- Function search lets users start from a biological phrase instead.
- `OG0000297` contains the IRGSP transcript `Os11t0688832-01`.
- Its annotation is resistance-like:
  `Coiled-coil NBS-LRR protein, Blast resistance, Resistance to bacterial blight`.
- In the current 11-cultivar panel, the bacterial leaf blight grouping is:
  - susceptible: Baegilmi, Jungmo1024, Namil, Pyeongwon
  - resistant: Chamdongjin, Chindeul, Hyeonpum, Jopyeong, Namchan, Saeilmi,
    Samgwang
- The OG is not simply present/absent. It is more useful as a copy-pattern
  example:
  - susceptible cultivars carry one copy each
  - resistant cultivars carry three copies each
- The trait-hit index marks this OG for bacterial leaf blight
  (`p = 0.002293`).

### Click Flow

1. Open `/genes` if starting from a known gene ID; inspect annotation, OG,
   trait badges, and SV badges in the result row.
2. Open `/og` if starting from a function.
3. Select the `Bacterial Leaf Blight` trait filter.
4. Search `bacterial blight`.
5. Open the `OG0000297` row from the filtered results.
6. In the member table, point out the cultivar-level copy pattern.
7. Use phenotype group badges to compare susceptible vs resistant cultivars.
8. Open one member gene if needed to show the gene-level page.

### Speaking Point

This is the type of question a researcher can ask from either a gene or a
function. The database connects a specific gene entry, functional annotation,
orthogroup membership, phenotype-group badges, copy pattern, and linked SV
context.

### Do Not Say

- Do not say this proves bacterial leaf blight resistance.
- Say it is a resistance-like OG with a phenotype-group copy pattern worth
  follow-up validation.

## Scenario 4: Heading-Date SV Carrier Pattern

### User Question

> I am interested in heading date. Can I find a structural variant that is
> carried by early-heading cultivars but absent from late-heading cultivars?

### Demo Entry

- Page: `/sv`
- Example event: `EV0007248`
- Detail URL: `/sv/EV0007248`
- Related discovery locus: `/discovery/locus/chr06-9-11mb-heading-culm`

### Why This Is A Good Example

- Heading date is the clearest balanced trait grouping in the current panel:
  - early: Baegilmi, Jopyeong, Jungmo1024, Namil, Pyeongwon
  - late: Chamdongjin, Chindeul, Hyeonpum, Namchan, Saeilmi, Samgwang
- `EV0007248` is a deletion at `chr06:10,559,214-10,564,103`.
- In the recalculated discovery evidence, this event appears in heading-date
  candidate intersections with a clean group pattern:
  - early: 5 / 5 ALT
  - late: 0 / 6 ALT
- It is also part of a chr06 heading/culm block rather than a one-off isolated
  event.

### Click Flow

1. Open `/sv`.
2. Turn on the early-heading cultivars:
   Baegilmi, Jopyeong, Jungmo1024, Namil, Pyeongwon.
3. Use `Only selected` to ask for SVs carried by the selected cultivars and
   not by the others.
4. Search or open `EV0007248`.
5. Open `/sv/EV0007248`.
6. From the SV detail, move to the linked region view to inspect nearby gene
   models.

### Speaking Point

This scenario shows why the SV page is useful. The user is not just browsing
a list of variants. They can select a cultivar group that matches a phenotype
question and ask which SVs are specific to that group. For heading date,
`EV0007248` is a strong demo example because the early/late carrier pattern is
visually simple.

### Do Not Say

- Do not say `EV0007248` is the heading-date causal variant.
- Say it is a group-specific SV candidate inside a heading-date hotspot.

## Scenario 5: Discovery Review Of A Heading-Date Block

### User Question

> Instead of starting from one gene or one SV, can I see whether heading-date
> signals cluster into a genomic block?

### Demo Entry

- Page: `/discovery`
- Detail URL: `/discovery/locus/chr06-9-11mb-heading-culm`
- Example OG/SV records:
  - `OG0001177` - `EV0007248` - `chr06:10,559,214`
  - `OG0035336` - `EV0007256` - `chr06:10,585,589`
  - `OG0041202` - `EV0007099` - `chr06:9,527,738`
  - `OG0042410` - `EV0006854` - `chr06:8,272,561`

### Why This Is A Good Example

- The heading-date analysis produced 1,045 selected OGs from 53,539
  orthogroups.
- The strongest interpretation is block-level, especially:
  - `chr06 9-11 Mb`
  - `chr11 24-28 Mb`
- The chr06 block contains repeated SVs such as `EV0007248`, `EV0007287`, and
  `EV0007272` across multiple nearby OGs.
- This makes the discovery page useful because it prevents the user from
  overinterpreting many neighboring hits as independent genes.

### Click Flow

1. Open `/discovery`.
2. Click the row for the heading/culm shared locus.
3. Open `/discovery/locus/chr06-9-11mb-heading-culm`.
4. Filter the detail page to `Days to Heading`.
5. Review `SV patterns across groups`.
6. Open an SV such as `EV0007248`.
7. Open a related OG such as `OG0001177`.
8. Move to the region view to see the SV and gene models together.

### Speaking Point

This is the main hypothesis-generating workflow. The user starts from a trait
question, but the DB does not pretend that one table row is the answer. It
shows that several OG/SV records cluster in the same genomic neighborhood, so
the researcher can review the locus as a block and then drill down to specific
genes, SVs, and regions.

### Do Not Say

- Do not describe every OG-SV overlap as biologically meaningful.
- Say that Discovery highlights a review locus where several pieces of
  candidate evidence converge.

## Optional Backup Example: Shared Development Locus

If the chr06 heading locus is not the preferred live demo, use:

- `/discovery/locus/chr11-21-25mb-development`
- Related traits:
  - Culm Length
  - Days to Heading
  - Spikelets / Panicle
- Example records:
  - `OG0044616`
  - `EV0016287`
  - `EV0016276`

This is useful when the presentation needs to emphasize that a locus can be
shared across multiple development-related traits. It is less clean than the
heading-specific chr06 example, so use it after explaining that Discovery is
block-level candidate review.

## Page Coverage

These five scenarios cover the main user-facing pages:

| Scenario | Pages Used |
| --- | --- |
| Pangenome overview | `/pangenome` |
| Cultivar-to-region track | `/cultivar/:name`, `/region/...` |
| Known gene or resistance-like gene family | `/genes`, `/og`, `/og/:id`, `/genes/:id` |
| Heading-date SV carrier pattern | `/sv`, `/sv/:eventId`, `/region/...` |
| Discovery heading-date block | `/discovery`, `/discovery/locus/:slug`, `/og/:id`, `/sv/:eventId`, `/region/...` |

## Final Framing For Presentation

Green Rice DB should be presented as an assembly-based pan-genome review
database. It lets users start from a pangenome overview, cultivar, gene,
function, SV, or trait-linked discovery block, then move across cultivar, gene,
orthogroup, SV, and region views. The database helps prioritize hypotheses; it
does not replace experimental validation.
