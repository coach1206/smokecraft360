# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Recommendation Engine

A modular, multi-category recommendation engine lives in `artifacts/api-server/src/`.

### Structure

```
artifacts/api-server/src/
├── data/
│   ├── cigars.ts       # 5 cigar products
│   └── alcohol.ts      # 5 alcohol products (bourbon, scotch, rye)
├── engine/
│   ├── types.ts        # Shared interfaces (Product, RecommendRequest, etc.)
│   ├── scorer.ts       # Flavor/strength/mood scoring logic
│   ├── pairing.ts      # Cross-category pairing logic
│   ├── registry.ts     # Central product registry (add new categories here)
│   └── recommend.ts    # Top-level engine entry point
└── routes/
    ├── recommend.ts    # POST /api/recommend route + validation
    └── index.ts        # Router assembly
```

### Endpoint

**POST /api/recommend**

```json
// Request
{
  "category": "cigar",
  "flavorPreferences": ["smoky", "sweet"],
  "strength": 4,
  "mood": "relaxed"
}

// Response
{
  "recommendations": [ ...top 3 products with score ],
  "pairings":        [ ...up to 2 cross-category products ]
}
```

Supported categories: `cigar`, `alcohol`

### Scoring

- **+2** per overlapping flavor note
- **+3** mood tag match
- **-1** per unit of strength distance

### Expanding to New Categories

1. Add a dataset file in `src/data/` (e.g. `coffee.ts`)
2. Import it in `src/engine/registry.ts` and add to the `datasets` map
3. Add a pairing mapping entry in `pairingCategories` if applicable
4. No changes needed elsewhere

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
