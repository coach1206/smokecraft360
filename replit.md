# Overview

SmokeCraft is a luxury cigar and spirits recommendation platform designed for upscale lounges and venues. It offers personalized recommendations, inventory management, a loyalty and progression system, and fosters venue competition. The platform aims to integrate a sophisticated recommendation engine with robust user engagement features, targeting a discerning clientele, and expanding into a multi-craft "Experience Engine" for various luxury preferences.

# User Preferences

I prefer concise and direct communication. When making changes, prioritize core functionality and architectural integrity. For any significant architectural decisions or major feature implementations, please ask for approval before proceeding. I prefer that you do not make changes to files related to changelogs or update logs.

# System Architecture

## Monorepo Structure

The project uses a pnpm workspace monorepo with TypeScript, separating the frontend (React + Vite in `artifacts/smokecraft`) from the backend (Express 5 API in `artifacts/api-server`).

## Tech Stack

- **Node.js**: 24
- **TypeScript**: 5.9
- **API Framework**: Express 5
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT (HS256, 7-day expiry) using `jose`, `bcryptjs` for password hashing. Supports various roles including `super_admin`, `venue_owner`, `manager`, `staff`, `brand_partner`, and `customer`.
- **Validation**: Zod
- **Build**: esbuild (ESM bundle)

## UI/UX and Design

The application features a luxury aesthetic with a dark gold theme, glassmorphism cards, and a sophisticated typography palette (Cormorant Garamond, Inter, Playfair Display). A global design system uses CSS custom properties for consistent theming and effects. Key visual elements include `.glass-panel` classes for semi-transparent backgrounds and `sc-btn-primary`/`sc-btn-ghost` for buttons.

## Core Features and Implementations

### Recommendation Engine

Located in `artifacts/api-server/src/engine/`, it uses a scoring mechanism based on flavor, strength, mood, and boost levels. It includes modules for semantic cross-category pairing (cigar↔alcohol, cigar↔beer), food pairing, and a central product registry.

### AI Experience Engine

A unified layer providing deterministic natural-language commentary, voice synthesis (via ElevenLabs), and real orderable menu suggestions based on the recommendation engine's output. It includes a `menu_items` Drizzle table, a templated `aiCommentary` builder, and a `menuSuggestion` tag-overlap ranker.

### Operations Layer

This layer provides features for POS integration, reorder alerts, optimized menu layout, profit calculations, and staff sales pitches. It leverages existing database tables with new pure functions and API routes. Key features include tenant isolation for API routes, Zod validation for POS webhooks, and atomic inventory decrement on orders.

### Frontend Cinematic Boot Intro

A splash screen `BootIntro` component gates the main application, playing a cinematic sequence with audio and motion blur. It is designed to run once per session and offers skip controls.

### Browser-TTS Entry Cues

Utilizes the Web Speech API (`useBrowserSpeech` hook) for zero-cost, low-latency ambient voice cues on the entry portal (`Intro.tsx`), distinct from the server-side ElevenLabs TTS used for content delivery.

### Image Engine

A context-aware image resolution system (`services/imageContext.ts`, `services/imageResolver.ts`) that applies Cloudinary transforms based on context (e.g., time of day, mood), handles subtype-based fallbacks, and provides an API for image resolution.

### Network Intelligence Layer

Introduces "Couples Mode" for blending two user profiles into a single recommendation, incorporates "Time-of-day context" into the recommendation engine for subtle nudges, and provides "Historical-data revenue forecast" and "Cross-venue low-stock digest" for business insights.

### BrewCraft and PourCraft Pages

Dedicated kiosk-style pages (`BrewCraft.tsx`, `PourCraft.tsx`) for beer and whisky-led pairing experiences. These pages leverage the existing `/api/recommend` endpoint and share layout primitives (`ExperienceFrame`), demonstrating a modular approach to expanding craft experiences.

### Personalization & Revenue Intelligence

Adds four systems:
1.  **Taste Profile**: Derives user affinity vectors from `user_preferences`.
2.  **Auto-Recommend**: Extends the engine to use taste profiles for a bounded affinity bonus.
3.  **Session Revenue Forecast**: Pure function predicting session revenue based on user interactions.
4.  **Smart Pricing**: Deterministic dynamic pricing based on user intent and session activity, capped within defined guardrails.

