# OrthoFinder Storage Artifacts

Reference for every file written by the orthofinder processing pipeline
(`functions-python/orthofinder/callable.py`). Documents Storage layout, not
Firestore — for Firestore see `db-schema.md`.

## Layout

```
orthofinder/
├── staging/{uploadId}/                          # transient — deleted after commit
│   ├── Orthogroups.GeneCount.tsv
│   └── Orthogroups_with_description.tsv
└── v{N}/                                        # committed, immutable versions
    ├── Orthogroups.GeneCount.tsv                # raw input (preserved for audit)
    ├── Orthogroups_with_description.tsv         # raw input (preserved for audit)
    ├── _matrix.json                             # parsed copy-count matrix
    ├── og_descriptions.json                     # IRGSP-1.0 reference per OG (representative source)
    ├── baegilmi_gene_annotation.json            # GFF3 snapshot — drawer per-cultivar detail
    └── og-members/
        ├── chunk_000.json                       # OG0000000 – OG0000999
        ├── chunk_001.json                       # OG0001000 – OG0001999
        ├── …
        └── chunk_NNN.json                       # last populated chunk (~54 for 53k OGs)
```

## File schemas

### `_matrix.json`

```typescript
{
  version: number;
  cultivarIds: string[];                      // ["baegilmi", "chamdongjin", ...]
  totalOrthogroups: number;
  ogs: Record<string, Record<string, number>>; // ogId → cultivarId → copy count
}
```

Used by: `functions-python/orthofinder/orchestrator.py` during diff recompute.

### `og_descriptions.json`

```typescript
Record<string, {
  transcripts: string[];                       // IRGSP-1.0 transcript ids, e.g. ["Os01t0391600-00", ...]
  descriptions: Record<string, string>;         // transcript_id → description text (may be "NA")
}>
```

Primary source for orthogroup `representative` field on `OrthogroupDiffEntry`.
Loaded by `orchestrator.recompute_all_diffs` to attach IRGSP info to top OG entries.

### `baegilmi_gene_annotation.json`

```typescript
{
  genes: Record<string, {
    chromosome: string;
    start: number;
    end: number;
    strand: '+' | '-' | '.';
    attributes: Record<string, string>;       // GFF3 col-9 key=value (Note, product, Description, ...)
  }>;
  transcript_to_gene: Record<string, string>; // e.g. "baegilmi_g1234.t1" → "baegilmi_g1234"
}
```

GFF3 snapshot captured at commit time. Used **only** by the frontend drawer to show
per-cultivar baegilmi gene locations during drilldown. `representative` no longer
depends on this artifact — that role moved to `og_descriptions.json` (IRGSP).

Updating `genomes/baegilmi/gene.gff3` alone does NOT refresh this snapshot; admin
must re-upload orthofinder TSVs to trigger a new version that re-reads the current GFF3.

### `og-members/chunk_{NNN}.json`

```typescript
{
  chunk: string;                              // "000", "001", ...
  ogs: Record<string, Record<string, string[]>>; // ogId → cultivarId → gene ids
}
```

- Chunk key = `floor(og_number / 1000)`, zero-padded to 3 digits
- Each chunk holds up to 1000 orthogroups
- Written by `functions-python/orthofinder/chunker.py::StreamingChunkWriter`
  with bounded memory — the pipeline does NOT hold the full `Orthogroups.tsv`
  in memory at once
- Frontend fetches only the chunk containing the OG the user clicks
  (`src/lib/orthogroup-service.ts::fetchOgChunk`)

## Commit lifecycle & orphan policy

1. Staging files uploaded by admin via callable `start_orthofinder_processing`
2. Callable acquires `_orthofinder_meta/lock` and increments `activeVersion`
3. Staging files moved to `v{N}/`
4. `_matrix.json`, og-members chunks, `og_descriptions.json`, `baegilmi_gene_annotation.json` are written
5. **`_orthofinder_meta/state.mark_committed`** — from this point artifacts are
   considered active. Any failure AFTER this point leaves the files intact and
   sets `status='error'` with `errorMessage`; artifacts remain reachable
6. `recompute_all_diffs` runs post-commit (failures don't orphan files)
7. `state = 'complete'`
8. Lock released

If any step 1-4 fails, `uploader.delete_version_dir(version)` wipes the partial
`v{N}/` tree (best-effort — failures are logged, not raised).

## Storage rules

`storage.rules`:

```
match /orthofinder/v{version}/{path=**} {
  allow read: if true;
  allow write: if false;
}
```

Recursive path match is required so chunks nested under `og-members/` are readable.

## Regenerating

- A new version is written each time `start_orthofinder_processing` succeeds
- Old versions are NOT auto-deleted — Storage holds full history until manually
  cleaned
- If `genomes/baegilmi/gene.gff3` is updated, the annotation snapshot embedded in
  the newest `v{N}/` is still from whenever that version was committed. Trigger a
  new commit (admin re-uploads the same TSVs) to refresh
