# SV entity detail route before Browse catalog

## Goal

Add a focused SV entity surface so users can inspect one structural-variant
event from Discovery, Gene, OG, or Region context.

The first implementation target is:

- `/sv/:eventId`

This plan intentionally does **not** add a top-level `Browse > SVs` catalog in
the first pass. A full SV catalog can be added later if users need to start
from SV filters directly.

## Product Decision

SVs should become addressable entities, but not immediately a primary Browse
category.

Reasoning:

- The primary browse model is still Cultivar / Gene / Orthogroup / Region.
- The current SV IDs are internal event-normalized identifiers, not natural
  user entry terms.
- Discovery already has a trait-scoped SV table. A broad `/sv` catalog would
  duplicate that table unless it has a clearer user workflow.
- Users are more likely to encounter an SV while reviewing a candidate locus,
  gene model, OG lead, or region track, then ask "what is this event?"
- A detail page solves that question without over-promoting SVs as validated
  or marker-ready findings.

Decision checkpoint:

Add `Browse > SVs` only after the detail route proves useful and the desired
entry workflow is clear, for example coordinate search, type/size filtering,
trait-frequency gap filtering, or direct event ID lookup.

## User Questions To Answer

For one SV event, the user should be able to answer:

- What is this SV event, and where is it?
- Is it an insertion, deletion, or complex event?
- Which cultivars carry ALT vs REF vs missing?
- Does the ALT pattern separate a trait grouping?
- Which Discovery candidates, OGs, genes, or regions currently point to it?
- Is this evidence only a candidate-discovery signal?

The page should not imply:

- causality
- marker-readiness
- validation-grade PAV
- population-wide allele frequency beyond the current pre-release panel

## Current Data Available

Existing SV matrix data:

- `sv_matrix/{svReleaseId}/manifest.json`
- `sv_matrix/{svReleaseId}/events/by_chr/{chr}.json.gz`
- `sv_matrix/{svReleaseId}/group_freq/by_trait/{traitId}.json.gz`
- `sv_matrix/{svReleaseId}/per_cultivar_coords/{cultivar}/by_chr/{chr}.json.gz`

Existing TypeScript surfaces:

- `src/types/sv-event.ts`
- `src/lib/sv-service.ts`
- `src/hooks/useSvMatrix.ts`
- `src/hooks/useSvEventsForRegion.ts`
- `src/hooks/useSvCultivarCoords.ts`

Existing pages/components that already expose SV evidence:

- `/discovery/:runId/variants`
- `/discovery/locus/:locusSlug`
- `/og/:ogId`
- `/genes/:geneId`
- `/region/:cultivar/:chr/:range`

## SV Identifier Rule

The canonical SV event ID is generated during SV matrix construction as:

```text
EV + zero-padded event counter
```

Current scripts use seven digits, for example `EV0000456`.

Implementation requirements:

- display the canonical `eventId` exactly as stored
- do not shorten IDs in tables or cards
- show `originalId` as source VCF/snarl provenance, not as the stable route ID
- optionally normalize shorter user-entered forms later only if the mapping is
  unambiguous

## Information Architecture

### First pass

Add only:

- `/sv/:eventId`
- event links from existing SV mentions

Do not add:

- `/sv` catalog
- Browse menu item
- dashboard card

### Later pass

Add `/sv` and `Browse > SVs` only if the catalog has a distinct workflow:

- event ID lookup
- chromosome/range filter
- SV type filter
- size filter
- cultivar ALT carrier filter
- trait group-frequency gap filter
- linked gene/OG/candidate filter

## Page Composition

### 1. Event Header

Show:

- canonical event ID
- SV type
- chromosome and reference-frame coordinate
- reference length, alternate length, absolute size
- SV release ID
- source `originalId`

Primary actions:

- open reference-region view
- copy event ID

### 2. Cultivar Genotype Pattern

Show a dense cultivar strip:

- ALT-carrying
- REF
- missing

Use the matrix `gts` field. Treat any non-`0`, non-`.` value as ALT-carrying.
Do not describe this as diploid genotype because the matrix stores haploid
sample allele codes from top-level snarls.

### 3. Trait Group Pattern

Show group-frequency bars for relevant trait contexts:

- traits where the event appears in Discovery evidence
- traits where group frequency bundle has high ALT-frequency gap
- optional selector for all traits with available group frequency

Default order:

1. linked Discovery trait contexts
2. largest absolute group-frequency gap
3. trait label

### 4. Linked Biological Context

Show available links back to:

- Discovery locus page
- Discovery run variant table
- candidate detail page where available
- OG detail page where available
- gene detail page where available
- region page for a selected carrier cultivar

This section must distinguish:

- direct candidate-best SV links
- nearby/overlap context
- broad region context

### 5. Caveat Strip

Display a visible caveat:

- candidate-discovery signal only
- current panel size is the release manifest sample count
- no causal or marker-ready claim
- per-cultivar coordinates may be unavailable for some links

## Data And Fetching Approach

### Phase 1 lookup

Implement event lookup using the existing artifact set.

Options:

- If the caller already knows chromosome, fetch that chromosome bundle and
  locate `eventId`.
- If only `eventId` is present in the route, load manifest and all chromosome
  bundles through the existing cached `useAllSvEvents` path, then build an
  in-memory event index.

This is acceptable for the first pass because the current matrix is small
enough for the existing Step 3 SV table to load all chromosomes client-side.

