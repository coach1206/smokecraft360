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

Sixteen tables pushed to PostgreSQL via Drizzle:

| File | Table | Notes |
|---|---|---|
| `users.ts` | `users` | Roles, level, JWT auth |
| `venues.ts` | `venues` | Venue profiles |
| `products.ts` | `products` | Full product catalog; `brandId`, `distributorId`, `campaignId` |
| `experiences.ts` | `experiences` | Per-user recommendation sessions |
| `brands.ts` | `brands` | Brand partners: name, category, distributorId, logoUrl, website |
| `analyticsEvents.ts` | `analytics_events` | Impression + event tracking (13 event types) |
| `orders.ts` | `orders` | Customer orders |
| `userPreferences.ts` | `user_preferences` | Preference snapshots (flavor, strength, mood) |
| `venueInventory.ts` | `venue_inventory` | Per-venue stock levels |
| `distributors.ts` | `distributors` | Distributor partners: name, state, contactEmail, website |
| `campaigns.ts` | `campaigns` | Sponsored campaign structure (future-ready) |
| `demandRequests.ts` | `demand_requests` | Guest requests for out-of-stock products (legacy OOS capture) |
| `demandEvents.ts`     | `demand_events`    | Comprehensive demand signals: selection, oos_request, order, blend_use, search |
| `orders.ts`           | `orders`           | Extended with: `verified`, `verifiedAt`, `verificationMethod`, `verifiedBy`, `xpAwarded` columns |
| `userProgression.ts`  | `user_progression` | 5-tier XP progression (one row per user); xp, totalVerifiedOrders, humidor stats |
| `userHumidor.ts`      | `user_humidor`     | Personal purchase history per user × product (verified orders only) |
| `userLoyaltyPoints.ts` | `user_loyalty_points` | Loyalty point balance per user (totalPoints, pointsRedeemed) — separate from XP |
| `rewards.ts`          | `rewards`          | Venue reward catalogue (discount / free_item / experience); levelRequired 0–4 |
| `redemptions.ts`      | `redemptions`      | Redemption records: pending → fulfilled / cancelled |

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
- Payload: `{ sub, email, role, name, venueId }`
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
| `GET /api/analytics/venue/:id` | Required | venue_owner, manager, super_admin |
| `POST /api/events` | None (auth optional) | Public — 11 valid event types |
| `POST /api/preferences` | None (auth optional) | Public — fire-and-forget snapshot |
| `GET /api/brands` | Required | venue_owner, manager, super_admin |
| `POST /api/brands` | Required | super_admin, venue_owner, manager |
| `PATCH /api/brands/:id` | Required | super_admin, venue_owner, manager |
| `GET /api/brands/:id/performance` | Required | super_admin, venue_owner, manager, brand_partner |
| `GET /api/distributors` | Required | venue_owner, manager, super_admin |
| `POST /api/distributors` | Required | super_admin only |
| `PATCH /api/distributors/:id` | Required | super_admin only |
| `GET /api/auth/me` | Required | Any authenticated user |

### Event Types (POST /api/events)

`view` · `swipe_right` · `swipe_left` · `save` · `boost_click` · `sponsored_view` · `recommendation_view` · `product_selected` · `pairing_selected` · `food_selected` · `order_created`

---

## Brands & Distributors System

### Data model
- `distributors` → `brands` (one-to-many via `distributorId`)
- `brands` → `products` (one-to-many via `brandId`)
- `campaigns` → links `brandId` + `distributorId` for time-boxed sponsored promotions

### Dashboard
`pages/Dashboard.tsx` now has four tabs:
- **Overview** — stats summary + live orders
- **Products** — boost/sponsored/image controls per product
- **Brands & Distributors** — `BrandsTab` component: distributor sidebar, brand cards with expandable product+impression detail, Campaigns future-ready panel
- **Analytics** — impression bars + sponsored performance charts

### Seeded demo data
- 3 distributors: Altadis USA (FL), General Cigar Holdings (TN), Moet Hennessy USA (NY)
- 5 brands: Montecristo, Romeo y Julieta (→ Altadis), Macanudo (→ General Cigar), Macallan, Glenfiddich (→ MH USA)

---

## Frontend Auth (`artifacts/smokecraft/src/`)

