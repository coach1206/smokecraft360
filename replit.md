# Overview

SmokeCraft is a luxury cigar and spirits recommendation platform designed to elevate the user experience in upscale lounges and venues. It provides personalized recommendations, manages inventory, tracks user progression through a loyalty system, and fosters venue competition. The project aims to integrate a sophisticated recommendation engine with robust user engagement features, appealing to a discerning clientele.

# User Preferences

I prefer concise and direct communication. When making changes, prioritize core functionality and architectural integrity. For any significant architectural decisions or major feature implementations, please ask for approval before proceeding. I prefer that you do not make changes to files related to changelogs or update logs.

# System Architecture

## Monorepo Structure

The project is a pnpm workspace monorepo using TypeScript. It includes `artifacts/smokecraft` for the React + Vite frontend and `artifacts/api-server` for the Express 5 API.

## Tech Stack

- **Node.js**: 24
- **TypeScript**: 5.9
- **API Framework**: Express 5
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT (HS256, 7-day expiry) using `jose`, `bcryptjs` for password hashing. Supports roles: `super_admin`, `venue_owner`, `manager`, `staff`, `brand_partner`, `customer`.
- **Validation**: Zod
- **Build**: esbuild (ESM bundle)

## UI/UX and Design

The application features a luxury aesthetic with a dark gold theme, glassmorphism cards, and a sophisticated typography palette (Cormorant Garamond, Inter, Playfair Display).

- **Global Design System**: Utilizes CSS custom properties for consistent theming (`--sc-gold`, `--sc-bg`, `--sc-text-primary`, etc.), spacing, radius, and blur effects.
- **Glassmorphism**: `.glass-panel`, `.glass-panel-dark`, and `.glass-panel-hero` classes apply semi-transparent dark backgrounds with blur, gold borders, and shadows.
- **Typography**: Uses Playfair Display for headlines, Cormorant Garamond for serif text, and Inter for body text.
- **Buttons**: `.sc-btn-primary` (gold fill, shimmer, glow) and `.sc-btn-ghost` (gold outline).
- **Ambient Background**: A 7-layer system for a rich, immersive visual experience.

## Core Features and Implementations

### Wizard Card Imagery (Locked)

All flavor (cigar + spirits), strength, and mood cards in the experience wizard use AI-generated images stored in `attached_assets/locked_cards/` and bundled by Vite via the `@assets` alias. The previous Unsplash-by-photo-id system was abandoned because IDs were silently repurposed (e.g. Medium-strength fell through to a giraffe photo via the onError fallback chain). Each locked image was generated to match its card description AND brand rules (no fruit slices, no animals, no cocktails — dark luxury cigar lounge aesthetic). The `images: [...]` array shape is preserved so `SwipeCardDeck`'s onError fallback path remains intact (just never needs to fire). Known follow-up: the 29 PNGs total ~34 MB; converting to WebP/AVIF and capping dimensions would meaningfully reduce kiosk payload size — deferred to keep this change scoped purely to correctness. The Experience-step welcome cards (line ~1100 of Home.tsx) still use Unsplash and are intentionally left alone (verified-stable per existing comment).

### Welcome Screen Experience Cards (Locked)

