/**
 * Cross-language parity test.
 *
 * Invokes functions-python/venv/bin/python3 from repo root with
 * sys.path.insert(0, "functions-python") to load shared.*, then
 * compares decoded-shape equality against the TS-side view.
 *
 * Compared surface:
 *   - traits:      (id, type, keys, direction, labels, unit) tuples, ordered
 *   - cultivars:   (id, pangenome) pairs, ordered
 *   - reference:   sampleId, displayName, longName
 *   - storage paths: canonical inputs listed below
 *
 * Labels are semantic (post_process uses them for group-label output).
 * `label` (display) is intentionally NOT compared.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const PY = resolve(REPO_ROOT, 'functions-python/venv/bin/python3');

if (!existsSync(PY)) {
  console.error(
    `\x1b[31m✗ Missing Python venv at ${PY}\x1b[0m\n\n  Bootstrap:\n    python3 -m venv functions-python/venv && \\\n      functions-python/venv/bin/pip install -r functions-python/requirements.txt \\\n        -r functions-python/requirements-dev.txt\n`,
  );
  process.exit(1);
}

// ─── Python snippet: dump its view of the SSOT as JSON ────────────────

const PY_SNIPPET = `
import json, sys
sys.path.insert(0, "functions-python")
from shared.traits import TRAITS
from shared.manifests import load_cultivars
from shared.reference import IRGSP_SAMPLE_ID, IRGSP_DISPLAY_NAME, IRGSP_LONG_NAME
from shared.storage_paths import (
    og_gene_coords_path,
    og_region_pointer_path, og_region_graph_path, og_region_graph_manifest_path,
    og_region_af_path, og_region_af_manifest_path, og_region_af_summary_manifest_path,
    og_allele_freq_path, orthofinder_og_members_path,
    orthofinder_baegilmi_annotation_path, orthofinder_og_categories_path,
)

print(json.dumps({
    "traits": [
        {
            "id": t.traitId, "type": t.type, "keys": list(t.keys),
            "direction": t.direction, "labels": dict(t.labels), "unit": t.unit,
        }
        for t in TRAITS
    ],
    "cultivars": [
        {"id": c["id"], "pangenome": bool(c.get("pangenome"))}
        for c in load_cultivars()
    ],
    "reference": {
        "sampleId": IRGSP_SAMPLE_ID,
        "displayName": IRGSP_DISPLAY_NAME,
        "longName": IRGSP_LONG_NAME,
    },
    "paths": {
        "ogGeneCoordsPath_007": og_gene_coords_path("007"),
        "ogRegionPointerPath": og_region_pointer_path(),
        "ogRegionGraphPath_6_4_OG0000987_cluster": og_region_graph_path(6, 4, "OG0000987", "baegilmi_chr02_10083653"),
        "ogRegionGraphManifestPath_6_4": og_region_graph_manifest_path(6, 4),
        "ogRegionAfPath_6_4_heading_OG0000987_cluster": og_region_af_path(6, 4, "heading_date", "OG0000987", "baegilmi_chr02_10083653"),
        "ogRegionAfManifestPath_6_4_heading": og_region_af_manifest_path(6, 4, "heading_date"),
        "ogRegionAfSummaryManifestPath_6_4": og_region_af_summary_manifest_path(6, 4),
        "ogAlleleFreqPath_1_2_heading": og_allele_freq_path(1, 2, "heading_date"),
        "orthofinderOgMembersPath_1_000": orthofinder_og_members_path(1, "000"),
        "orthofinderBaegilmiAnnotationPath_1": orthofinder_baegilmi_annotation_path(1),
        "orthofinderOgCategoriesPath_1": orthofinder_og_categories_path(1),
    },
}))
`;

const { status, stdout, stderr } = spawnSync(PY, ['-c', PY_SNIPPET], {
  cwd: REPO_ROOT,
  encoding: 'utf-8',
});
if (status !== 0) {
  console.error('\x1b[31m✗ Python side failed:\x1b[0m\n' + stderr);
  process.exit(1);
}

interface PySide {
  traits: Array<{ id: string; type: string; keys: string[]; direction: string; labels: { low: string; high: string }; unit: string }>;
  cultivars: Array<{ id: string; pangenome: boolean }>;
  reference: { sampleId: string; displayName: string; longName: string };
  paths: Record<string, string>;
}

const py: PySide = JSON.parse(stdout);

// ─── TS side: load via the same shapes ────────────────────────────────

const traitsJson = JSON.parse(readFileSync(resolve(REPO_ROOT, 'data/traits.json'), 'utf-8'));
const cultivarsJson = JSON.parse(readFileSync(resolve(REPO_ROOT, 'data/cultivars.json'), 'utf-8'));
const referenceJson = JSON.parse(readFileSync(resolve(REPO_ROOT, 'data/reference.json'), 'utf-8'));

// Import storage-paths via tsx by resolving it dynamically
const storagePathsMod = await import(resolve(REPO_ROOT, 'src/lib/storage-paths.ts'));

const ts = {
  traits: (traitsJson.traits as Array<{ id: string; type: string; keys: string[]; direction: string; labels: { low: string; high: string }; unit: string }>).map((t) => ({
    id: t.id,
    type: t.type,
    keys: [...t.keys],
    direction: t.direction,
    labels: { low: t.labels.low, high: t.labels.high },
    unit: t.unit,
  })),
  cultivars: (cultivarsJson.cultivars as Array<{ id: string; pangenome?: boolean }>).map((c) => ({
    id: c.id,
    pangenome: Boolean(c.pangenome),
  })),
  reference: {
    sampleId: referenceJson.sampleId,
    displayName: referenceJson.displayName,
    longName: referenceJson.longName,
  },
  paths: {
    ogGeneCoordsPath_007: storagePathsMod.ogGeneCoordsPath('007'),
    ogRegionPointerPath: storagePathsMod.ogRegionPointerPath(),
    ogRegionGraphPath_6_4_OG0000987_cluster: storagePathsMod.ogRegionGraphPath(6, 4, 'OG0000987', 'baegilmi_chr02_10083653'),
    ogRegionGraphManifestPath_6_4: storagePathsMod.ogRegionGraphManifestPath(6, 4),
    ogRegionAfPath_6_4_heading_OG0000987_cluster: storagePathsMod.ogRegionAfPath(6, 4, 'heading_date', 'OG0000987', 'baegilmi_chr02_10083653'),
    ogRegionAfManifestPath_6_4_heading: storagePathsMod.ogRegionAfManifestPath(6, 4, 'heading_date'),
    ogRegionAfSummaryManifestPath_6_4: storagePathsMod.ogRegionAfSummaryManifestPath(6, 4),
    ogAlleleFreqPath_1_2_heading: storagePathsMod.ogAlleleFreqPath(1, 2, 'heading_date'),
    orthofinderOgMembersPath_1_000: storagePathsMod.orthofinderOgMembersPath(1, '000'),
    orthofinderBaegilmiAnnotationPath_1: storagePathsMod.orthofinderBaegilmiAnnotationPath(1),
    orthofinderOgCategoriesPath_1: storagePathsMod.orthofinderOgCategoriesPath(1),
  },
};

// ─── Compare ──────────────────────────────────────────────────────────

const errors: string[] = [];

function diff(label: string, a: unknown, b: unknown) {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa !== sb) errors.push(`${label}:\n    TS:     ${sa}\n    Python: ${sb}`);
}

diff('traits', ts.traits, py.traits);
diff('cultivars', ts.cultivars, py.cultivars);
diff('reference', ts.reference, py.reference);
for (const key of Object.keys(ts.paths) as Array<keyof typeof ts.paths>) {
  diff(`paths.${key}`, ts.paths[key], py.paths[key]);
}

if (errors.length > 0) {
  console.error('\n\x1b[31m✗ Cross-language parity failed:\x1b[0m\n');
  for (const e of errors) console.error(`  ${e}\n`);
  process.exit(1);
}

console.log('\n\x1b[32m✓ TS and Python SSOT views are equal\x1b[0m\n');
