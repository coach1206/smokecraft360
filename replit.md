# Overview

SmokeCraft is a luxury cigar and spirits recommendation platform designed for upscale venues. It provides AI-driven personalized recommendations, comprehensive inventory management, and a robust loyalty system. The platform aims to enhance user engagement, facilitate venue competition, and evolve into a multi-craft "Experience Engine" catering to a broad spectrum of luxury preferences. Its core purpose is to offer discerning clientele sophisticated recommendation capabilities and operational support, including POS integration and advanced personalization.

# User Preferences

I prefer concise and direct communication. When making changes, prioritize core functionality and architectural integrity. For any significant architectural decisions or major feature implementations, please ask for approval before proceeding. I prefer that you do not make changes to files related to changelogs or update logs.

# System Architecture

## Monorepo Structure

The project utilizes a pnpm workspace monorepo, employing TypeScript. It separates the frontend, built with React and Vite, from the backend, an Express 5 API server.

## Tech Stack

-   **Node.js**: Version 24
-   **TypeScript**: Version 5.9
-   **API Framework**: Express 5
-   **Database**: PostgreSQL with Drizzle ORM
-   **Authentication**: JWT (HS256, 7-day expiry) using `jose` for tokens and `bcryptjs` for password hashing. Supports multiple user roles (`super_admin`, `venue_owner`, `manager`, `staff`, `brand_partner`, `customer`).
-   **Validation**: Zod
-   **Build Tool**: esbuild (for ESM bundles)

## UI/UX and Design

The application features a luxury aesthetic characterized by a dark gold theme, glassmorphism cards, and a sophisticated typography palette (Cormorant Garamond, Inter, Playfair Display). A global design system leverages CSS custom properties for consistent theming. Key visual elements include `.glass-panel` classes and distinctive button styles (`sc-btn-primary`, `sc-btn-ghost`). The brand intro splash incorporates a premium animated sequence with a radial gradient, SVG noise overlay, pulsing ambient glow, 3D chevron animation, and masked text reveal. A global back button and an opt-in `AppLayout` are also included.

## Core Features and Implementations

### Recommendation Engine & AI Experience Engine

The platform incorporates an AI-driven recommendation engine that uses a scoring mechanism based on flavor, strength, mood, and boost levels, alongside semantic cross-category and food pairing modules. An "AI Experience Engine" provides deterministic natural-language commentary, voice synthesis, and real-time orderable menu suggestions based on the recommendation engine's output, utilizing a templated `aiCommentary` builder.

### Operations Layer

Provides features for POS integration, reorder alerts, optimized menu layout, profit calculations, and staff sales pitches, with tenant isolation and atomic inventory decrement.

### Image Engine

A context-aware system that applies Cloudinary transforms based on context and handles subtype-based fallbacks.

### Network Intelligence Layer

Introduces "Couples Mode" for blended user profiles, integrates "Time-of-day context" into recommendations, and offers "Historical-data revenue forecast" and "Cross-venue low-stock digest."

### Craft-Specific Experiences

Dedicated kiosk-style pages for `BrewCraft`, `PourCraft`, and `VapeCraft` offer craft-led pairing experiences. These pages share a modular 3-column layout and reuse components for recommendations.

### Lucient Core — Experience Decision Engine

A real-time experience quality and revenue control layer integrated into the recommendation pipeline. It includes a behavior profile, a decision engine for validating experience completeness and filtering recommendations, an automation service for optimization passes, and admin routes for status and optimization.

### Personalization & Revenue Intelligence

Features include a taste profile system, auto-recommendation via affinity vectors, session revenue forecasting, and dynamic pricing.

### Database Schema

The database schema includes tables for users, products, experiences, loyalty, inventory, lounge statistics, and various operational and administrative functions such as reservations, IP assets, audit logs, support tickets, notifications, user memories, and multi-user sessions.

### Authentication and Authorization

JWT-based authentication with `requireAuth` middleware and a `requireRole` factory ensures granular access control based on user roles.

### Progression and Loyalty System

A 5-tier user progression system tied to verified orders and XP thresholds, unlocking venue-specific perks, alongside a separate loyalty points system for order bonuses.

### Admin Intensity Controls

A venue-level tuning system for reward, XP, and discount engines, stored as feature flags with configurable metadata and enforced ranges. Includes transaction-safe read-modify-write operations and a 60-second in-memory cache.

### Session Cleanup Worker

A background worker that periodically expires active sessions older than 4 hours (status → "expired"), transactionally cancelling pending redemptions for affected users. Also removes abandoned session members (sets `leftAt`) during each sweep. The manual run endpoint (`POST /api/admin/workers/session-cleanup/run`) has rate limiting (5/min) and audit logging.