The 3 brand-selector cards on `Intro.tsx` (SmokeCraft / PourCraft / VapeCraft) use locked AI-generated images at `attached_assets/locked_cards/experience_<key>.png`, bundled by Vite via `@assets`. The previous Unsplash/Pexels/Imgix URLs were unstable (third-party hosts swapped or 404'd assets, breaking the strict per-brand visual identity rules — e.g. VapeCraft showed warm-toned imagery in violation of its "cool tones only" rule). Each image is hand-vetted to satisfy the brand contract documented in the file: SmokeCraft = real people + lit cigars + smoke + warm gold/amber lounge; PourCraft = whiskey pour + crystal glass + rich brown contrast (no people); VapeCraft = cool blue/purple vapor on pure black (no warm tones, no cigars, no whiskey, no people). The attract-mode background scene cycler at line ~390 reads from the same `EXPERIENCES[i].image` field, so it inherits the locked images automatically. To replace any image, regenerate the file at the same path — no code edit needed. Per existing standing rule, do NOT route these through Cloudinary helpers (Cloudinary cloud `duv5fvvrt` is currently empty and a fallback chain has historically caused brand-breaking misfires).

### Cigar Structure Step Imagery (Locked)

The Cigar Structure step (`CigarStructureStep.tsx`) renders 6 vitola cards (robusto, corona, toro, churchill, torpedo, belicoso). Each card shows a hand-vetted AI-generated product photo at `attached_assets/locked_cards/vitola_<shape>.png`, bundled by Vite via `@assets`. Photos: parejo (rounded cap) for robusto/corona/toro/churchill, sharp tapered pyramid head for torpedo, shorter softer-tipped belicoso. The earlier Cloudinary-with-SVG-fallback approach was abandoned because the venue cloud (`duv5fvvrt`) is empty and rendering 6 silhouettes by default felt unfinished compared to real photos. The SVG silhouette (`VitolaSilhouette`) is retained as a paranoia `<img onError>` fallback only. The `cigarShapeImage` Cloudinary helper still exists in `src/lib/cloudinary.ts` for future venue overrides but is no longer wired in. To replace any vitola image, regenerate the file at the same path — no code edit needed.

### Recommendation Engine

Located in `artifacts/api-server/src/engine/`, it uses a scoring mechanism based on flavor, strength, mood, and boost levels. It includes modules for semantic cross-category pairing, food pairing, and a central product registry.

- **Inventory Management**: `initInventory()` seeds product data and manages boost/sponsored states in memory, backed by PostgreSQL.
- **Scoring Logic**: Awards +2 per overlapping flavor, +3 per mood tag match, -1 per unit of strength distance, and applies boost/sponsored multipliers.
- **Categories**: `cigar` (5 products), `alcohol` (10 products including the House Signature Pairing drinks: Buffalo Trace, Maker's Mark, Knob Creek Rye, Lagavulin 16, Woodford Reserve, Blanton's Single Barrel, Macallan 12, Hennessy XO, Maker's Mark 46, Ardbeg 10), `beer` (8 products covering Light/Amber/IPA/Dark — Corona, Modelo, Sam Adams, Yuengling, Lagunitas, Sierra Nevada, Guinness, Founders Porter), plus empty `wine`/`cocktail` slots reserved for vendor uploads. Adding a new vertical only requires registering products in `engine/registry.ts` `datasets`; the recommend route accepts any registered category automatically.
- **Cross-Category Pairing**: `engine/pairing.ts` carries bidirectional rules for cigar↔alcohol AND cigar↔beer. Beer rules mirror alcohol rules but stay scoped to `category === "beer"` so future tuning can diverge per category. Cigar→beer rules add beer-style keywords (light/lager/amber/ipa/hoppy/stout/porter/roasted) so a cigar-led journey can recommend a beer pairing.

### BrewCraft Quick-Pick Page

`artifacts/smokecraft/src/pages/BrewCraft.tsx` — a beer-led pairing screen at `/brewcraft` rendered as a 3-column kiosk lounge layout (left step nav 260px / center 4 beer cards / right mode-synced context panel 360px) over a dimmed cigar-lounge backdrop (`attached_assets/locked_cards/experience_smokecraft.png` + radial dark overlay). Card hero visuals are CSS gradients (Light=gold, Amber=copper, IPA=hazy orange, Dark=stout). Each card maps to a flavor + strength + mood preset and POSTs to the existing `/api/recommend` endpoint with `category: "beer"`; the result panel shows the top beer plus the cross-category cigar pairing returned by the engine. After a result loads, a **PourCraft upsell** unlocks on a 3-second timer (`UPSELL_DELAY_MS`) — a second `/api/recommend` call with `category: "alcohol"` and the same flavor preset (strength bumped one notch for the "elevate" framing) returns a premium pour, with "Add Whiskey" routing to `/pourcraft`. Right context panel reads `mode = upsellVisible ? "spirit" : "beer"` so the "MODE" header swaps between BrewCraft and PourCraft to match the active funnel stage. Zero new backend endpoints, zero mock data — thin UI funnel on top of the production engine, so inventory filtering applies automatically when a venue is set. A 4th experience card on `Intro.tsx` routes here via the existing `navigate("/" + key)` pattern. The brief's BrewCraft proposal also called for replacing menus with toy in-memory loyalty/inventory/dashboard backends — those were rejected to avoid regressing the real XP, inventory, venue analytics, and dashboard systems already in place.

### Shared `ExperienceFrame` Wrapper

`artifacts/smokecraft/src/components/ExperienceFrame.tsx` — a small layout primitive that gives every kiosk surface (BrewCraft, PourCraft, future SmokeCraft side panels) the same dark glass tint, rounded corners, gold-tinted hairline border, and shadow depth. Accepts `accent` (border tint), `padding`, and `testId` props. Distinct from `VaultModal.tsx`'s internal `ExperienceCard` (which is a list item for saved experiences) — `ExperienceFrame` is a wrapper, not a card.

### Database Schema

Sixteen tables manage users, venues, products, experiences, brands, analytics, orders, user preferences, inventory, distributors, campaigns, demand, user progression, humidor, loyalty, rewards, redemptions, and lounge statistics. Key tables include:
- `users`: Roles, level, JWT auth.
- `products`: Full product catalog.
- `experiences`: Per-user recommendation sessions.
- `user_progression`: 5-tier XP progression.
- `user_humidor`: Personal purchase history.
- `lounge_stats`: Aggregated per-venue competition stats.
- `signatureRequests`: Includes `boxDesign` (JSON) for custom cigar requests.

### Authentication and Authorization

JWT-based with `requireAuth` middleware and `requireRole` factory. Roles define access to various API endpoints and dashboard features. The first registered user becomes `super_admin`.

### Progression and Loyalty System

- **User Progression**: A 5-tier system (Explorer to Maestro del Fuego) requiring both verified orders and XP thresholds. Unlocks perks like discounts, early access, and VIP services.
- **XP Awards**: Awarded for verified orders (cigar, drink, food, combo bonuses, first-time product bonus).
- **Loyalty Points**: Separate from XP, awarded for verified orders with welcome and combo bonuses.
- **Rewards**: Venue-specific catalogue of discounts, free items, and experiences, gated by user level.
- **Humidor**: Tracks personal purchase history per user and product.

### Device Management

Supports mobile, tablet, and kiosk devices with registration, status tracking, and session management.
- **Kiosk Mode**: Features inactivity timers, auto-reset to home, and full-screen API integration. Configurable via URL parameters.
- **Device Pricing**: Defines rental and purchase costs for tablet and kiosk devices, with plan bundles (BASE, EXPERIENCE, ELITE).

### Lounge League

A competition system that ranks venues based on `totalVerifiedOrders`, `weeklyOrders`, `totalUsers`, and `repeatCustomers`. Computes badges like `top_rated`, `most_active`, `trending_venue`, and `best_experience`.

## Frontend Architecture

- **Auth Context**: `AuthProvider` and `useAuth()` hook for managing user authentication state.
- **Dashboard**: Features tabs for Overview, Products, Brands & Distributors, Analytics, Verify Orders, Leaderboard, My Progress, Loyalty & Rewards, Signature Creations, Lounge League, and Device Manager.
- **Experience Layout**: `ExperienceSidebar` (fixed left panel with 7 steps: Experience to Reveal) and `ExperienceRightPanel` (fixed right panel displaying product details in results phase). Dynamic step tracking based on user input.
- **Cigar Structure step** (`CigarStructureStep.tsx`, cigar-only formStep 1): vitola picker (6 SVG silhouettes — Robusto/Corona/Toro/Churchill/Torpedo/Belicoso) + session length chips (quick/standard/extended/long). Persisted to `UserProfile.cigar` via `setCigarProfile()`. Forwarded to `/api/recommend` as `cigarShape`/`cigarSession`. Engine scoring: vitolaMatch (+2 on word-boundary name match, cigar-only) and sessionMatch (+1 when product strength falls in session-preferred band). Sidebar collapses Structure under Experience slot 0; click-back map: sidebar 0→0, 1→2, 2→3, 3→4 (never routes Flavor click to Structure). Alcohol flow skips this step entirely (4-step wizard); cigar flow shows "Step X of 5" labels.

# External Dependencies

- **pnpm**: Monorepo tool and package manager.
- **TypeScript**: Programming language.
- **Express**: Node.js web application framework.
- **PostgreSQL**: Relational database.
- **Drizzle ORM**: TypeScript ORM for PostgreSQL.
- **jose**: Javascript Object Signing and Encryption (JOSE) library for JWTs.
- **bcryptjs**: Library for hashing passwords.
- **Zod**: TypeScript-first schema declaration and validation library.
- **esbuild**: JavaScript bundler.
- **React**: Frontend JavaScript library.
- **Vite**: Frontend build tool.
- **Google Fonts**: For Playfair Display, Cormorant Garamond, and Inter fonts.