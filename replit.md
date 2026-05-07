# Overview

SmokeCraft is a luxury cigar and spirits recommendation platform designed for upscale venues. It leverages AI for personalized recommendations, offers comprehensive inventory management, and includes a robust loyalty system. The platform aims to boost user engagement, foster competition among venues, and is envisioned to grow into a multi-craft "Experience Engine," providing sophisticated recommendation capabilities and operational support, including POS integration and advanced personalization for a discerning clientele.

# User Preferences

I prefer concise and direct communication. When making changes, prioritize core functionality and architectural integrity. For any significant architectural decisions or major feature implementations, please ask for approval before proceeding. I prefer that you do not make changes to files related to changelogs or update logs.

# System Architecture

## Monorepo Structure

The project utilizes a pnpm workspace monorepo, separating a React/Vite frontend from an Express 5 API backend, both written in TypeScript.

## Tech Stack

-   **Node.js**: Version 24
-   **TypeScript**: Version 5.9
-   **API Framework**: Express 5
-   **Database**: PostgreSQL with Drizzle ORM
-   **Authentication**: JWT (HS256) with `jose` and `bcryptjs` for password hashing, supporting multiple user roles.
-   **Validation**: Zod
-   **Build Tool**: esbuild

## UI/UX and Design

**Smoked Cream & Obsidian** design system (global retheme applied May 2026). Body defaults to `#F5F2ED` (Smoked Cream). CSS variables in `index.css`: `--background: 39 28% 94%`, `--foreground: 240 2% 10%`, `--primary: 39 100% 42%` (#D48B00 Warm Honey Amber), `--card: 45 32% 91%` (#EFEBE0 Light Parchment). Key utility classes: `ax-glass` / `ax-glass-gold` / `ax-card` (frosted parchment surfaces), `ax-tab-bar` / `ax-tab` (touch-first tab nav, min-height 40px), `ax-btn-primary` / `ax-btn-ghost` (56px touch targets), `ax-badge-*` (status chips), `ax-glow-top` (ambient amber glow on cream). Obsidian `#1A1A1B` / Warm Honey Amber `#D48B00` / muted warm-brown `#6B5E4E` typography hierarchy. Staff/authorized-personnel areas use `#2A2A2A` Brushed Graphite as accent for headers and bezels (`.brushed-graphite` class). Modals use frosted parchment bg + 20px blur. Patron SwipeCards → Vellum cards with Obsidian text. Command Hub tiles → Pressed Paper (#E8E4D9). Batch replacement script at `scripts/retheme_cream.py` for future palette updates. Framer Motion ambient particles + Cormorant Garamond serif display type used consistently across all dashboards.

## Core Features

-   **AI Experience Engine**: Provides AI-driven recommendations based on flavor, strength, mood, and other factors, with semantic cross-category and food pairing. It includes deterministic natural-language commentary and real-time menu suggestions.
-   **Operations Layer**: Includes POS integration, reorder alerts, optimized menu layouts, profit calculations, staff sales pitches, tenant isolation, and atomic inventory decrement.
-   **Image Engine**: Context-aware Cloudinary transformations with subtype-based fallbacks.
-   **Network Intelligence Layer**: Features like "Couples Mode," "Time-of-day context" for recommendations, historical data revenue forecasting, and cross-venue low-stock digests.
-   **Universal Swipe Experience Engine**: Tinder-style card swiping at `/experience/:type` (smoke/pour/brew/vape). Cinematic card stack with drag physics, glow trails (green/red), ADD/SKIP overlays, and per-craft `CraftRealism` ambient animations (EmberGlow, LiquidShimmer, FoamRise, VaporDrift). `RevealPage` shows ranked recommendations with taste-match bar, pairing notes, stock status, and real Add-to-Order wiring via `POST /api/swipe-orders`. `craftThemes.ts` provides per-craft visual config.
-   **Add-to-Order Pipeline**: `swipe_orders`, `swipe_order_items`, and `inventory_reservations` tables. `POST /api/swipe-orders` validates stock, creates time-bounded reservations (15 min TTL), upserts order line items, and returns a cinematic confirmation modal. Routes: `GET /session/:id`, `POST /:id/confirm`, `POST /:id/cancel`.
-   **Revenue Brain v2**: Scoring formula 40% taste / 25% margin / 15% stock / 10% reliability / 10% premium. Hard-blocks qty=0, −25 penalty for low stock, −10 soft penalty for vendor reliability <60. Includes `buildPairingNote()` for contextual pairing suggestions.
-   **Swipe Intelligence Dashboard**: `/analytics/swipe-intelligence` with Overview, Taste Clusters, Revenue Funnel, and Craft Compare tabs. Live animated counters, horizontal bars, and cluster cards. Accessible via "Swipe IQ" button in AnalyticsModule header.
-   **visualPrompts.ts**: AI visual pipeline prompt templates per craft type with flavor descriptor mapping, per-craft cinematic style configs, and sound hook stubs (`SOUND_HOOKS` map + `triggerSound()` stub ready for Howler.js/Web Audio API).
-   **Live Preview + Scoring Panel**: A collapsible `position:fixed` right-edge `LivePreviewPanel` mounts additively over `CraftFlow`. Shows a per-craft SVG silhouette (beer bottle / whiskey glass / vape device / cigar), a 0–100 score bar, and three meter bars (Flavor / Strength / Balance). Score is computed via `POST /api/scoring` after each style/mood pick. Combo animations (shake + flickerRed on drop ≥10, glowPulse on rise ≥10) via Framer Motion `useAnimation`. Build state is persisted to `craft_builds` table via `PATCH /api/craft-builds` (silent 401 for guests).
-   **Design Playground**: Pre-challenge branding studio for all four crafts; opens before CraftFlow. Supports drag/pinch, draft save/load, per-craft configs.
-   **Lucient Core — Experience Decision Engine**: Manages real-time experience quality and revenue control through behavior profiles, a decision engine, and an automation service.
-   **Personalization & Revenue Intelligence**: Taste profiles, auto-recommendations via affinity vectors, session revenue forecasting, and dynamic pricing.
-   **Database Schema**: Comprehensive schema for users, products, experiences, loyalty, inventory, lounge statistics, reservations, IP assets, audit logs, support tickets, notifications, user memories, and multi-user sessions.
-   **Authentication and Authorization**: JWT-based authentication with role-based access control.
-   **Progression and Loyalty System**: A 5-tier user progression and a separate loyalty points system.
-   **Admin Intensity Controls**: Venue-level tuning for reward, XP, and discount engines via feature flags.
-   **Axiom Receipt Experience**: Cinematic post-payment session summary at `/receipt/:tabId`. Auto-generates on first visit, stores in `receipts` table (with QR token), supports email/SMS/print delivery channels. `GET /api/receipts/qr/:token` is public for guest self-retrieval.
-   **Financial Reconciliation Dashboard**: 5-tab enterprise dashboard at `/finance-reconciliation` (Overview, Alert Queue, Orphan Tabs, Payout Status, AI Insights). Reconciliation score 0–100, real-time metrics, alert ack/resolve, and "Run Reconciliation" trigger. Accessible via MasterOperations nav.
-   **Payment Event Timeline**: Append-only `payment_events` table. `GET /api/payment-timeline/:tabId` returns full lifecycle per tab. `POST` appends manual staff events. Venue-scoped recent feed at `/venue/:venueId/recent`.
-   **Reconciliation Worker**: 15-min background worker detects stuck authorized tabs (>2h), orphan open tabs (>72h), exhausted webhooks, failed payouts, stale pending payouts — deduplicates alerts via upsert pattern.
-   **Financial Alert Engine**: `reconciliation_alerts` table with severity/status lifecycle. Auto-populated by worker, manually dismissible by admin/super_admin.
-   **Production Hardening Layer**: Includes Stripe event idempotency, tenant isolation, server-side pricing, session lifecycle management, kill switches for system parts, AES-256-GCM field-level encryption, and an append-only audit log.
-   **Engagement Loop**: Tracks user interactions, awards points, and integrates with server-side loyalty points for authenticated users.
-   **Admin Card Manager**: Allows venue admins to upload and replace product card images.
-   **Campaign Persistence**: Full DB-backed campaign entries with API routes for entry, leaderboards, and detailed entries.
-   **Axiom OS Branding**: Renamed platform to "Axiom OS," with updated terminology and i18n locales.
-   **Partnership & Distribution Engine**: Supports brand partners and campaigns with budget enforcement, fraud detection, and ROI reporting.
-   **Production Go-Live Control Layer**: Enables remote control over client application versions, forced refreshes, device heartbeats, and feature flag synchronization.
-   **Human Foundation**: Persistent kiosk guest identity system. `EnrollmentFlow` collects firstName, lastInitial, atmosphere/boldness/experience in a cinematic one-at-a-time Q flow. `assignMentor()` maps palate preferences to one of 11 fictional mentors (4 craft types). `MentorReveal` shows the assigned mentor before the swipe experience. `GuestProfileContext` persists identity to sessionStorage. Fast return via CraftHub "RETURNING?" button (firstName + last-4 digits). Tables: `guest_profiles`, `guest_sessions`. API: `POST /api/enrollment/enroll`, `/return`, `PATCH /:id/memory`.
-   **Kiosk Burn-in Protection**: Pixel-shift system for kiosk screens.
-   **Device Management**: Registration, status tracking, and session management for various devices.
-   **Lounge League**: A competition system for ranking venues.
-   **Multi-User Sessions**: Manages groups of users with unique codes.
-   **Offline Queue**: Buffers and replays offline actions for kiosks, supporting orders and NDA signatures.
-   **Exports**: Role-gated CSV/JSON data exports.
-   **Cross-Venue Identity Layer**: Tracks user visits across different venues.
-   **Touchscreen Command Interface**: Role-based touchscreen home screens, a step-based flow engine, and an NDA-gated Experience Center with backend API integration, audit logging, and session persistence.
-   **Demo → NDA → Experience Flow**: Handles the flow from demo to NDA signing and redirection to the Experience Center, with offline queuing and audit logging.
-   **Craft Command Center (POS Flow)**: Provides an end-to-end kiosk transaction flow including entry portals, PIN login, a 3-panel POS mode with product grids, cart management, and payment processing. Features include inventory tracking, reward triggers, refund support, and customizable venue branding.
    -   **Payment State Machine**: Asynchronous checkout flow with simulated processing and failure rates, preventing double-clicks and cart edits during checkout.
    -   **Inventory Management**: Stock is reserved on cart-add, deducted on payment success, and restored on failure or refund.
    -   **POS Operating Mode**: Three modes (`overlay`, `hybrid`, `full_pos`) can be selected and persisted.
    -   **POS Adapter Layer**: Provides an interface and stub adapters for integration with external POS systems like Toast, Square, and Clover.
    -   **Security Guards & Audit Hardening**: Includes PIN lockout, inactivity guards, `ConfirmModal` for risky actions, role enforcement, and `PosAuditBridge` for comprehensive audit logging across the POS lifecycle.
    -   **Inventory Integrity & Reward Fraud Protection**: Detailed inventory logging with stock changes, reasons, and role-based confirmation for large adjustments. Reward fraud protection includes one reward per order, cooldowns, and analytics for stock movements.

# External Dependencies

-   pnpm
-   TypeScript
-   Express
-   PostgreSQL
-   Drizzle ORM
-   jose
-   bcryptjs
-   Zod
-   esbuild
-   React
-   Vite
-   Google Fonts
-   ElevenLabs
-   Cloudinary