# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────┐
│                    Browser (SPA)                     │
│                                                     │
│  Pages ← Components ← Hooks ← Lib ← Types          │
│                                  ↕                   │
│                            Firebase SDK              │
└─────────────────────────────────────────────────────┘
                         │
                    ┌────┴────┐
                    │ Firebase │
                    │ Backend  │
                    ├──────────┤
                    │ Auth     │
                    │ Firestore│
                    │ Storage  │
                    │ Functions│
                    └──────────┘
```

## Layer Architecture

The dependency direction is strictly enforced via `npm run check:arch`.

```
Types (rank 0)  — Pure type definitions, no imports
  ↓
Lib (rank 1)    — Services, utilities, helpers
  ↓
Hooks (rank 2)  — React hooks for state + data fetching
Context (rank 2)— React context providers
  ↓
Components (rank 3) — UI components
  ↓
Pages (rank 4)  — Route entry points
```

See [references/dependency-layers.md](references/dependency-layers.md) for violation examples.

## Data Model (Firestore)

```
firestore/
├── cultivars/
│   └── {cultivarId}/
│       ├── name: string
│       ├── daysToHeading: { early, normal, late }
│       ├── morphology: { culmLength, panicleLength, panicleNumber }
│       ├── yield: { spikeletsPerPanicle, ripeningRate }
│       ├── quality: { grainWeight, preHarvestSprouting }
│       ├── resistance: { bacterialLeafBlight: { k1, k2, k3, k3a } }
│       ├── crossInformation: string
│       └── genomeSummary?: { status, assembly, geneAnnotation, repeatAnnotation, files }
└── (future: users/, metadata/)
```

## Key Data Flows

### Phenotype Display
```
Firestore → data-service.ts → usePhenotypeData() → DashboardPage / ComparisonPage / DataTablePage
```

### Cultivar Admin CRUD
```
AdminPage → cultivar-service.ts → Firestore
                                ↘ GenomeUploadPanel → genome-upload-service.ts → Storage + Firestore
```

### Genome Upload Pipeline
```
File input → uploadBytesResumable (Storage) → updateFileStatus (Firestore)
                                             → Cloud Function (future) → parse → genomeSummary
```

## Security

- Auth: Firebase Auth (Email/Password, Google OAuth)
- Firestore rules: public read, authenticated write
- Storage rules: authenticated upload only
- All secrets via environment variables (enforced by ESLint + check:arch)
