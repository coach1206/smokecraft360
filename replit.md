# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (`@workspace/db`)
- **Auth**: JWT via `jose` (HS256, 7-day), bcryptjs password hashing
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Build**: esbuild (ESM bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

---

## Project: SmokeCraft

Luxury cigar & spirits recommendation app. Dark gold theme, glassmorphism cards, Cormorant Garamond + Inter.

### Artifacts

| Artifact | Path | Purpose |
|---|---|---|
| `artifacts/smokecraft` | `/` | React + Vite frontend |
| `artifacts/api-server` | `/api` | Express 5 API |

---

## Database Schema (`lib/db/src/schema/`)

Six tables pushed to PostgreSQL via Drizzle:

| File | Table | Notes |
|---|---|---|
| `users.ts` | `users` | Roles, level, JWT auth |
| `venues.ts` | `venues` | Venue profiles |
| `products.ts` | `products` | Full product catalog with boost/sponsored flags |
| `experiences.ts` | `experiences` | Per-user recommendation sessions |
| `brands.ts` | `brands` | Brand partner records |
| `analyticsEvents.ts` | `analytics_events` | Impression + event tracking |

---

## Auth System (`artifacts/api-server/src/`)

### Files

- `lib/jwt.ts` — `signToken(payload)` / `verifyToken(token)` using `jose` + `SESSION_SECRET`
- `middleware/auth.ts` — `requireAuth` middleware, `requireRole(...roles)` factory
- `routes/auth.ts` — `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`

### Roles

`super_admin | venue_owner | manager | staff | brand_partner | customer`

- First registered user auto-becomes `super_admin`
- Dashboard access requires: `super_admin`, `venue_owner`, or `manager`
- `super_admin` bypasses all role checks

### JWT

- Algorithm: HS256, expiry 7d
- Secret: `process.env.SESSION_SECRET`
- Payload: `{ sub, email, role, name }`
- Header: `Authorization: Bearer <token>`
- Frontend storage: `localStorage` (`smokecraft_auth_token` / `smokecraft_auth_user`)

---

## Recommendation Engine (`artifacts/api-server/src/engine/`)

### Structure

```
engine/
├── types.ts        # Shared interfaces (Product, RecommendRequest, ScoredProduct…)
├── scorer.ts       # Flavor/strength/mood/boost scoring
├── pairing.ts      # Semantic cross-category pairing rules
├── food.ts         # Food pairing scorer
├── registry.ts     # Central product registry (static arrays; add new categories here)
├── recommend.ts    # Top-level engine entry point (fire-and-forget analytics writes)
└── inventory.ts    # In-memory boost cache backed by PostgreSQL (initInventory, trackImpression)
```

### Inventory Init Flow

1. `initInventory()` called before server accepts connections
2. If `products` table empty → seeds from `data/cigars.ts` + `data/alcohol.ts`
3. Loads boost/sponsored state + aggregated impression counts into memory
4. `PATCH /api/inventory/:id` → updates both memory and DB

### Analytics

- Every recommendation call writes `recommendation` / `sponsored_view` events to `analytics_events` (async, fire-and-forget)
- `GET /api/analytics` aggregates from PostgreSQL

---

## Protected Endpoints

| Endpoint | Auth | Roles |
|---|---|---|
| `POST /api/recommend` | None | Public |
| `GET /api/inventory` | None | Public |
| `PATCH /api/inventory/:id` | Required | venue_owner, manager, super_admin |
| `GET /api/analytics` | Required | venue_owner, manager, super_admin |
| `GET /api/auth/me` | Required | Any authenticated user |

---

## Frontend Auth (`artifacts/smokecraft/src/`)

- `services/auth.ts` — API calls, JWT storage helpers, `getAuthHeaders()`
- `contexts/AuthContext.tsx` — `AuthProvider`, `useAuth()` hook
- `components/Auth/LoginModal.tsx` — Login/Register modal with role selector
- `App.tsx` — wraps all routes with `<AuthProvider>`
- `pages/Dashboard.tsx` — gated: unauthenticated → login prompt, wrong role → denied

### Scoring (Recommendation Engine)

- **+2** per overlapping flavor note
- **+3** mood tag match
- **-1** per unit of strength distance
- **+boost** from `boostLevel` (0–3), **+sponsored×2** applied in scorer (cap 5)
