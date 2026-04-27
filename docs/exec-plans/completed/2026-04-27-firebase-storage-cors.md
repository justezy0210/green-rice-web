# Firebase Storage CORS

## Goal

Fix deployed Firebase Hosting pages failing to fetch public Storage JSON/GZIP
assets from `green-rice-db.firebasestorage.app` because the bucket CORS policy
only allows localhost origins.

## Plan

1. Extend `cors.json` to allow the production Firebase Hosting origins.
2. Document the CORS deployment step so future Hosting releases do not miss it.
3. Apply the bucket CORS policy to `gs://green-rice-db.firebasestorage.app`.
4. Verify a deployed-origin CORS request receives `Access-Control-Allow-Origin`.
5. Commit and push the config/documentation changes.

## Result

- Added `https://green-rice-db.web.app` and
  `https://green-rice-db.firebaseapp.com` to `cors.json`.
- Added `docs/runbooks/firebase-hosting.md` with Hosting deploy and Storage
  CORS verification steps.
- Applied the CORS policy to `green-rice-db.firebasestorage.app` through the
  Google Cloud Storage JSON API using the Firebase CLI login session.
- Verified the failing `sv_matrix`, `gene_models`, and `gene_index` Storage
  URLs return `access-control-allow-origin:
  https://green-rice-db.web.app`.
