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

The application features a luxury aesthetic with a dark gold theme, glassmorphism cards, and sophisticated typography. A global design system uses CSS custom properties for consistent theming. Key elements include reusable `BackgroundLayer` components for full-screen backgrounds with gradient overlays, image-driven tiles with custom branding options, and a premium animated brand intro splash. Venue owners can customize background images via the Settings page.

## Core Features

-   **AI Experience Engine**: Provides AI-driven recommendations based on flavor, strength, mood, and other factors, with semantic cross-category and food pairing. It includes deterministic natural-language commentary and real-time menu suggestions.
-   **Operations Layer**: Includes POS integration, reorder alerts, optimized menu layouts, profit calculations, staff sales pitches, tenant isolation, and atomic inventory decrement.
-   **Image Engine**: Context-aware Cloudinary transformations with subtype-based fallbacks.
-   **Network Intelligence Layer**: Features like "Couples Mode," "Time-of-day context" for recommendations, historical data revenue forecasting, and cross-venue low-stock digests.
-   **Craft-Specific Experiences**: Modular kiosk-style pages for `BrewCraft`, `PourCraft`, and `VapeCraft`. Each uses `CraftFlow.tsx` as the shared phase engine (`intro → style → profile → match → reveal`).
-   **Live Preview + Scoring Panel**: A collapsible `position:fixed` right-edge `LivePreviewPanel` mounts additively over `CraftFlow`. Shows a per-craft SVG silhouette (beer bottle / whiskey glass / vape device / cigar), a 0–100 score bar, and three meter bars (Flavor / Strength / Balance). Score is computed via `POST /api/scoring` after each style/mood pick. Combo animations (shake + flickerRed on drop ≥10, glowPulse on rise ≥10) via Framer Motion `useAnimation`. Build state is persisted to `craft_builds` table via `PATCH /api/craft-builds` (silent 401 for guests).
-   **Design Playground**: Pre-challenge branding studio for all four crafts; opens before CraftFlow. Supports drag/pinch, draft save/load, per-craft configs.
-   **Lucient Core — Experience Decision Engine**: Manages real-time experience quality and revenue control through behavior profiles, a decision engine, and an automation service.
-   **Personalization & Revenue Intelligence**: Taste profiles, auto-recommendations via affinity vectors, session revenue forecasting, and dynamic pricing.
-   **Database Schema**: Comprehensive schema for users, products, experiences, loyalty, inventory, lounge statistics, reservations, IP assets, audit logs, support tickets, notifications, user memories, and multi-user sessions.
-   **Authentication and Authorization**: JWT-based authentication with role-based access control.
-   **Progression and Loyalty System**: A 5-tier user progression and a separate loyalty points system.
-   **Admin Intensity Controls**: Venue-level tuning for reward, XP, and discount engines via feature flags.
-   **Production Hardening Layer**: Includes Stripe event idempotency, tenant isolation, server-side pricing, session lifecycle management, kill switches for system parts, AES-256-GCM field-level encryption, and an append-only audit log.
-   **Engagement Loop**: Tracks user interactions, awards points, and integrates with server-side loyalty points for authenticated users.
-   **Admin Card Manager**: Allows venue admins to upload and replace product card images.
-   **Campaign Persistence**: Full DB-backed campaign entries with API routes for entry, leaderboards, and detailed entries.
-   **Axiom OS Branding**: Renamed platform to "Axiom OS," with updated terminology and i18n locales.
-   **Partnership & Distribution Engine**: Supports brand partners and campaigns with budget enforcement, fraud detection, and ROI reporting.
-   **Production Go-Live Control Layer**: Enables remote control over client application versions, forced refreshes, device heartbeats, and feature flag synchronization.
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