- `services/auth.ts` — API calls, JWT storage helpers, `getAuthHeaders()`
- `contexts/AuthContext.tsx` — `AuthProvider`, `useAuth()` hook
- `components/Auth/LoginModal.tsx` — Login/Register modal with role selector
- `App.tsx` — wraps all routes with `<AuthProvider>`
- `pages/Dashboard.tsx` — gated: unauthenticated → login prompt, wrong role → denied

---

## Verified Progression, Humidor & Competition System

### Level Tiers (`artifacts/smokecraft/src/lib/levels.ts`)

Both verified-orders AND xp thresholds must be met to advance:

| Index | Title | Min Orders | Min XP | Unlocks |
|---|---|---|---|---|
| 0 | Explorer | 0 | 0 | — |
| 1 | Enthusiast | 5 | 50 | — |
| 2 | Aficionado | 15 | 150 | — |
| 3 | Connoisseur | 30 | 350 | `isElite = true` |
| 4 | Maestro del Fuego | 60 | 700 | Band Creator + Signature Cigar |

### XP Awards (verified orders only)
- Cigar: +10 · Drink: +8 · Food: +4
- Full combo (all 3): +20 bonus
- First time trying a product: +5 bonus per new product

### Loyalty Point Awards (verified orders only, separate from XP)
- Cigar: +10 pts · Drink: +8 pts · Food: +5 pts
- Full combo (all 3): +25 bonus pts
- Welcome bonus (first order ever): +50 pts
- pointsBalance = totalPoints − pointsRedeemed

### Level-Based Perks
- Explorer (0): welcome bonus 50 pts
- Enthusiast (1): 5% discount rewards
- Aficionado (2): early product access rewards
- Connoisseur (3): VIP & priority service rewards
- Maestro del Fuego (4): elite access, events, custom cigar creation

### Backend Routes

| Endpoint | Auth | Purpose |
|---|---|---|
| `PATCH /api/orders/:id/verify` | staff+ | Mark order verified → award XP atomically |
| `GET /api/orders/:id/qr` | Required | Gold SVG QR code for order |
| `GET /api/orders/:id/verify-scan` | staff+ | QR scan landing → auto-verify |
| `GET /api/progression` | Required | User XP, level, humidor, recent orders |
| `GET /api/progression/leaderboard` | Required | Top 10 by XP / verified orders / 7-day trending |

### Services
- `artifacts/api-server/src/services/xpEngine.ts` — CAS-guarded XP + loyalty points awarding + humidor upsert
- Fraud prevention: only staff/manager/venue_owner/super_admin can verify; double-verify is idempotent

### Loyalty & Rewards Routes
| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/loyalty` | Required | User's points balance + available rewards + recent redemptions |
| `POST /api/loyalty/redeem` | Required | Redeem points for a reward (body: `{ rewardId }`) |
| `GET /api/loyalty/redemptions` | staff+ | All redemptions (admin queue) |
| `PATCH /api/loyalty/redemptions/:id` | staff+ | Mark pending → fulfilled / cancelled |
| `GET /api/rewards` | Required | Full rewards catalogue |
| `POST /api/rewards` | manager+ | Create a new reward |
| `PATCH /api/rewards/:id` | manager+ | Update reward (name, cost, active, level gate) |
| `DELETE /api/rewards/:id` | manager+ | Soft-deactivate a reward |

### Dashboard Tabs (staff-visible)
- **Verify Orders** — list pending/verified orders, one-click verify, QR modal, XP toast
- **Leaderboard** — Top Creators (by XP), Top Smokers (by orders), Trending (7 days)
- **My Progress** — loyalty points balance card, available rewards + one-click redeem, recent redemptions, XP level card, achievement badges, humidor
- **Loyalty & Rewards** (manager+) — create/edit/toggle rewards catalogue, redemption queue with fulfil/cancel controls

### Frontend
- `artifacts/smokecraft/src/components/Dashboard/VerifyOrdersTab.tsx`
- `artifacts/smokecraft/src/components/Dashboard/LeaderboardTab.tsx`
- `artifacts/smokecraft/src/components/Profile/ProfileBadge.tsx` — 5-tier arc/crown display
- `artifacts/smokecraft/src/lib/levels.ts` — `computeLevel()`, `levelProgress()`, `nextTier()`

### Scoring (Recommendation Engine)

- **+2** per overlapping flavor note
- **+3** mood tag match
- **-1** per unit of strength distance
- **+boost** from `boostLevel` (0–3), **+sponsored×2** applied in scorer (cap 5)