### Phase 2 lookup optimization

If route load time is not acceptable, add a small generated artifact:

```text
sv_matrix/{svReleaseId}/event_index.json
```

Suggested row shape:

```ts
interface SvEventIndexRow {
  eventId: string;
  chr: string;
  pos: number;
  svType: SvType;
  svLenAbs: number;
}
```

Then `fetchSvEventById` can fetch `event_index.json`, find the chromosome, and
load only one chromosome bundle.

## Implementation Phases

### Phase 1. Data helpers and hook

Add:

- `src/lib/sv-event-helpers.ts`
- `src/hooks/useSvEvent.ts`

Responsibilities:

- canonical event ID validation
- ALT carrier derivation from `gts`
- group-frequency gap derivation
- event lookup from existing bundles
- clear not-found and loading states

### Phase 2. SV detail page

Add:

- `src/pages/SvDetailPage.tsx`
- `src/components/sv/SvEventHeader.tsx`
- `src/components/sv/SvCultivarPattern.tsx`
- `src/components/sv/SvTraitGroupPattern.tsx`
- `src/components/sv/SvLinkedContext.tsx`

Update:

- `src/App.tsx` route registration

The page should be usable even when linked Discovery/OG/Gene context is
missing. The event itself is the primary record.

### Phase 3. Link existing SV mentions

Make canonical event IDs clickable in:

- `src/components/discovery/DiscoveryStepSvTable.tsx`
- `src/components/discovery/TopCandidateLeads.tsx`
- `src/components/discovery/SvPatternByGroup.tsx`
- `src/components/og-detail/OgLeadSvCard.tsx`
- region/gene SV surfaces where a text link is available

Avoid forcing SVG glyphs to become the only navigation path. Region tracks can
add a small text/detail affordance later if the direct glyph interaction feels
too fragile.

### Phase 4. Optional reverse context index

If the SV detail page needs stronger context, derive an index from existing
Discovery artifacts:

```text
sv_context_index/{svReleaseId}/by_event/{eventId}.json
```

Possible content:

- linked run IDs
- candidate IDs
- locus slugs
- OG IDs
- gene IDs
- impact class counts

This should be generated from current candidate, block, and intersection
artifacts, not manually curated.

### Phase 5. Optional Browse catalog

Only after the detail page is reviewed, add:

- `/sv`
- optional `Browse > SVs`
- filterable table using the same event/detail components

The catalog should answer a different question from Discovery:

> "Find SV events by genomic properties or carrier pattern."

Discovery should continue to answer:

> "Which OG/SV/gene lead is interesting for this trait/locus?"

## Files To Modify

First-pass implementation:

- `src/App.tsx`
- `src/types/sv-event.ts`
- `src/lib/sv-event-helpers.ts`
- `src/hooks/useSvEvent.ts`
- `src/pages/SvDetailPage.tsx`
- `src/components/sv/SvEventHeader.tsx`
- `src/components/sv/SvCultivarPattern.tsx`
- `src/components/sv/SvTraitGroupPattern.tsx`
- `src/components/sv/SvLinkedContext.tsx`
- `src/components/discovery/DiscoveryStepSvTable.tsx`
- `src/components/discovery/TopCandidateLeads.tsx`
- `src/components/discovery/SvPatternByGroup.tsx`
- `src/components/og-detail/OgLeadSvCard.tsx`

Optional later implementation:

- `scripts/build-sv-matrix.py`
- `src/lib/sv-service.ts`
- `src/hooks/useSvMatrix.ts`
- `src/pages/SvIndexPage.tsx`
- `src/components/layout/Header.tsx`

## Risks / Open Questions

- Direct `/sv/:eventId` lookup may be slower if it scans all chromosome
  bundles. Use `event_index.json` if this is noticeable.
- Existing context links may be incomplete until a reverse context index is
  generated.
- Some event IDs in old UI surfaces may have been visually shortened. The next
  implementation should verify every displayed ID is canonical.
- Per-cultivar coordinates are not the same as reference-frame coordinates.
  The detail page must label each coordinate frame clearly.
- A top-level SV catalog could make internal event IDs look more authoritative
  than they are. Keep caveats visible.

## Verification

- [ ] `npm run type-check`
- [ ] `npm run lint`
- [ ] `npm run check:arch`
- [ ] `npm run build`
- [ ] Open `/sv/{canonicalEventId}` from a Discovery lead.
- [ ] Open `/sv/{canonicalEventId}` from an OG lead SV card.
- [ ] Confirm not-found state for an invalid event ID.
- [ ] Confirm cultivar genotype strip matches `SvEvent.gts`.
- [ ] Confirm trait group bars match `group_freq/by_trait` values.
- [ ] Confirm no `Browse > SVs` nav item is added in first pass.

## Result

- Status: DONE
- Notes:
  - Added `/sv/:eventId` without adding a top-level `/sv` catalog or Browse
    menu item.
  - Added SV event lookup from existing `sv_matrix/{svReleaseId}` artifacts.
  - Added event header, cultivar genotype pattern, trait group pattern, and
    linked Discovery context panels.
  - Linked text SV IDs from Discovery variant/candidate tables, Discovery
    locus SV sections, and OG lead SV cards.
  - Verified with `npm run type-check`, `npm run lint`,
    `npm run check:arch`, `npm run build`, and `git diff --check`.
  - Started Vite on `http://127.0.0.1:5175/`; `/sv/EV0000456` returned 200.
