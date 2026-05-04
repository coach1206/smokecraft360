# Overview

SmokeCraft is a luxury cigar and spirits recommendation platform for upscale venues. It offers AI-driven personalized recommendations, comprehensive inventory management, and a robust loyalty system. The platform aims to enhance user engagement, facilitate venue competition, and evolve into a multi-craft "Experience Engine." Its core purpose is to provide discerning clientele with sophisticated recommendation capabilities and operational support, including POS integration and advanced personalization.

# User Preferences

I prefer concise and direct communication. When making changes, prioritize core functionality and architectural integrity. For any significant architectural decisions or major feature implementations, please ask for approval before proceeding. I prefer that you do not make changes to files related to changelogs or update logs.

# System Architecture

## Monorepo Structure

The project uses a pnpm workspace monorepo with TypeScript, separating a React/Vite frontend from an Express 5 API backend.

## Tech Stack

-   **Node.js**: Version 24
-   **TypeScript**: Version 5.9
-   **API Framework**: Express 5
-   **Database**: PostgreSQL with Drizzle ORM
-   **Authentication**: JWT (HS256) with `jose` and `bcryptjs` for password hashing, supporting multiple user roles.
-   **Validation**: Zod
-   **Build Tool**: esbuild

## UI/UX and Design

The application features a luxury aesthetic with a dark gold theme, glassmorphism cards, and sophisticated typography (Cormorant Garamond, Inter, Playfair Display). A global design system utilizes CSS custom properties for consistent theming. Key elements include `.glass-panel` classes, `sc-btn-primary`, `sc-btn-ghost`, and a premium animated brand intro splash.

## Core Features

-   **Recommendation Engine & AI Experience Engine**: AI-driven recommendations based on flavor, strength, mood, and boost levels, with semantic cross-category and food pairing. The "AI Experience Engine" provides deterministic natural-language commentary, voice synthesis, and real-time menu suggestions.
-   **Operations Layer**: POS integration, reorder alerts, optimized menu layout, profit calculations, staff sales pitches, tenant isolation, and atomic inventory decrement.
-   **Image Engine**: Context-aware Cloudinary transformations with subtype-based fallbacks.
-   **Network Intelligence Layer**: "Couples Mode," "Time-of-day context" for recommendations, "Historical-data revenue forecast," and "Cross-venue low-stock digest."
-   **Craft-Specific Experiences**: Kiosk-style pages for `BrewCraft`, `PourCraft`, and `VapeCraft` using a modular 3-column layout.
-   **Lucient Core — Experience Decision Engine**: Real-time experience quality and revenue control, including a behavior profile, decision engine, automation service, and admin routes.
-   **Personalization & Revenue Intelligence**: Taste profiles, auto-recommendations via affinity vectors, session revenue forecasting, and dynamic pricing.
-   **Database Schema**: Comprehensive schema covering users, products, experiences, loyalty, inventory, lounge statistics, reservations, IP assets, audit logs, support tickets, notifications, user memories, and multi-user sessions.
-   **Authentication and Authorization**: JWT-based authentication with `requireAuth` and `requireRole` middleware for granular access control.
-   **Progression and Loyalty System**: 5-tier user progression and separate loyalty points system.
-   **Admin Intensity Controls**: Venue-level tuning for reward, XP, and discount engines via feature flags.
-   **Session Cleanup Worker**: Background worker for expiring old sessions and removing abandoned members.
-   **Production Hardening Layer**:
    -   **Stripe Event Idempotency**: Prevents duplicate Stripe event processing.
    -   **Tenant Isolation**: Enforces venue scoping for multi-tenant routes.
    -   **Checkout Server-Side Pricing**: Resolves prices from the database, never trusting client-supplied prices.
    -   **Session Lifecycle**: Manages sessions with `active`, `completed`, `expired`, `archived`, `cancelled` statuses.
    -   **Kill Switches**: Feature flags (`payments-enabled`, `rewards-enabled`) to disable parts of the system.
    -   **Encryption Utility**: AES-256-GCM field-level encryption.
    -   **Audit Logging**: Append-only audit log for critical actions.
    -   **Background Workers**: Payout Worker and Reward Optimization Worker.