### Database Schema

Sixteen tables manage various aspects including users, products, experiences, loyalty, inventory, and lounge statistics. Notable tables include `users` (roles, progression), `products` (catalog), `experiences` (sessions), `user_progression`, `user_humidor`, `lounge_stats`, and `signatureRequests` (custom cigar requests).

### Authentication and Authorization

JWT-based authentication with `requireAuth` middleware and a `requireRole` factory ensures granular access control based on user roles.

### Progression and Loyalty System

A 5-tier user progression system (Explorer to Maestro del Fuego) tied to verified orders and XP thresholds, unlocking perks. A separate loyalty points system awards bonuses for orders. Rewards are venue-specific. The `Humidor` tracks personal purchase history.

### Device Management

Supports mobile, tablet, and kiosk devices with registration, status tracking, and session management. Kiosk mode includes inactivity timers and full-screen integration. Device pricing plans are defined.

### Lounge League

A competition system ranking venues based on performance metrics like orders and repeat customers, awarding badges.

### Reservations (Brief 42 — B+C)

Distinct from instant orders. The `reservations` table (`lib/db/src/schema/reservations.ts`) holds RSVP / hold-the-spot requests with a `pending → accepted | rejected | cancelled → fulfilled | no_show` lifecycle. A `paymentMode` column carries one of `none | deposit | pay_at_venue` (folding the "pay at venue" option into the reservation rather than touching the existing Stripe checkout). `depositCents` + `depositPaymentIntentId` columns are present so a follow-up brief can wire Stripe deposits without another migration. Routes live at `/api/reservations` (POST create, GET /mine, GET /venue/:venueId, PATCH /:id/status). POST hard-binds `venueId` to `req.user.venueId` for venue staff (cross-tenant injection ignored). PATCH uses an atomic conditional UPDATE (WHERE id=? AND status=expectedCurrent) to prevent state-machine race conditions; the loser of a concurrent PATCH receives 409. Venue staff manage the queue from the new "Reservations" tab in the dashboard, which also captures walk-ins via a "+ New Reservation" form.

### IP Vault + NDA (Brief IP=1 — surgical slice)

Owner-only intellectual-property evidence registry inside SmokeCraft. The `ip_assets` table (`lib/db/src/schema/ipAssets.ts`) stores title, kind (`spec | design | code | trademark | doc | other`), description, optional `fileUrl` (https-only), optional `fileHash` (32-128 hex; SHA-256 etc), authorship attribution, status (`draft → registered | disputed → retired`), and registration metadata (`registeredAt`, `registeredBy`). Soft-delete via `retiredAt` so prior registrations stay auditable. Indexed on `status` and `kind`.

NDA gate is implemented as three columns on `users` (`nda_signed_at`, `nda_signature_name`, `nda_signature_ip`) — single-signature, idempotent (re-signing returns the original timestamp via atomic conditional UPDATE WHERE `nda_signed_at IS NULL`). Routes at `/api/nda` (GET /me, POST /sign).

IP vault routes at `/api/ip-vault` are super_admin-only AND NDA-gated (412 Precondition Failed with `requiresNda: true` payload pointing the client at `/api/nda/sign` if missing): GET list (`?status=`, `?includeRetired=true`), GET one, POST create (draft), PATCH update (title/desc/status/notes/fileUrl/fileHash/authorship — guarded against retired rows), POST `/:id/register` (atomic draft → registered with WHERE status='draft' guard; 409 if already registered or not draft), DELETE soft-retire. The "IP Vault" dashboard tab renders an inline NDA signing modal first, then the asset list with Register / Mark Disputed / Retire actions per row and a New Asset form (title/kind/desc/fileUrl/fileHash/authorship/notes). 21/21 e2e probes passed.

### Demo NDA Gate (additive — does NOT replace IP-vault NDA)

Two distinct NDA flows now coexist:

1. **IP-vault NDA** (existing, untouched) — `GET/POST /api/nda/me` + `/sign`,
   3 cols on `users` (`ndaSignedAt`, `ndaSignatureName`, `ndaSignatureIp`).
   Lightweight, idempotent, name-only, requires login. Gates super_admin
   access to the IP vault.