### Production Hardening Layer

#### Stripe Event Idempotency
A `stripe_events` table records processed event IDs. The webhook handler inserts before processing; duplicate PK (23505) triggers early return. Combined with per-order "already paid" checks for defense-in-depth.

#### Tenant Isolation
All multi-tenant routes enforce venue scoping: orders (GET filter + PATCH ownership check), products (venueId query param), loyalty redemptions (venue-scoped listing + PATCH ownership guard), rewards (venue-scoped or global listing), and experiences (venueId from JWT or body).

#### Checkout Server-Side Pricing
`POST /api/create-checkout-session` requires `items[].productId` and resolves prices from the `products` table. Client-supplied prices are never trusted.

#### Session Lifecycle
Sessions use 5 statuses: `active`, `completed`, `expired`, `archived`, `cancelled`. Manual close → "archived", timeout → "expired", payment success → "completed".

#### Kill Switches
`requirePaymentsEnabled` and `requireRewardsEnabled` middleware check global feature flags (`payments-enabled`, `rewards-enabled`) with 30s cache. Returns 503 when disabled. Mounted on checkout, payments, loyalty, and rewards routes.

#### Encryption Utility
AES-256-GCM field-level encryption via `DATA_ENCRYPTION_KEY`. `tryEncrypt` refuses plaintext fallback (throws). Located at `artifacts/api-server/src/lib/encryption.ts`.

#### Audit Logging
Payment success, loyalty point awards, reward redemptions, reward CRUD, and redemption status updates all emit audit log entries. The `audit_log` table has DB triggers preventing UPDATE/DELETE (append-only).

#### Background Workers
- **Payout Worker** (hourly): Processes approved payout requests, validates against pending commission totals, marks commissions paid.
- **Reward Optimization Worker** (10min): Analyzes 7-day order/redemption ratios and adjusts reward point costs (±10%) based on usage rate.

### Production Go-Live Control Layer

#### System Version & Force Refresh
- `GET /api/system/version` — public endpoint returning current version, min supported version, and force-refresh flag.
- `POST /api/admin/system/force-refresh` — super_admin-only toggle with audit logging.
- `useSystemVersion()` hook in App.tsx checks version on load and triggers page reload when force-refresh is enabled.

#### Device Heartbeat
- `POST /api/device/heartbeat` — rate-limited (30/min), validates UUID deviceId/venueId match, updates device status and version, returns per-device force-refresh flag.
- `GET /api/admin/devices` — auth-gated device listing (super_admin sees all, managers see own venue).
- `POST /api/admin/device/:deviceId/refresh` — super_admin-only per-device force-refresh queue with audit logging.

#### Feature Flag Frontend Sync
- `useFeatureFlags()` hook wraps ThemeContext for convenient flag access.
- `useFeatureFlag(name, default)` returns individual flag values.
- Burn-in protection gated behind `burn_in_protection` feature flag in KioskModeContext.

#### RippleButton
Shared tactile feedback component (`RippleButton.tsx`) with gold ripple animation, applied to TasteChallenge answer buttons, SwipeableCard "Order Now" CTA, and VerifyOrdersTab "Verify" button. Supports passthrough HTML attributes via rest props.

### Kiosk Burn-in Protection

A pixel-shift anti-burn-in system active in kiosk mode, cycling through directional offsets during idle periods to prevent screen burn-in. Gated behind the `burn_in_protection` feature flag.

### Device Management

Supports mobile, tablet, and kiosk devices with registration, status tracking, and session management. Kiosk mode includes inactivity timers, full-screen integration, burn-in protection, and lockdown features.

### Lounge League

A competition system that ranks venues based on performance metrics and awards badges.

### Multi-User Sessions

A grouping primitive for users (parties) with dedicated tables for `sessions` and `session_members`, unique active codes, and atomic member management.

### Offline Queue

Kiosks buffer offline actions in local storage and replay them on reconnect, with an `offline_queue` table for forensic auditing and idempotency.

### Exports

Audit-logged data exports for vendors, products, inventory, and orders in CSV or JSON, with role-gated access and inline streaming.

### Cross-Venue Identity Layer

Tracks user venue visits in a `user_venue_visits` table, with an atomic upsert service for recording visits and a read route for user history.

# External Dependencies

-   **pnpm**: Package manager for monorepo.
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
-   **ElevenLabs**: For voice synthesis.
-   **Cloudinary**: For image transformations.