-   **Partnership & Distribution Engine**: Non-destructive extension for brand partners and campaigns.
    -   **Brand Partners & Product Links**: Manages brand information and product associations.
    -   **Campaign Engine Extensions**: Supports various campaign types with budget enforcement and multiplier bounds validation.
    -   **Recommendation Pipeline Injection**: Applies brand and campaign boosts to recommendations.
    -   **Server-Side Order Attribution**: Attributes orders to brands and campaigns.
    -   **Campaign Budget Enforcement Worker**: Scans and enforces campaign budgets and expiry.
    -   **Campaign Fraud Detection**: Detects and flags suspicious redemption patterns.
    -   **ROI Reporting**: Provides ROI metrics for campaigns and brands.
-   **Production Go-Live Control Layer**:
    -   **System Version & Force Refresh**: Allows remote control over client application versions and forced reloads.
    -   **Device Heartbeat**: Tracks device status and enables per-device remote refresh.
    -   **Feature Flag Frontend Sync**: Syncs feature flags to the frontend.
-   **Kiosk Burn-in Protection**: Pixel-shift system for kiosk screens during idle periods.
-   **Device Management**: Supports registration, status tracking, and session management for mobile, tablet, and kiosk devices.
-   **Lounge League**: Competition system ranking venues.
-   **Multi-User Sessions**: Manages groups of users (parties) with unique codes.
-   **Offline Queue**: Buffers and replays offline actions for kiosks. Supports `order` and `nda` kinds with kind-specific payload size limits (16KB for orders, 400KB for NDA signatures).
-   **Exports**: Role-gated CSV/JSON data exports.
-   **Cross-Venue Identity Layer**: Tracks user visits across venues.
-   **Touchscreen Command Interface**: Role-based touchscreen home screens (`/touch`, `/touch/admin`, `/touch/venue`, `/touch/vendor`), step-based flow engine with 12 flow definitions, Experience Center (`/experience-center`) NDA-gated via existing `DemoNdaModal`, and backend API at `/api/touchscreen/*` with full auth, audit logging, and session persistence in `touchscreen_flow_sessions` table. All touch targets ≥72px, dark gold glass-card aesthetic.
-   **Demo → NDA → Experience Flow**: `/demo` mounts NDA gate modal, captures signature with deviceId/venueId, redirects to `/experience-center` on success. Offline-safe: queues NDA to offline queue when truly offline (navigator.onLine=false), syncs on reconnect. Kiosk-aware: pauses inactivity timer during NDA signing, heartbeat includes ndaSigned/sessionId state. Audit-logged (`nda.demo_signed`) and analytics-tracked (`nda_viewed`, `nda_signed`, `nda_synced` event types). Deep-link bypass blocked by sessionStorage check in DemoExperienceCenter.
-   **Craft Command Center (POS Flow)**: Complete end-to-end kiosk transaction flow. Entry Portal (`/` and `/entry`) with 4 animated tiles (Venue Access, Admin Control, Vendor Access, Demo Mode). PIN Login (`/pin-login`) with touch-optimized keypad and mock users (Owner:1111, Manager:2222, Staff:3333). POS Mode (`/pos`) with 3-panel layout: order history with status badges (left), product grid with category tabs (center), current order cart (right). Features 16 mock products across 4 categories (cigar/spirit/beer/food) with Unsplash images, live inventory tracking with low-stock warnings, reward trigger at $50+ (10% discount).
    -   **Payment State Machine**: Async checkout flow with `processing → paid/failed` lifecycle. Simulated ~1.8s payment delay with 10% failure rate. Processing spinner overlay, success confirmation, and failure recovery with retry. Processing lock (`lockRef` + `processingLock`) prevents double-clicks and blocks cart edits during checkout. All state reads use synchronized refs for race-free async operations.
    -   **Inventory Timing**: Stock reserved on cart-add (prevents overselling), permanently deducted on payment success, restored on payment failure or refund.
    -   **Refund Support**: Owner/Manager can refund paid orders from order history sidebar; role enforcement in both UI and context action layer. Refunded orders restore inventory.
    -   **POS Operating Mode**: Three operating modes (`overlay` | `hybrid` | `full_pos`) persisted to localStorage via `CommandCenterContext`. Overlay = works beside existing POS, Hybrid = syncs with external POS, Full POS = SmokeCraft is primary POS. Mode selector UI in Settings with radio-style cards. Mode badge displayed in both Command Center dashboard header and Settings header.
    -   **POS Adapter Layer**: `artifacts/api-server/src/posAdapters/` contains a `BasePosAdapter` interface and 5 stub adapters (Toast, Square, Clover, Lightspeed, Manual Import). Each adapter implements `syncProducts()`, `syncInventory()`, `syncOrders()`, `pushOrder()`, `pullReports()` with mock data. `posWebhook.ts` remains the real integration point for live POS events.
    -   **Security Guards & Audit Hardening**: PIN lockout after 5 failed attempts with 60s cooldown (sessionStorage-based). Inactivity guard shows warning at 5min idle, auto-locks to `/pin-login` after 30s countdown. Reusable `ConfirmModal` component gates risky actions: device lock/shutdown, staff deactivation, POS mode changes. Role enforcement: owner/manager required for risky admin actions; staff users see "Access Denied" toast. `PosAuditBridge` provides reactive audit logging for full POS lifecycle (order.created, checkout.started, payment.confirmed/failed, order.refunded, reward.applied/blocked, inventory.adjusted, auth.login/logout). Campaign creation in ExperiencesModule with `campaign.created` audit. Full audit action taxonomy: auth.*, session.timeout, device.*, demo.mode, access.denied, order.*, checkout.*, payment.*, reward.*, inventory.adjusted, campaign.created, settings.pos_mode, staff.*, vendor.restock. Files: `ConfirmModal.tsx`, `InactivityGuard.tsx`, `PosAuditBridge.tsx`, `PinLogin.tsx`, `CommandCenterContext.tsx`, `DevicesModule.tsx`, `StaffModule.tsx`, `SettingsModule.tsx`, `ExperiencesModule.tsx`.
    -   **Inventory Integrity & Reward Fraud Protection**: `InventoryLogEntry` type in PosContext tracks every stock change with productId, productName, beforeStock, afterStock, reason, userId, timestamp. Logged reasons: cart.add, cart.remove, cart.reduce, cart.clear, payment.failed, retry.failed, checkout.retry, order.refunded, manual.adjustment, manual.adjustment.confirmed. Large stock adjustments (>10 units) require owner/manager role; staff users get `needsConfirmation` response. Checkout idempotency via `stockDeducted` flag on Order prevents double inventory deduction on retries. Reward fraud protection: one reward per order, 5-minute cooldown between reward applications per session (`lastRewardTimeRef`), blocked attempts surface `rewardBlocked` state and audit `reward.cooldown`. Analytics module has "Stock Movements" tab showing inventory log table with before/after values, delta, reason labels, timestamps. Files: `PosContext.tsx`, `AnalyticsModule.tsx`, `PosAuditBridge.tsx`.
    -   State managed via `PosContext` (React context). Files: `Entry.tsx`, `PinLogin.tsx`, `PosMode.tsx`, `PosContext.tsx`.

# External Dependencies

-   **pnpm**
-   **TypeScript**
-   **Express**
-   **PostgreSQL**
-   **Drizzle ORM**
-   **jose**
-   **bcryptjs**
-   **Zod**
-   **esbuild**
-   **React**
-   **Vite**
-   **Google Fonts**
-   **ElevenLabs**
-   **Cloudinary**