2. **Demo-gate NDA** (new) — full ceremony captured at `/demo` before login.
   - Schema: `nda_signatures` (id, fullName, initials, signatureData base64,
     agreed, ipAddress, deviceType, sessionId, createdAt + index on createdAt).
   - `POST /api/nda/demo-sign` — public; validates fullName 2–200, initials
     1–12, signatureData is base64 PNG/JPEG dataURL ≥ 2 KB and ≤ 256 KB,
     `agreed===true`. Strips unknown fields via `allowOnly`. Server-generated
     timestamp + IP + UA-classified deviceType.
   - `GET /api/nda/signatures` — super_admin only, latest 100, omits
     signatureData blob.
   - `GET /api/nda/signatures/:id` — super_admin only, full row including blob.
   - Frontend: `/demo` route → `<DemoNdaModal/>` with full name + initials
     inputs, `<SignaturePad/>` (Pointer Events: mouse + touch + pen,
     `touch-action:none`, hi-DPI scaled), agree checkbox. Submit disabled
     until all fields complete and ink drawn. On success: sessionStorage flag
     `demoNdaSigned=1`, fade-out 300ms, navigate `/intro`. Reload-resistant.

## Voice Queue (G4)

Backend-only slice. Inbound counterpart to `/api/voice/speak` (which is
outbound TTS via ElevenLabs). Holds transcripts captured AT the kiosk
for downstream worker processing (intent parsing, staff dispatch, etc.).

**Schema** (1 new table, no destructive changes):
- `voice_commands` — `id`, `userId` (nullable, anon kiosk OK), `venueId`
  (nullable), `transcript` (text, ≤1000 route-enforced), `status`
  (`pending` | `claimed` | `completed` | `failed`), `claimedBy` (worker
  user_id), `result` (jsonb), `errorMessage` (text), `retries` (int,
  default 0), `createdAt`, `claimedAt`, `completedAt`. Index on
  `(venueId, status, createdAt)` for the worker poll.

**Routes** mounted at `/api/voice-queue`:
- `POST /` — public enqueue (kiosks need to write without auth), but
  every request MUST resolve a `venueId` (from body or Bearer token);
  otherwise 400. This eliminates a shared global "anonymous bucket"
  that one bad actor could DoS. Atomic capped INSERT — only counts
  pending rows for that venue against the cap (completed/failed don't
  crowd). 0 rows ⇒ 429.
- `GET /` — staff/admin/super_admin only; lists caller's venue's
  pending (or `?status=…`); super_admin can `?venueId=…` to override.
- `POST /:id/claim` — staff+ atomic claim
  (`UPDATE … WHERE status='pending' RETURNING …`). Two workers race
  same id ⇒ exactly one 200, others 409.
- `POST /:id/complete` — claimer-only atomic finish with optional
  `{result}` jsonb. 0 rows ⇒ 404 (folds not-claimed-by-you / wrong
  status / unknown into one code to avoid lifecycle leak).
- `POST /:id/fail` — claimer-only atomic fail with `{errorMessage}`;
  increments `retries`. Same 0-row → 404 fold.
- `DELETE /:id` — super_admin purge.

**Hard cap:** `MAX_PENDING_PER_VENUE = 200`. Verified by 5-way parallel
enqueue at cap-1 → 1×201 + 4×429, count never exceeds 200; and 5-way
parallel claim of the same id → 1×200 + 4×409.

**New limiter:** `voiceQueueEnqueueLimiter` (15/min/IP) — kiosks should
not flood. The per-venue 200-pending cap is the hard backstop, this is
the noise filter.

**Out of scope (call out for next slice):** SSE/socket worker push,
server-side STT (this slice trusts the client to send the transcript
text — Whisper/etc. integration is downstream), retry-with-backoff
scheduler, dead-letter handling, frontend UI.

## AI Memory (G3)

Backend-only slice. Provides recallable per-user "facts" an AI assistant
can pull on subsequent visits — distinct from `userPreferences`, which is
a fire-and-forget time-series of recommendation snapshots.

