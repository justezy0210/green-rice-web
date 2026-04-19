# Generated manifests

**Do not edit these files directly.**

Canonical source lives at the repo root: `data/traits.json`,
`data/cultivars.json`, `data/reference.json`. These copies exist because
Firebase Functions only bundles files under `functions-python/` at deploy
time — the root `data/` directory is outside the deploy sandbox.

To regenerate after editing the canonical files:

```bash
npm run sync:manifests
```

`npm run check:manifest-freshness` fails the build if these copies are out
of date. Commit the regenerated copies alongside the source edit.
