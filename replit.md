# Overview

SmokeCraft is a luxury cigar and spirits recommendation platform for upscale venues. It offers personalized recommendations, inventory management, a loyalty system, and fosters venue competition. The platform aims to integrate a sophisticated recommendation engine with robust user engagement features, targeting a discerning clientele, and expanding into a multi-craft "Experience Engine" for various luxury preferences. Key capabilities include AI-driven recommendations, operational support for POS integration, and advanced personalization.

# User Preferences

I prefer concise and direct communication. When making changes, prioritize core functionality and architectural integrity. For any significant architectural decisions or major feature implementations, please ask for approval before proceeding. I prefer that you do not make changes to files related to changelogs or update logs.

# System Architecture

## Monorepo Structure

The project uses a pnpm workspace monorepo with TypeScript, separating the frontend (React + Vite in `artifacts/smokecraft`) from the backend (Express 5 API in `artifacts/api-server`).

## Tech Stack

-   **Node.js**: 24
-   **TypeScript**: 5.9
-   **API Framework**: Express 5
-   **Database**: PostgreSQL with Drizzle ORM
-   **Authentication**: JWT (HS256, 7-day expiry) using `jose`, `bcryptjs` for password hashing. Supports various roles including `super_admin`, `venue_owner`, `manager`, `staff`, `brand_partner`, and `customer`.
-   **Validation**: Zod
-   **Build**: esbuild (ESM bundle)

## UI/UX and Design

