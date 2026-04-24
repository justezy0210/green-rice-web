# [PLAN] Per-cultivar SV coordinates (Design D) — side-table for non-reference overlays

Status: COMPLETED · 2026-04-23
Cross-verify reference: `/tmp/codex-sv-percultivar-coord-out.txt`
(general-review, 2026-04-23)

## Goal

Give every panel cultivar a **correct, sample-frame coordinate** for
every SV event it carries, so that per-cultivar surfaces (Gene detail
SV overlay, and optionally the cultivar-scoped Region view) can
render SV glyphs on a gene model without drifting into the wrong
exon / wrong locus.

Concrete outcome: a new `per_cultivar_coords` side-table alongside
the existing `sv_matrix/sv_v1/events/by_chr/*`, keyed by `eventId`,
giving `{chr, pos, refLen}` in that cultivar's own assembly frame.
Canonical `SvEvent` stays reference-frame — this plan does not
rewrite the SV matrix.

## Context

### What we have today

- `sv_matrix/sv_v1/events/by_chr/{chr}.json.gz` — reference-frame
  (`IRGSP-1.0`) events. `SvEvent.pos / refLen / altLen` are in ref
  coordinates. `gts[cultivar]` is an ALT-allele code only (no coord).
- Gene models per cultivar in their own de novo assembly frame
  (funannotate output). `GeneModelEntry.chr / start / end` are NOT
  reference coords for non-reference cultivars.
- Region page already overlays gene lane and SV lane on the same
  x-axis using cross-assembly syntenic approximation.

### Why this is a problem

- Temperate japonica cultivars share chromosome-scale synteny but
  pairwise SV-unshared sequence runs ~18.55–23.07 Mb per chr (rice
  pan-genome reference data, Nat Sci Data 2020). Locally, Mb-scale
  DEL and 100 kb INS are documented even in close japonica pairs
  (e.g. Koshihikari vs Nipponbare).
- For **Region page** (chromosome scale, summary/detail modes) the
  approximation is tolerable and labelled.
- For **Gene detail page**, where a user reads SV glyphs against a
  single gene's exons, a 100 kb drift puts the glyph on the wrong
  gene, and a 10 kb drift lands it in the wrong exon. Overlaying
  reference-frame SV on a non-reference cultivar's gene model would
  be visually convincing and technically wrong.

### vg toolchain constraint (Codex cross-verify finding)

- GBZ sample paths are stored as `HAPLOTYPE` by default, which the
  vg toolchain explicitly rejects for position lookup.
  `vg find -P <sample>` and per-snarl ad-hoc liftover are not
  reliable production APIs.
- Canonical path: promote sample paths to REFERENCE sense via
  `vg gbwt --set-reference <sample>` (producing a multi-ref GBZ),
  then run `vg deconstruct -P <sample>` per cultivar. Join back to
  the canonical `eventId` using the `ID` column (our build step
  already stores this as `originalId`).

### Why build-time precompute (not on-demand)

- 11 cultivars × ~18,822 events is small.
- Sparse per-cultivar storage (ALT-carrying events only) means each
  cultivar side-table is a fraction of the canonical bundle, not 11×.
- Avoids standing up a new liftover service.
- Fits the existing "Storage + manifest + pointer" release model.

## Approach

### Phase 1 — Pipeline (server, one-shot per release)

1. Build multi-reference GBZ:
   ```
   vg gbwt -Z \
     --set-reference IRGSP-1.0 \
     --set-reference Baegilmi --set-reference Chamdongjin ... \
     --gbz-format -g graph.multiref.gbz graph.gbz
   ```
2. Precompute snarls once:
   ```
   vg snarls graph.multiref.gbz > graph.snarls
   ```
3. For each cultivar, emit sample-frame VCF:
   ```
   vg deconstruct -P {sample} -r graph.snarls graph.multiref.gbz > {sample}.vcf
   ```
4. Filter to top-level snarls (LV=0) + ≥50 bp, same rules as
   `build-sv-matrix.py::classify_event`.
5. Join `sample.vcf` rows to canonical `eventId` via the `ID` column
   preserved in `originalId` of the existing matrix.
6. Emit sparse per-cultivar JSON:
   `sv_matrix/sv_v1/per_cultivar_coords/{cultivar}/by_chr/{chr}.json.gz`
   with entries `{ eventId, chr, pos, refLen }`. Only ALT-carrying
   events for that cultivar (match on non-"0" non-"." GT in the
   canonical matrix).

Script: `scripts/build-per-cultivar-sv-coords.py` (new, mirrors the
existing `build-sv-matrix.py` pattern — `--dry-run` → `tmp/promote`,
live → Storage).

### Phase 2 — Types + client fetch

1. New type in `src/types/sv-event.ts`:
   ```ts
   interface SvCultivarCoord {
     eventId: string;
     chr: string;
     pos: number;
     refLen: number;
   }
   interface SvCultivarCoordBundle {
     schemaVersion: 1;
     svReleaseId: string;
     cultivar: string;
     chr: string;
     count: number;
     entries: SvCultivarCoord[];
   }
   ```
2. Service helper: `src/lib/sv-service.ts` — `fetchSvCultivarCoords(release, cultivar, chr)`, cached like `fetchSvChr`.
3. Hook: `src/hooks/useSvCultivarCoords.ts` — `{ entries, loading, error }`,
   returns `Map<eventId, SvCultivarCoord>` keyed for O(1) lookup.

### Phase 3 — Gene detail SV overlay (first consumer)

1. On `GeneDetailPage`, fetch:
   - canonical events for the gene's chr (`useSvEventsForRegion`, window
     = gene.start..gene.end, cultivar + scope='cultivar')
   - per-cultivar side-table for (release, cultivar, chr)
