# Security

## Secret Management

- **No hardcoded secrets.** Enforced by ESLint (`no-restricted-syntax`) and `check:arch` secret scanner.
- All secrets in `.env` with `VITE_FIREBASE_*` prefix.
- `.env` is in `.gitignore` — never committed.
- New env vars require `.env.example` update.

## Detected Patterns (check:arch)

The architecture checker scans for:
- Firebase/Google API keys (`AIza...`)
- Google OAuth client IDs
- OpenAI API keys (`sk-...`)
- GitHub tokens (`ghp_...`), GitLab tokens (`glpat-...`)
- Slack tokens (`xox...`), Stripe keys (`pk_/sk_...`)
- Hardcoded password/secret assignments

## Firebase Security Rules

### Firestore (`firestore.rules`)
- **Read:** Public (all documents)
- **Write:** Authenticated users only

### Storage (`storage.rules`)
- **Upload:** Authenticated users only
- **Path:** `genomes/{cultivarId}/{filename}`

## Authentication
- Providers: Email/Password, Google OAuth
- Auth state managed via `src/context/AuthContext.tsx`
- Protected routes via `src/components/auth/ProtectedRoute.tsx`

## OWASP Considerations
- No raw HTML injection (React JSX auto-escapes)
- No SQL (Firestore NoSQL)
- Firebase SDK handles transport security (HTTPS)
- No user-generated content rendered as HTML