The application features a luxury aesthetic with a dark gold theme, glassmorphism cards, and a sophisticated typography palette (Cormorant Garamond, Inter, Playfair Display). A global design system uses CSS custom properties for consistent theming and effects. Key visual elements include `.glass-panel` classes for semi-transparent backgrounds and `sc-btn-primary`/`sc-btn-ghost` for buttons. The brand intro splash uses a premium Profound Innovations sequence: deep navy-to-black radial gradient (#020617→#000), SVG noise overlay (brushed metal), pulsing cyan ambient glow, a 3D chevron SVG swooshing from far-left with motion blur (circOut 0.8s), "PROFOUND INNOVATIONS" revealed via clip-path masked wipe (bold italic Inter/Montserrat, metallic text-shadow), tagline fade-in, and a shimmer lens-flare sweep across the text. After 4.2s, it auto-transitions to the 4-card experience selector (SmokeCraft/PourCraft/BrewCraft/VapeCraft). Includes browser TTS entry cues and a global back button with an opt-in `AppLayout`.

## Core Features and Implementations

### Recommendation Engine

Uses a scoring mechanism based on flavor, strength, mood, and boost levels. It includes modules for semantic cross-category pairing, food pairing, and a central product registry.

### AI Experience Engine

A unified layer providing deterministic natural-language commentary, voice synthesis, and real orderable menu suggestions based on the recommendation engine's output. Includes a `menu_items` Drizzle table and a templated `aiCommentary` builder.

### Operations Layer

Provides features for POS integration, reorder alerts, optimized menu layout, profit calculations, and staff sales pitches. It leverages existing database tables with new pure functions and API routes, incorporating tenant isolation and atomic inventory decrement.

### Image Engine

A context-aware image resolution system that applies Cloudinary transforms based on context, handles subtype-based fallbacks, and provides an API for image resolution.

### Network Intelligence Layer

Introduces "Couples Mode" for blending user profiles, incorporates "Time-of-day context" into recommendations, and provides "Historical-data revenue forecast" and "Cross-venue low-stock digest."

### Craft-Specific Experiences

Dedicated kiosk-style pages (`BrewCraft.tsx`, `PourCraft.tsx`, `VapeCraft.tsx`) for craft-led pairing experiences, leveraging a modular approach for expansion and unique visual identities. Each page shares a 3-column layout (left step nav, center 4-card style picker with per-style hero photos, right `VoicePanel` AI sommelier) and reuses `ExperienceFrame`, `SuggestedMenu`, and `fetchRecommendations`. Categories: BrewCraft → `beer`, PourCraft → `alcohol`, VapeCraft → `vape`. VapeCraft uses a neon-vapor palette (purple/cyan/pink/amber per style) and degrades gracefully when the engine returns no match — the result block shows "venue inventory pending" until vape SKUs are seeded and the server-side Zod category enum is widened to include `vape`.

### BrewStory Engine (`components/BrewStory.tsx`)

3-panel swipeable insight component (Origin / Taste Science / Insider Secret) rendered after BrewCraft pairing results. Content is deterministically generated from `ProductResult` data (name, flavorNotes, strength, pairingTags). Uses Framer Motion horizontal transitions, pointer-based swipe navigation, and tab buttons. Wired into BrewCraft result flow after the pairing block.

### TasteChallenge System (`components/TasteChallenge.tsx`)

Multi-choice quiz derived from pairing result data: flavor identification, strength guess, pairing match. Awards +15 points for correct answers, +5 for attempts via fire-and-forget POST to `/api/loyalty/award`. Shows per-question feedback (correct/incorrect) and a completion summary with total score. Wired into BrewCraft after BrewStory, before upsell.

### Build Your Own Flow (`pages/BuildYourOwn.tsx`)

4-step drink builder at `/build-your-own`: pick base spirit (whiskey/gin/rum/tequila/vodka with hero photos) → select up to 3 flavor modifiers → name the drink → rarity reveal with score/percentile + closest real inventory match via `/api/recommend`. Awards 20 loyalty points on reveal. Accessible via "Build My Drink" button in PourCraft header. BrewCraft step nav expanded from 3 to 5 steps: Pick → Pair → Story → Challenge → Elevate.

### Loyalty Award Endpoint (`POST /api/loyalty/award`)

Server-side point awarding with hardened security: reason allowlist (`taste_challenge`, `build_your_own`), per-reason max point caps (15/20), per-user per-reason cooldown (30s/60s) to prevent farming, and Zod-validated input. Requires authentication.

### Lucient Core — Experience Decision Engine

A real-time experience quality and revenue control layer integrated into the recommendation pipeline. Components:
- **Behavior Profile** (`config/aiBehavior.ts`) — identity, principles, and mode constants for the "Lucient Core" system.
- **Decision Engine** (`services/experienceDecisionEngine.ts`) — unified quality gate applied post-recommendation. Validates experience completeness, filters strength-mismatched pairings (threshold ≥3), gates featured items against canonical `isInStock()`, and provides beginner-level upsell caps ($150). Delegates to existing validators — no logic duplication.
- **Quality Gate Hook** — wired into both `POST /api/recommend` and `POST /api/recommend/couples` as a post-filter on the pipeline output.
- **Automation Service** (`services/experienceAutomation.ts`) — 30-minute interval optimization pass with start/stop lifecycle. Started at boot alongside the aggregation worker.
- **Admin Routes** (`routes/experienceEngine.ts`) — `GET /api/experience-engine/status` (admin/owner/manager) and `POST /api/experience-engine/optimize` (super_admin only).
- **Input Hardening** — `parseProfile()` now validates `flavorPreferences` entries are actual strings, rejecting numbers/objects with 400.

### Personalization & Revenue Intelligence

Adds a taste profile system, auto-recommendation using affinity vectors, session revenue forecasting, and smart dynamic pricing.

### Database Schema

Sixteen tables manage various aspects including users, products, experiences, loyalty, inventory, and lounge statistics. Notable tables: `users` (roles, progression), `products` (catalog), `experiences` (sessions), `user_progression`, `user_humidor`, `lounge_stats`, `signatureRequests`. New tables for reservations, IP assets, NDA signatures, voice commands, audit logs, support tickets, support ticket messages, notifications, user memories, sessions, session members, offline queue, export logs, data conflicts, and device hardware.

### Authentication and Authorization

JWT-based authentication with `requireAuth` middleware and a `requireRole` factory ensures granular access control based on user roles.

### Progression and Loyalty System

A 5-tier user progression system tied to verified orders and XP thresholds, unlocking perks. A separate loyalty points system awards bonuses for orders. Rewards are venue-specific.

### Device Management

Supports mobile, tablet, and kiosk devices with registration, status tracking, and session management. Kiosk mode includes inactivity timers and full-screen integration.

### Lounge League

A competition system ranking venues based on performance metrics like orders and repeat customers, awarding badges.

### Reservations

Manages RSVP/hold-the-spot requests with a state machine (`pending → accepted | rejected | cancelled → fulfilled | no_show`), payment modes, and atomic conditional updates.

### IP Vault + NDA

An owner-only intellectual-property evidence registry for recording assets. Includes an NDA gate implemented on the `users` table for access control, and a separate Demo NDA flow for public access.

### Voice Queue

Backend for holding transcripts captured at kiosks for downstream worker processing, with atomic capped insert, claiming mechanism, and status updates.

### Audit-Log Reader

Provides paginated, role-gated access to the `audit_log` table, enforcing append-only behavior, tenant scoping, and PII redaction by default.

### Help Center

Provides a system for venue staff to file support tickets and super_admins to triage them. Features include ticket creation, status transitions, assignment, message threading, and notification fan-out for status changes.

### Notifications Inbox Writes

Adds write endpoints for notifications to mark as read, read all, and dismiss, with tenant-scoped access and rate limiting.

### AI Memory

Provides recallable per-user "facts" for an AI assistant, stored in `user_memories` table, with atomic capped upsert and owner-scoped access.

### Multi-User Sessions

Provides a grouping primitive ("party") for users, with tables for `sessions` and `session_members`, unique active codes, and atomic member management.

### Reward Redemption

Hardened existing reward redemption with atomic conditional debit to prevent overdrafts during concurrent redemptions.

### Offline Queue

Kiosks buffer POST-style actions in localStorage when offline, replaying them on reconnect. The `offline_queue` table acts as a forensic audit trail and idempotency cache.

### Exports

Audit-logged data exports for vendors, products, inventory, and orders in CSV or JSON. Includes an `export_logs` table to record export metadata, with role-gated access and inline streaming.

### Data Conflicts

A single store for cross-source data mismatches, recording competing values, entity context, and a resolve flow.

### Device Hardware Tracking

A 1:1 sidecar to `devices` table, `device_hardware`, storing serial numbers, manufacturers, warranty info, etc., with dedicated routes for tracking and expiring hardware reports.

### Package Update Policy

Strict policy for package updates, prioritizing surgical, non-destructive bumps and security overrides. Major version updates are deferred to dedicated migration slices.

### Cross-Venue Identity Layer

Adds `user_venue_visits` table to track where a user has visited, with an atomic upsert service (`recordVisit`) fired on session creation, and a read route for user's visit history.

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
-   **Cloudinary**: For image transformations.