2. For each canonical event the cultivar carries, look up its
   sample-frame pos from the side-table. If missing, drop the event
   (do not render with ref pos — refuse to mislead).
3. Pass the `(samplePos, refLen, altLen, svType)` tuples into a new
   `GeneModelSvg` prop `svEvents`. Render with the Region P2
   glyphs (DEL hollow span, INS caret, COMPLEX hatched span), scaled
   to the gene's xOf. Reuse `SvGlyphDefs`.
4. Legend + copy: make it clear these are in this cultivar's frame.

### Phase 4 — Region page (optional, later)

Later plan. Default stays ref-frame with approximation label; we
might gate an opt-in "precise coords" toggle per scope.

## Files to modify / create

New:
- `scripts/build-per-cultivar-sv-coords.py`
- `src/types/sv-event.ts` — append `SvCultivarCoord` / `SvCultivarCoordBundle`
- `src/lib/sv-service.ts` — add `fetchSvCultivarCoords`
- `src/hooks/useSvCultivarCoords.ts`
- Docs: `docs/references/data-pipelines.md` — add pipeline entry

Modified:
- `src/components/gene/GeneModelSvg.tsx` — accept `svEvents`, render glyphs
- `src/pages/GeneDetailPage.tsx` — fetch + pass
- `firestore.rules` / Storage rules — verify new prefix is publicly
  readable (same pattern as `sv_matrix/` prefix)

## Risks / Open questions

1. **GBZ format** — confirm the existing pangenome build emits a GBZ
   whose `--set-reference` promotion is supported by the current
   vg version. If the existing build used an older path-only GFA,
   we need to rebuild. Server handoff.
2. **Sample naming collision** — panel sample names must be unique
   and stable across canonical and per-cultivar VCFs. Check
   `data/cultivars.json` cultivarId vs VCF sample header.
3. **Missing events in sample-frame VCF** — some snarls might not
   resolve cleanly as LV=0 events in every sample's reference
   projection. Decide: drop from side-table (preferred) or emit a
   sentinel null `pos`. Gene detail drops by default.
4. **"0"/"."/numeric ALT encoding** — the canonical matrix already
   stores a single-allele code string (not diploid GT). Confirm
   sample-frame VCF uses the same convention after `-P <sample>`.
5. **Storage rules** — `storage.rules` must allow public read under
   `sv_matrix/*/per_cultivar_coords/**`.
6. **16-cultivar forward compatibility** — current panel is 11; plan
   for 16 by making the script loop over a manifest-driven sample
   list, not a hardcoded 11-entry list.
7. **Cache size on client** — each cultivar × chr side-table is
   sparse. 12 chrs × ~3000 ALT carriers typical → small. Confirm
   memoised fetch is bounded.

## Verification

- [ ] `scripts/build-per-cultivar-sv-coords.py --dry-run` 성공,
  샘플 JSON 출력 shape 검증 (`tmp/promote/sv_matrix/sv_v1/per_cultivar_coords/…`)
- [ ] Live run: Storage에 `per_cultivar_coords/{cultivar}/by_chr/{chr}.json.gz` 업로드
- [ ] `storage.rules` 배포 + 브라우저에서 fetch 성공
- [ ] `npm run check:all` 통과 (lint, type, arch, traits, manifest, cross-language, py)
- [ ] Gene detail 페이지에서 baegilmi의 LOF 후보 유전자 (e.g. `baegilmi_g10662`)
  열어 SV glyph가 exon 범위 내에 그려지는지 시각 확인
- [ ] 참고 품종(IRGSP) gene 과 baegilmi gene 의 같은 ortholog에서 동일 SV 이벤트의
  sample-frame pos 차이 검증 (sanity check — Mb-scale 차이가 실제로 존재)
- [ ] `/verify` 외부 검증 MVP1 완료 후

## Result

- Status: **COMPLETED 2026-04-23**
- Server pipeline: `vg gbwt --set-reference` × 11 → multi-ref GBZ (6s) ·
  `vg deconstruct -P <sample> -t 16` × 11 sequential (~2분/샘플, 24분 총) ·
  VCF output 각 120 MB 대 (bgzip).
- Canonical events 업로드: `canonical_events/by_chr/*.json.gz` → 서버.
  `tmp/promote` dry-run JSON은 plain text 였어서 magic-byte sniff로 둘 다 지원.
- LV=0 필터는 불필요: `vg deconstruct -P` (vcfbub clip 없음)에서 LV INFO 미생성.
  Canonical 조인 자체가 top-level snarl만 남기므로 `originalId` 매칭으로 충분.
- Per-cultivar 사이드테이블 생성: 6.1k ~ 10.9k coord entries / cultivar, 12 chrs.
  Namil이 최대 (10.9k), Samgwang이 최소 (6.1k).
- Storage 업로드: 132 files (11 × 12), 총 1.1 MB 압축.
  `sv_matrix/{path=**}` rule이 `per_cultivar_coords/**` prefix 이미 커버.
- Client fetch 검증: `sv_matrix/sv_v1/per_cultivar_coords/baegilmi/by_chr/chr01.json.gz`
  → 741 entries, first entry `EV0000001 · chr01:855 · refLen=3872`.
- Gene detail 페이지는 이제 overlay 자동 활성화 (`available === true`).

**Followup (out of this plan)**:
- 16-cultivar 전환 시 스크립트 동일하게 반복 (sample list 확장).
- Region page도 cultivar scope에서 side-table 사용으로 전환 검토 (Phase 4).
- Gene detail browser smoke test.
