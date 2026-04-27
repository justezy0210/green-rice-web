# Firebase Hosting Runbook

Last updated: 2026-04-27

This runbook covers the public web deploy for Green Rice DB.

## Preconditions

- Firebase project access for `green-rice-db`.
- Firebase CLI is logged in with an account that can deploy Hosting.
- Storage CORS has been applied whenever `cors.json` changes.

## Deploy Hosting

```bash
npm run lint
npm run type-check
npm run check:arch
npm run build
firebase deploy --only hosting --project green-rice-db
```

Hosting serves the Vite `dist/` directory. The `firebase.json` Hosting rewrite
routes every path to `/index.html`, so React Router deep links such as
`/og/OG0041659`, `/sv/EV0016276`, and `/discovery/locus/...` survive refreshes.

## Storage CORS

The app fetches large public JSON/GZIP artifacts directly from Firebase Storage
REST URLs, for example:

- `gene_index/v6/by_prefix/*.json`
- `gene_models/v6/by_prefix/*.json`
- `sv_matrix/sv_v1/events/by_chr/*.json.gz`

Because those URLs are on `firebasestorage.googleapis.com`, the bucket must
allow browser requests from the deployed Hosting origins in `cors.json`.

Apply the CORS policy after changing `cors.json`:

```bash
gcloud storage buckets update gs://green-rice-db.firebasestorage.app \
  --cors-file=cors.json
```

Equivalent legacy command:

```bash
gsutil cors set cors.json gs://green-rice-db.firebasestorage.app
```

Verify the deployed origin receives a CORS response:

```bash
curl -I \
  -H "Origin: https://green-rice-db.web.app" \
  "https://firebasestorage.googleapis.com/v0/b/green-rice-db.firebasestorage.app/o/gene_index%2Fv6%2Fby_prefix%2FBA.json?alt=media"
```

The response should include:

```text
access-control-allow-origin: https://green-rice-db.web.app
```