**Schema** (1 new table, no destructive changes):
- `user_memories` — `id`, `userId`, `venueId` (nullable), `key` (slug,
  ≤64 chars), `value` (text, ≤500 chars), `source` (`manual` |
  `inferred`), `confidence` (0..1, default 1.0), `createdAt`,
  `updatedAt`, `lastUsedAt` (nullable). Unique on `(userId, key)` —
  upserting the same key replaces value in place.

**Routes** mounted at `/api/memories`, all authed and strictly
owner-scoped (no admin override surface — that's a separate route file
when needed):
- `GET /` — current user's memories, ordered `lastUsedAt DESC NULLS
  LAST, updatedAt DESC`, capped at 50 returned.
- `POST /` — upsert by key. **Atomic capped upsert**: single
  `INSERT … SELECT WHERE EXISTS(same key) OR (count < cap) ON CONFLICT
  DO UPDATE …`. New keys are gated by the per-user cap; existing-key
  upserts bypass the cap (in-place update). 0 rows returned ⇒ 409.
- `PATCH /:id` — owner-gated atomic update of `value` / `confidence`,
  and/or `touch:true` to set `lastUsedAt = now()`. 0 rows ⇒ 404.
- `DELETE /:id` — owner-gated atomic delete. 0 rows ⇒ 404.

**Hard cap:** `MAX_MEMORIES_PER_USER = 50`. Verified by 5-way parallel
distinct-key insert at cap-1 → exactly 1×201, 4×409, final count = 50;
and 5-way same-key race → 5×201, 1 row (atomic ON CONFLICT collapse).

**Cross-user isolation verified:** PATCH/DELETE/GET on another user's
memory returns 404 / empty list, not 403, to avoid leaking existence.

**Out of scope (call out for next slice):** AI inference pipeline that
auto-creates `source='inferred'` memories from chat/recs, surfacing
memories inside `/api/recommend` prompts, frontend UI, vector embeddings
/ semantic search, multi-tenant sharing.

## Multi-User Sessions (G2)

Backend-only slice. Provides the grouping primitive ("party") that future
slices (group orders, joint loyalty, shared recommendations) will hang
behaviour off.

**Schema** (2 new tables, no destructive changes):
- `sessions` — `id`, `venueId`, `hostUserId`, `code` (6-char A-Z0-9, no
  ambiguous 0/O/1/I/L), `status` (`active` | `closed`), `createdAt`,
  `closedAt`. **Partial unique index** `sessions_code_active_unique` on
  `code WHERE status='active'` — codes are unique only among active
  sessions and freed on close.
- `session_members` — `(sessionId, userId)` unique-paired, `role`
  (`host` | `guest`), `joinedAt`, `leftAt` (nullable; null = present).

**Routes** mounted at `/api/sessions`:
- `POST /` — host (any authed user) creates a session. Code generated
  randomly, retried up to 5× on partial-index collision.
- `POST /join` — guest joins by code. Body schema normalises to
  uppercase. Behind `sessionJoinLimiter` (30/min/IP). **Atomic capped
  insert**: `INSERT ... SELECT WHERE (live count) < MAX_MEMBERS ON
  CONFLICT DO UPDATE SET left_at=NULL` — re-join is idempotent, cap
  cannot be exceeded under concurrent floods.
- `GET /:id` — visibility-gated to current (non-left) members only.
- `POST /:id/leave` — guest can leave; host gets 409 (must close instead).
- `POST /:id/close` — atomic host-only close (`UPDATE WHERE host AND
  status='active'`). 0-row update path distinguishes 404 / 403 / 409.

**Hard cap:** `MAX_MEMBERS = 20` per session. Enforced atomically inside
the join INSERT; verified by 5-way parallel-join race test on a
1-slot-free session → exactly 1 success, 4 × 409, final count = 20.

**Out of scope (call out for next slice):** real-time presence/sockets,
session-scoped chat, group-order tying, frontend UI.

## Reward Redemption (G1)

The schema (`rewardsTable`, `redemptionsTable`, `userLoyaltyPointsTable`),
routes (`/api/loyalty/*`, `/api/rewards/*`), and admin tab
(`LoyaltyRewardsTab`) were already in place from earlier work. This pass
only added the missing race-safety hardening on `POST /api/loyalty/redeem`:

- **Atomic conditional debit**: replaced the SELECT-balance → check →
  UPDATE +cost flow (which let two parallel redeems both pass the check
  and overdraft) with a single `UPDATE ... WHERE (total_points -
  points_redeemed) >= cost RETURNING ...`. If the UPDATE returns 0 rows,
  the race was lost OR the user genuinely lacks balance — re-fetch the
  truth and return 402. Same atomic-claim pattern used by the offline
  queue. Verified: 5 parallel redeems at exactly cost-equal balance →
  exactly 1 succeeds, 4 × 402, final balance = 0, no overdraft.
- **Pre-existing behaviour preserved**: tier gate (403), inactive reward
  (404), invalid UUID (400), anon (401), fresh user with no balance row
  (still 402, no crash). 16/16 happy-path probes still pass.

## Package Update Policy (Brief D)

Surgical, non-destructive updates only. The workspace runs `pnpm audit` clean
(0 / 0 / 0 / 0 / 0) as of this snapshot.

- **Catalog (`pnpm-workspace.yaml`)**: bumps applied to `@tailwindcss/vite`,
  `tailwindcss`, `@tanstack/react-query`, `@types/node`, `framer-motion`,
  `@replit/vite-plugin-cartographer`. `react` / `react-dom` are pinned to
  exact `19.1.0` to stay compatible with Expo's required peer.
- **Per-package patches**: `react-hook-form` (smokecraft + mockup-sandbox),
  `orval`, `@types/pg`, `drizzle-kit`, `prettier`. `@types/bcryptjs`
  removed (deprecated; bcryptjs ships its own types).
- **Security overrides** (transitive vuln remediation, no API impact):
  `brace-expansion ≥2.0.3`, `picomatch ≥4.0.4`, `yaml ≥2.8.3`,
  `path-to-regexp ≥8.4.0`, `lodash ≥4.18.0`, `postcss ≥8.5.10`. These
  cleared 7 moderate + 4 high CVEs in one pass.
- **Refused (major versions = require dedicated migration slices)**:
  `@hookform/resolvers` 3→5, `@vitejs/plugin-react` 5→6, `chokidar` 4→5,
  `date-fns` 3→4, `pino` 9→10, `pino-http` 10→11, `react-resizable-panels`
  2→4, `recharts` 2→3, `thread-stream` 3→4, `typescript` 5→6, `vite` 7→8,
  `zod` 3→4, `esbuild` 0.27→0.28, `lucide-react` 0.545→1.x. Each is a
  separate scoped task — never blanket-bump.

## Offline Queue (Brief C — Enterprise OS slice)

Kiosks buffer POST-style actions in localStorage when offline, then replay
them on reconnect. The `offline_queue` table is the forensic audit trail
PLUS the idempotency cache that prevents double-charging on retries.

- Schema `lib/db/src/schema/offlineQueue.ts`: `id`, `idempotencyKey` (UUID,
  uniquely indexed), `deviceId`, `venueId`, `kind` (`"order"`),
  `payload` JSONB, `status` (`pending|synced|failed`), `attempts`,
  `lastError`, `resultId`, `clientCreatedAt`, `syncedAt`, `createdAt`
  (+ status & venue indexes).
- Routes at `/api/offline-queue`:
  - `POST /sync` — public (kiosk); `osLimiter`; body `{items:[...]}`
    (max 100 per batch, each payload ≤ 16 KB). Per-item validation: UUID
    `idempotencyKey`, known `kind`, object `payload`. Dispatches each via
    `dispatchOne()` (currently inserts an order + best-effort inventory
    decrement). Idempotent: prior `synced` rows return `{status:"duplicate", resultId}`
    without re-dispatching. Returns per-item `{idempotencyKey, status, resultId?, error?}`.
  - `GET /` — manager+; `?status=pending|synced|failed` and `?limit=` filters;
    super_admin sees global, manager/owner tenant-scoped to their `venueId`.
  - `DELETE /:id` — super_admin only; UUID-validated.
- Client `artifacts/smokecraft/src/services/offlineQueue.ts`:
  `enqueue(kind,payload)` (writes to `localStorage` with crypto-UUID key),
  `pendingCount()`, `pendingItems()`, `drain(deviceId?)` (POSTs the buffer,
  removes synced+duplicate items, leaves failed for retry), tiny pub/sub
  `subscribe()`, `installOnlineListener()` (auto-drains on `window`
  `online` event).
- UI `OfflineQueueBanner` — fixed bottom-right chip, renders only when
  pending > 0 or browser is offline. Red-tinted when offline; "Sync now"
  button forces a drain. Mounted in App.tsx alongside DemoBanner.

## Exports (Brief B — Enterprise OS slice)

Audit-logged data exports for vendors / products / inventory / orders in CSV or JSON. The `export_logs` table (`lib/db/src/schema/exportLogs.ts`) records every export with `requestedBy`, `scope`, `format`, `venueId` (null for super_admin global pulls), arbitrary `filters` JSON blob, `rowCount`, `byteCount`, `status` (`completed | failed`), and an optional `errorMessage`. The export payload itself is **not** persisted — the source tables remain the system of record; the log is the audit trail.

Routes at `/api/exports`: GET / lists the caller's recent exports (super_admin sees global; venue staff are tenant-scoped to their `venueId`); POST / executes the export inline, streams the file with `Content-Type` + `Content-Disposition: attachment` + `X-Export-Rows` / `X-Export-Bytes` headers, and writes the audit row in the same handler. Failures still write a `failed` row with `errorMessage` so partial pulls are traceable.

Role gate per scope: super_admin can export every scope; `venue_owner` / `manager` can export only `inventory` + `orders`, scoped to their own `venueId` (vendors / products → 403). Cross-tenant injection is impossible because staff `venueScope` is taken from `req.user.venueId`, not from the body.

The "Exports" dashboard tab (`ExportsTab.tsx`) shows scope/format selectors (filtered by role), optional `status / since / until` filters for the orders scope, a Run Export button that triggers a browser download via Blob + `<a download>`, and a tenant-scoped history list with row + byte counts and status badges. 20/20 e2e probes passed.

### Data Conflicts (Brief A — Enterprise OS slice)

Single store for cross-source data mismatches (vendor vs POS price, distributor vs admin inventory count, etc). The `data_conflicts` table (`lib/db/src/schema/dataConflicts.ts`) records two competing values with their sources (`vendor | pos | distributor | system | admin | manual`), entity context (`entityType`, `entityId`, `fieldName`, optional `venueId`) and a resolve flow (`open → resolved | dismissed` with `resolution: use_a | use_b | use_custom | dismissed` and a kept `resolvedValue`). Detection is decoupled from the route layer — any code path that notices a mismatch calls `recordConflict()` from `artifacts/api-server/src/services/conflictRecorder.ts` (no callers wired in this brief; added incrementally). Routes at `/api/conflicts` provide GET list (status filter), GET one, POST (super_admin manual entry), and PATCH /:id/resolve. Tenant scoping: `super_admin` sees all including cross-venue (null `venueId`) rows; `venue_owner` / `manager` see only their own `venueId` and are blocked from null-venue rows. Resolve uses the same atomic conditional UPDATE pattern as reservations (WHERE id=? AND status='open') — concurrent resolves get 409. Staff resolve from the new "Conflicts" dashboard tab with Use A / Use B / Custom / Dismiss buttons. 17/17 e2e probes passed.

## Frontend Architecture

-   **Auth Context**: `AuthProvider` and `useAuth()` for user authentication.
-   **Dashboard**: Comprehensive administrative interface with multiple tabs.
-   **Experience Layout**: `ExperienceSidebar` and `ExperienceRightPanel` for guiding users through recommendation steps and displaying results.
-   **Cigar Structure Step**: A specific step in the recommendation wizard for selecting cigar vitola and session length.

# External Dependencies

-   **pnpm**: Monorepo tool and package manager.
-   **TypeScript**: Programming language.
-   **Express**: Node.js web application framework.
-   **PostgreSQL**: Relational database.
-   **Drizzle ORM**: TypeScript ORM.
-   **jose**: JWT library.
-   **bcryptjs**: Password hashing.
-   **Zod**: Schema validation.
-   **esbuild**: JavaScript bundler.
-   **React**: Frontend library.
-   **Vite**: Frontend build tool.
-   **Google Fonts**: For typography.
-   **ElevenLabs**: For voice synthesis (backend).