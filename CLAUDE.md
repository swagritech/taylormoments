# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Quick Start (new collaborator)

Get both workspaces running locally in order:

```bash
# 1. Clone and enter the repo
git clone <repo-url>
cd tailormoments

# 2. Set up the API
cd services/api
npm install
cp local.settings.example.json local.settings.json
# Fill in TM_POSTGRES_URL, TM_ACTION_TOKEN_SECRET, TM_AUTH_TOKEN_SECRET
# Set TM_DATA_MODE=memory to run without a real DB
npm run start          # Starts Azure Functions on localhost:7071

# 3. Set up the frontend (new terminal)
cd apps/web
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_BASE_URL=http://localhost:7071/api
# Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY
npm run dev            # Starts Next.js on localhost:3000
```

With `TM_DATA_MODE=memory` the API runs fully in-process — no PostgreSQL needed for basic development. Switch to `postgres` when working on availability slots, real winery data, or itinerary generation.

---

## Git & Branching

Branch from `main`. Use descriptive branch names:

```
feat/explore-redesign
feat/api-past-date-validation
fix/turnstile-enforcement
```

Open a PR to merge back into `main`. Deployments are manual:
- **Frontend:** `npm run deploy:pages` from `apps/web/` (deploys to Cloudflare Pages)
- **API:** `npm run deploy:azure` from `services/api/` (deploys to Azure Functions)

There are no automated CI deploys on push — always deploy deliberately.

---

## Project Context

Tailor Moments is a premium winery tour booking platform for the **Margaret River wine region, Western Australia**. Customers plan a day visiting cellar doors; the platform handles itinerary generation, transport matching, and partner coordination.

The platform has a deliberate niche focus on **inbound Asian tourism** — this explains the `WinerySignal` taxonomy including `mandarin_staff`, `vietnamese_staff`, `wechat_line`, `hosted_asian_groups`, `asian_pairing`, `halal`, `kosher`, and exported-to-Asia signals. Design decisions in filtering, winery profiles, and partner onboarding reflect this.

**Production URLs:**
- Frontend: `https://booking.swagritech.com.au`
- API: `https://swagri-tailormoments-api-01.azurewebsites.net`

---

## Repository Structure

Two independent workspaces — no shared package between them:

```
apps/web/          # Next.js 16 frontend (Cloudflare Pages)
services/api/      # Azure Functions v4 backend (Node.js, TypeScript ESM)
```

Each has its own `package.json`, `node_modules`, and `tsconfig.json`. Run commands from within each directory.

---

## Frontend — `apps/web/`

### Commands

```bash
cd apps/web
npm install
npm run dev          # Next.js dev server (localhost:3000)
npm run build        # next build + RSC alias post-processing script
npm run lint         # ESLint
npm run deploy:pages # Build + deploy to Cloudflare Pages (main branch)
npm run deploy:pages:preview  # Deploy to preview channel
```

There are no tests. Type-checking is done via the build step, not a separate command.

### Key env vars (`apps/web/.env.local`)

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:7071
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
NEXT_PUBLIC_TURNSTILE_SITE_KEY=...
NEXT_PUBLIC_DATA_MODE=remote        # "remote" or "demo"
```

`NEXT_PUBLIC_DATA_MODE=demo` activates local demo state rather than live API calls in some older components. All new explore/booking flows use the live API regardless of this setting.

If `NEXT_PUBLIC_API_BASE_URL` is not set, the frontend will throw at runtime — there is no safe default. Always set this in `.env.local`.

### Architecture

**All pages are `"use client"`.** This is a static export deployed to Cloudflare Pages. There is no server-side rendering — no `getServerSideProps`, no Server Actions, no API routes.

**Global state providers** (in `src/components/providers.tsx`, wrapping the entire app):
- `AuthProvider` (`src/lib/auth-state.tsx`) — manages auth token + user in `localStorage`, exposes `useAuth()`
- `DemoStateProvider` (`src/lib/demo-state.tsx`) — legacy demo mode state

**Auth state** is stored under two `localStorage` keys: `tm_auth_token` (the raw token string) and `tm_auth_user` (cached `AuthUser` JSON). On mount, `AuthProvider` re-validates the stored token via `GET /api/v1/auth/me` to catch expired tokens.

### Customer Explore Flow (main user journey)

State is persisted across steps via `localStorage` key `tm_explore_preferences_v1` (type: `ExplorePreferences` from `src/lib/explore-preferences.ts`). Each step reads and writes this key.

1. **`/`** — Trip setup: name, date, group size, trip length, transport need, pickup address. Saves to `ExplorePreferences`. Google Places autocomplete is called **directly from the browser** using `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, restricted to an AU bounding box (WA only). Resolves pickup lat/lng via the Places Details API and stores them in `ExplorePreferences`.

