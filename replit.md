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

### Recommendation Engine

Located in `artifacts/api-server/src/engine/`, it uses a scoring mechanism based on flavor, strength, mood, and boost levels. It includes modules for semantic cross-category pairing, food pairing, and a central product registry.

- **Inventory Management**: `initInventory()` seeds product data and manages boost/sponsored states in memory, backed by PostgreSQL.
- **Scoring Logic**: Awards +2 per overlapping flavor, +3 per mood tag match, -1 per unit of strength distance, and applies boost/sponsored multipliers.

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