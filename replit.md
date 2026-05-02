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
| `loungeStats.ts`      | `lounge_stats`     | Aggregated per-venue competition stats: weekly/total orders, users, repeatCustomers, trendingScore, weeklyRank, badges |

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

### Device Management Routes
| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/devices` | manager+ | List all registered devices for the user's venue |
| `POST /api/devices` | manager+ | Register a new device (type, nickname, tableNumber) |
| `PATCH /api/devices/:id` | manager+ | Update nickname / tableNumber / status |
| `DELETE /api/devices/:id` | manager+ | Remove a device |
| `GET /api/devices/:id/metrics` | manager+ | Usage stats: sessions, orders, resets, avg session time, reset breakdown |
| `POST /api/devices/:id/reset` | staff+ | Staff-triggered session reset (closes open session) |
| `POST /api/devices/:id/session` | auth | Start (`action: "start"`) or end (`action: "end"`) a device session |
| `GET /api/devices/venue-qr/:venueId` | auth | SVG QR code for venue (optional ?tableNumber=&mode=normal/tablet/kiosk) |

**DB Tables:**
- `devices` — id, venueId, type (mobile/tablet/kiosk), nickname, tableNumber, status, lastActiveAt
- `device_sessions` — id, deviceId, venueId, tableNumber, userId, orderPlaced, resetReason, startedAt, endedAt

**Kiosk Mode (client-side):**
- Activated via URL params: `?mode=kiosk&venueId=X&tableNumber=Y&deviceId=Z`
- 90-second inactivity timer → 10-second countdown overlay → auto-reset to home
- Full-screen API requested automatically on kiosk mount
- `KioskModeProvider` wraps App; `KioskModeBanner` shows mode + reset button
- `?mode=tablet` shows the banner without the inactivity timer

**Pricing config** (`artifacts/smokecraft/src/config/devicePricing.ts`):
- Tablet: $35/mo rental · $350 one-time purchase
- Kiosk: $199/mo rental · $1,600 one-time purchase
- Plan bundles: BASE (QR only, free), EXPERIENCE (1 kiosk + tablets, $99/mo), ELITE (unlimited, $249/mo)
- `venuePlanToBundle(plan)` maps basic→BASE, mid→EXPERIENCE, premium→ELITE

### Lounge League Routes
| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/lounge-league` | Required | Full ranked leaderboard — all venues with scores + badges (upserts lounge_stats) |
| `GET /api/lounge-league/my-lounge` | Required | Current user's venue rank + total venues |
| `GET /api/lounge-league/:id` | Required | Single venue stats + rank |

Scoring: `totalVerifiedOrders×10 + weeklyOrders×25 + totalUsers×5 + repeatCustomers×8`
Badges computed per request: `top_rated` (#1 score), `most_active` (most verified orders), `trending_venue` (most weekly orders), `best_experience` (highest repeat customer ratio)

### Signature Requests Schema Extension
`signatureRequests` table now has `boxDesign TEXT` column (JSON). `BoxDesign` type: `{ boxColor, logoPlacement, labelText, limitedEditionName, finishStyle }`. Modal is now a 4-step flow: Band → Spec → Box Design → Review.

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

### Global Design System (`src/index.css`)

**CSS custom properties (`:root`):**
- Gold: `--sc-gold`, `--sc-gold-accent`, `--sc-gold-dim`, `--sc-gold-muted`, `--sc-gold-glow`, `--sc-gold-ultra`
- Surfaces: `--sc-bg`, `--sc-panel`, `--sc-panel-dark`, `--sc-surface`, `--sc-border`, `--sc-border-subtle`
- Text: `--sc-text-primary`, `--sc-text-muted`, `--sc-text-dim`
- Spacing: `--sc-space-sm/md/lg` (16/24/32px), Radius: `--sc-radius-sm/md/lg` (12/16/20px)
- Blur: `--sc-blur-sm/md/lg`, Transition: `--sc-transition`

**Glass utility classes:**
- `.glass-panel` — semi-transparent dark, blur(18px), gold border, depth shadow + inner highlight
- `.glass-panel-dark` — deeper version (sidebar, overlays), blur(24px)
- `.glass-panel-hero` — elevated hero card, blur(24px), stronger gold border + glow

**Button classes:**
- `.sc-btn-primary` — gold fill, 48px min-height, shimmer hover + glow shadow, scale:0.97 on press
- `.sc-btn-ghost` — outline gold, hover: background tint + brighter border

**Kiosk utilities:** `.kiosk-target` (56px min), `.kiosk-text` (16px), `.kiosk-spacing`, `.kiosk-mode` touch rules

**Typography:** Playfair Display (headlines) + Cormorant Garamond (serif) + Inter (body) — all from Google Fonts

### Experience Layout System

**`ExperienceSidebar`** (`src/components/ExperienceSidebar.tsx`)
- Fixed left panel (220px wide, hidden below lg)
- 7 steps: Experience → Flavor → Strength → Mood → Curate → Pairing → Reveal
- Step states: `active` (gold glow + pulse ring), `completed` (check mark + dimmed gold), `locked` (32% opacity)
- Active step computed dynamically from Home.tsx form state (flavors, strengthTouched, moodTouched, phase, orderTaken)

**`ExperienceRightPanel`** (`src/components/ExperienceRightPanel.tsx`)
- Fixed right panel (300px wide, hidden below xl)
- Shows in results phase: product name, tier, strength, mood, tasting notes chips, pairing tags, pairing card
- Uses `.sc-btn-primary` + `.sc-btn-ghost` for Order / Save actions

**`AmbientBackground`** (enhanced)
- 7-layer system: deep warm base → overhead lamp pools → leather/mahogany fills → cinema vignette → film grain → slow smoke wisps → top gold arc glow

**Home.tsx integration:**
- `ExperienceSidebar` injected directly into render tree (self-positions fixed)
- Right panel rendered conditionally in results phase as a fixed `<aside>`
- Main content area: `lg:ml-[220px] xl:pr-[300px]` responsive offset
- Step tracking state: `strengthTouched`, `moodTouched`, `orderTaken` — auto-advance sidebar as user fills in form

### Dashboard Tabs (staff-visible)
- **Verify Orders** — list pending/verified orders, one-click verify, QR modal, XP toast
- **Leaderboard** — Top Creators (by XP), Top Smokers (by orders), Trending (7 days)
- **My Progress** — loyalty points balance card, available rewards + one-click redeem, recent redemptions, XP level card, achievement badges, humidor
- **Loyalty & Rewards** (manager+) — create/edit/toggle rewards catalogue, redemption queue with fulfil/cancel controls
- **Signature Creations** — user's own signature cigar requests + status progress + box design details; Maestro-gated "New Design" button opens 4-step modal
- **Lounge League** — full ranked leaderboard of all venues, weekly highlights (Top Lounge / Best Experience / Trending), "You helped your lounge rank #X" contribution card, badge legend, scoring guide
- **Device Manager** (manager+) — plan bundle banner, registered device list (type/status/table/last-active), add/enable/disable/delete/reset controls, per-device metrics panel (sessions/orders/resets/avg time), hardware pricing cards (tablet/kiosk), venue QR code generator (mode-aware: normal/tablet/kiosk, per-table or venue-wide, downloadable SVG), mode guide

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