2. **`/explore`** — Multi-section preference quiz: wine styles, experiences, occasion, budget band, dietary needs, accessibility needs, vibe. All filtering is done **client-side** against the static winery catalog — no API call at this stage. Matched winery slugs are written to `ExplorePreferences.matchedWineryIds`.

3. **`/explore/summary`** — Translates matched slugs to UUIDs via `slugToWineryUuid()`, calls `POST /api/v1/itinerary/recommend`, displays ranked itinerary options with stop times and drive minutes.

4. **`/plan`** — `LiveBookingFlow` component. Calls `POST /api/v1/bookings` to create the booking. Optionally gated by Cloudflare Turnstile (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`).

### Partner Flows

**Winery partner portal** (`/partner/wineries`) — authenticated, role `winery`. Shows pending/accepted/declined booking requests scoped to the user's `winery_id`. Partners can update their winery profile and manage media assets.

**Transport partner portal** (`/partner/transport`) — authenticated, role `transport`.

**Ops portal** (`/partner/ops`) — authenticated, role `ops`. Sees all partners and bookings.

**Role-based nav** is handled in `src/components/app-shell.tsx` via `getPartnerNavItems(role)`. Roles `winery` and `transport` each see only their own section; `ops` sees all three.

**One-time approval pages:**
- `/approve?token=...` — winery approval flow (`WineryApprovalFlow` component). Reads `?token=` from URL, calls `POST /api/v1/action-tokens/{tokenId}/approve`. Optionally requires Turnstile.
- `/accept?token=...` — transport acceptance flow (`TransportAcceptFlow` component). Calls `POST /api/v1/action-tokens/{tokenId}/accept`.

These pages are designed to work without the partner being logged in — the token itself is the credential.

### Winery Catalog

`src/lib/winery-catalog.ts` transforms a static JSON file (`src/lib/data/winery-prospects.json`) at import time into `WineryCatalogItem[]`. This catalog is **entirely separate from the live DB** — it is a static prospect list used only for the explore preference quiz UI.

Only 4 wineries have hardcoded canonical UUIDs in `src/lib/winery-id.ts` (`canonicalWineryIds`): Vasse Felix, Cullen Wines, Fraser Gallop, Woodlands. All other slugs generate deterministic pseudo-UUIDs via a hash function — the API will not recognise these as preferred wineries.

**Styling** is plain CSS in `src/app/globals.css` using CSS custom properties and BEM-like class names. No Tailwind, no CSS modules. Prefer CSS custom properties over hardcoded hex values.

### Design tokens (`globals.css` `:root`)

| Token | Value | Role |
|---|---|---|
| `--sage` | `#4f6359` | Primary brand green — headings, nav, primary text |
| `--teal` | `#2f7a74` | Active states, links |
| `--gold` | `#b89457` | Accent, CTAs, highlights |
| `--gold-soft` | `#b88a3a` | Gold variant |
| `--gold-bright` | `#dbc07b` | Gold on dark backgrounds |
| `--gold-deep` | `#6c4b12` | Dark gold for text on light |
| `--aqua` | `#d9e7e2` | Subtle tinted backgrounds |
| `--sand` | `#f7f3ea` | Page background |
| `--paper` | `#fcfbf8` | Card / panel background |
| `--ink` | `#25302b` | Body text |
| `--muted` | `#64706b` | Secondary text, placeholders |
| `--danger` | `#8f3a2b` | Errors |
| `--line` | `#d6ddd8` | Borders |
| `--line-soft` | `#e6ece8` | Subtle dividers |
| `--panel` | `#ffffff` | White panels |

**Fonts:** Cinzel (headings/display, loaded via Google Fonts) and Inter (body/UI). Both are declared in `layout.tsx`.

---

## Backend — `services/api/`

### Commands

```bash
cd services/api
npm install
npm run build          # tsc compile to dist/
npm run lint           # tsc --noEmit (type-check only, no ESLint)
npm run start          # npm run build && func start (requires Azure Functions Core Tools)
npm run db:bootstrap   # Apply all SQL migrations in order (requires TM_POSTGRES_URL)
npm run package:azure  # Clean + build + package into release/ folder for deployment
npm run deploy:azure   # Run deploy-azure.ps1 PowerShell script
```

### Local settings

Copy `local.settings.example.json` to `local.settings.json` and fill in values. Key settings:

```json
{
  "TM_DATA_MODE": "memory",
  "TM_POSTGRES_URL": "postgres://...",
  "TM_ACTION_TOKEN_SECRET": "...",
  "TM_AUTH_TOKEN_SECRET": "...",
  "TM_TRAVEL_TIME_PROVIDER": "haversine",
  "TM_TRAVEL_TIME_OSRM_BASE_URL": "https://router.project-osrm.org",
  "TM_TURNSTILE_SECRET_KEY": ""
}
```

With `TM_DATA_MODE=memory`, the API runs fully in-process with no DB. Switch to `postgres` for anything involving real winery data or availability slots.

### Architecture

**ESM module** (`"type": "module"` in package.json). All internal imports must use `.js` extensions even for `.ts` source files.

**Repository pattern** — all DB access goes through the `WorkflowRepository` interface (`src/domain/ports.ts`). Two implementations:
- `src/adapters/memory-repository.ts` — in-memory, used when `TM_DATA_MODE=memory`
- `src/adapters/postgres-repository.ts` — PostgreSQL via `pg` pool

The active implementation is selected in `src/lib/repository-factory.ts` and exported as `workflowRepository`.

**Function handlers** (`src/functions/`) register Azure Functions via `app.http(...)`. Handlers are thin: parse input via Zod schema → call service/repository → return `ok()` or `badRequest()` from `src/lib/http.ts`.

**Domain types** are in `src/domain/models.ts`. Zod validation schemas are in `src/domain/schemas.ts`. Keep these in sync — the Zod schema is what the API validates against; the TypeScript type is what the rest of the code uses.

### Auth and Roles

`src/lib/auth-token.ts` issues and verifies a **custom HMAC-SHA256 token** — not standard JWT. Format: `base64url(payload).signature` (2 segments, not 3). The `exp` field is in **milliseconds** (not JWT-standard seconds). Do not attempt to parse these with standard JWT libraries.

The token payload includes `sub` (userId), `role`, and optionally `winery_id` and `transport_company`. These fields are used in handlers to scope data access:
- `winery` role: handlers check that `session.wineryId` matches the requested `wineryId` param
- `transport` role: scoped by `session.transportCompany`
- `ops` role: no scoping, full access
- `customer` role: scoped to their own bookings via `lead_email`

`src/lib/auth-guard.ts` wraps handlers that require authentication. `parseSessionFromAuthHeader()` is the main entry point.

### Booking Status State Machine

```
draft → awaiting_winery → confirmed → transport_pending → exception → cancelled
```

- `draft` — created but not yet dispatched to partners
- `awaiting_winery` — winery approval requests sent, waiting for responses
- `confirmed` — at least one winery accepted
- `transport_pending` — winery confirmed, waiting for transport acceptance
- `exception` — requires manual ops intervention
- `cancelled` — terminal state

### Action Token / Partner Approval Flow

When a booking is created, `dispatchWineryApprovalRequests()` in `src/lib/winery-workflow.ts` is called for each preferred winery:

1. Creates a one-time `ActionToken` (HMAC-signed, stored in DB) with type `winery_approve`
2. Constructs a magic link: `{TM_SITE_BASE_URL}/approve?token={tokenId}`
3. Sends the link via email or SMS using Azure Communication Services (ACS)
4. Creates a `WineryBookingRequest` record tracking the dispatch

The partner clicks the link → frontend reads `?token=` → calls `POST /api/v1/action-tokens/{tokenId}/approve` → token is marked used, booking status updates.

Transport tokens follow the same pattern with type `transporter_accept` and route `/accept`.

Tokens expire (configurable TTL) and can only be used once. The `ActionTokenStatus` values are: `active`, `used`, `expired`, `revoked`.

If ACS is not configured, notifications degrade to `preview` mode — the action URL is returned in the API response but not sent. This allows testing the flow without live comms.

### Itinerary Engine

`src/lib/recommendation-service.ts` is a combinatorial scheduler:

1. Fetches winery availability slots from DB for the requested date (`winery_availability` table)
2. Resolves pickup coordinates — prefers explicit lat/lng from request, falls back to fuzzy-matching `pickup_location` string against 4 hardcoded pickup points (Margaret River, Dunsborough, Prevelly, Busselton)
3. Builds a travel-time matrix between pickup and all wineries via OSRM or haversine
4. Tests combinations/permutations of winery subsets that fit the time window (1200ms budget cap)
5. Scores feasible routes by drive time, idle time, capacity fit, and `auto_confirm` preference
6. **Falls back to a coordinate-based heuristic when no availability slots exist** — produces plausible-looking itineraries that do not reflect real partner availability

The travel-time matrix is cached in-process (default TTL: 6 hours via `TM_TRAVEL_TIME_CACHE_TTL_SECONDS`). OSRM is used in production (~97% of legs); haversine fills gaps. Every recommendation call logs input, output, and scheduling trace to `itinerary_generation_log` in PostgreSQL.

**Current operational state:** The `winery_availability` table has forward availability coverage in production. The fallback path activates only when no slots exist for the specific requested date — check `scheduling_trace.used_fallback` in API responses to confirm which path ran for a given request.

The `preferred_wineries` field in the recommend request must be **UUIDs**, not slugs. The frontend must translate slugs via `slugToWineryUuid()` before calling the API. The API's `remapWineryIdsToCanonical()` also normalises known alternate IDs on the backend side.

### Notifications

Azure Communication Services (ACS) for email and SMS:
- `TM_ACS_EMAIL_CONNECTION_STRING` / `TM_ACS_EMAIL_SENDER_ADDRESS`
- `TM_ACS_SMS_CONNECTION_STRING` / `TM_ACS_SMS_FROM_NUMBER`

If not configured, all notifications return `channel: "preview"` with the action URL in the response body only.

### Media Storage

Cloudflare R2 (S3-compatible API). Winery image uploads use presigned PUT URLs:
1. Partner calls `POST /api/v1/wineries/{id}/media/upload-url` → gets a presigned PUT URL
2. Partner uploads directly to R2
3. Partner calls `POST /api/v1/wineries/{id}/media/{mediaId}/complete` → marks asset as uploaded

Configured via `TM_R2_ACCOUNT_ID`, `TM_R2_ACCESS_KEY_ID`, `TM_R2_SECRET_ACCESS_KEY`, `TM_R2_BUCKET_NAME`, `TM_R2_PUBLIC_BASE_URL`.

### API Endpoint Reference

All routes are prefixed `/api/` by the Azure Functions host. Base: `https://swagri-tailormoments-api-01.azurewebsites.net/api` (prod) or `http://localhost:7071/api` (local).

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `v1/auth/register` | — | Register a new partner account |
| `POST` | `v1/auth/login` | — | Login, returns custom auth token |
| `GET` | `v1/auth/me` | ✓ | Get current user profile |
| `PUT` | `v1/auth/me` | ✓ | Update current user profile |
| `POST` | `v1/auth/forgot-password` | — | Send password reset email |
| `POST` | `v1/auth/reset-password` | — | Reset password via token |
| `POST` | `v1/auth/change-password` | ✓ | Change password (authenticated) |
| `POST` | `v1/itinerary/recommend` | — | Generate ranked itinerary options |
| `POST` | `v1/bookings` | — | Create booking (Turnstile optional) |
| `GET` | `v1/bookings/{bookingId}` | — | Get booking by ID |
| `GET` | `v1/bookings/mine` | ✓ | List bookings for current customer |
| `GET` | `v1/wineries` | ✓ | List wineries (partner/ops) |
| `GET` | `v1/wineries/{wineryId}/profile` | ✓ | Get winery profile |
| `PUT` | `v1/wineries/{wineryId}/profile` | ✓ | Update winery profile |
| `GET` | `v1/wineries/{wineryId}/requests` | ✓ | List booking requests for winery |
| `GET` | `v1/wineries/{wineryId}/media` | ✓ | List winery media assets (authed) |
| `GET` | `v1/wineries/{wineryId}/media/public` | — | List winery media (public) |
| `POST` | `v1/wineries/{wineryId}/media/upload-url` | ✓ | Get presigned R2 upload URL |
| `POST` | `v1/wineries/{wineryId}/media/{mediaId}/complete` | ✓ | Mark media upload complete |
| `DELETE` | `v1/wineries/{wineryId}/media/{mediaId}` | ✓ | Delete media asset |
| `POST` | `v1/action-tokens/{tokenId}/approve` | — | Winery approves booking via magic link |
| `POST` | `v1/action-tokens/{tokenId}/accept` | — | Transport accepts booking via magic link |
| `GET/POST` | `v1/warmup` | — | Cold-start warmup ping |

Auth is via `Authorization: Bearer <token>` header. The token is a custom HMAC format — see Auth section above.

---

### SQL Migrations

Files in `services/api/sql/` are numbered (`001_init.sql` through `023_...sql`). `npm run db:bootstrap` applies all in order. When adding a migration, use the next number and run bootstrap — do not skip numbers. Always apply to both dev and production in order.

The `release/`, `release_new2/`, `release_new3/` directories under `services/api/` are local deployment packaging artifacts (untracked by git). Do not modify them directly; they are produced by `npm run package:azure`.

---

## Key Cross-Cutting Concerns

### Slug vs UUID for wineries

Frontend catalog uses slugs (e.g. `"vasse-felix"`). Backend uses UUIDs. Only 4 wineries have real canonical UUIDs in `src/lib/winery-id.ts`. Adding a new live-bookable winery requires:
1. Adding `slug → UUID` to `canonicalWineryIds` in `apps/web/src/lib/winery-id.ts`
2. Ensuring the winery exists in the DB with that exact UUID
3. Optionally adding coordinates to `knownCoordinates` in `apps/web/src/lib/winery-catalog.ts`

### Type duplication

`services/api/src/domain/models.ts` and `apps/web/src/lib/live-api.ts` define the same API types independently — there is no shared package. When changing any model (especially `scheduling_trace`, `RecommendItineraryResponse`, `AuthUser`, or winery profile shapes), update **both files**. The `scheduling_trace` shape is particularly large and prone to drift.

### WinerySignal and WineStyle enums

`WinerySignal` (~50 values) and `WineStyle` (~13 values) are defined as TypeScript union types in `services/api/src/domain/models.ts`. The postgres repository has corresponding `allowedWineStyles` and `allowedWinerySignals` Sets that whitelist values before DB writes. The frontend explore quiz maps its UI option IDs to these signal values for filtering. When adding new signals or styles, update: `models.ts`, the allowlist Sets in `postgres-repository.ts`, the `WorkflowRepository` interface in `ports.ts`, and any frontend filter mappings in `apps/web/src/app/explore/page.tsx`.

Note: `"Fortfied & Desert Wines"` is a known typo in the `WineStyle` union (should be `"Fortified & Dessert Wines"`). It is present in `models.ts`, `ports.ts`, and `postgres-repository.ts`. Do not silently correct it without a corresponding SQL migration to update existing DB rows.

### Turnstile bot protection

Cloudflare Turnstile is integrated on the booking creation and winery approval flows. The frontend widget is `src/components/turnstile-widget.tsx`. The backend validates via `src/lib/turnstile.ts` using `TM_TURNSTILE_SECRET_KEY`. If this env var is empty, Turnstile validation is skipped — meaning bot protection is currently inactive in any environment where the secret is not set.

### Known production issues

These are real gaps — don't work around them silently, fix them properly:

- **Turnstile not enforced:** `TM_TURNSTILE_SECRET_KEY` is unset in production. `POST /api/v1/bookings` accepts requests with no Turnstile token and creates real bookings. Fix: ensure the secret is set in Azure Function App config.
- **Past dates not rejected:** `booking_date: "2020-01-01"` returns HTTP 200 with empty itineraries. The Zod schema validates format only, not that the date is in the future. Fix: add a `.refine()` check in `services/api/src/domain/schemas.ts` and return 400 for past dates.
- **Static catalog vs live DB drift:** `apps/web/src/lib/data/winery-prospects.json` is maintained manually and is not automatically synced with the DB. If winery details change in the DB, the explore quiz UI will be stale until the JSON is updated by hand.

---

### Availability slots

The `winery_availability` table has forward coverage in production. The fallback heuristic only activates when no slots exist for the specific requested date. Always check `scheduling_trace.used_fallback` and `scheduling_trace.wineries_with_slots_count` in API responses to determine whether the real scheduler or the fallback ran for a given request.

### Data mode vs live API

`NEXT_PUBLIC_DATA_MODE=demo` causes some older components to use local demo state (`src/lib/demo-data.ts`, `src/lib/demo-state.tsx`). The explore/booking flow always calls the live API regardless of this setting. `LiveBookingFlow` imports from `demo-data` only for default form field values.
