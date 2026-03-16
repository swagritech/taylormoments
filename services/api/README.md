# Tailor Moments API

This workspace contains the isolated Tailor Moments backend intended for the new Azure Function App `swagri-tailormoments-api-01`.

## Goals

- RESTful workflow endpoints for Tailor Moments only
- no dependency on REOC resources or schemas
- clear support for memory-mode development now and PostgreSQL-backed workflows later
- priority support for itinerary recommendation and ActionToken flows

## Scripts

```bash
npm install
npm run build
npm run lint
npm run db:bootstrap
```

## Local development

1. Copy `local.settings.example.json` to `local.settings.json`
2. Fill in settings as needed
3. Run `npm install`
4. Run `npm run build`
5. Run `func start` when Azure Functions Core Tools are available

## Data modes

- `TM_DATA_MODE=memory` -> in-memory/testing workflow state
- `TM_DATA_MODE=postgres` -> PostgreSQL-backed workflow state

## PostgreSQL bootstrap

SQL files are in `sql/`:
- `001_init.sql`
- `002_seed_wineries.sql`
- `003_winery_partner_workflow.sql`
- `004_booking_time_preferences.sql`
- `005_user_auth.sql`
- `006_customer_profile_fields.sql`
- `007_seed_full_prospect_catalog.sql`
- `008_winery_media_assets.sql`

Recommended order:

```bash
TM_POSTGRES_URL="postgres://..." npm run db:bootstrap
```

The bootstrap script applies all SQL files in order:
- `001_init.sql`
- `002_seed_wineries.sql`
- `003_winery_partner_workflow.sql`
- `004_booking_time_preferences.sql`
- `005_user_auth.sql`
- `006_customer_profile_fields.sql`
- `007_seed_full_prospect_catalog.sql`
- `008_winery_media_assets.sql`

## Winery image upload storage (Cloudflare R2)

Set these app settings in `swagri-tailormoments-api-01`:

- `TM_R2_ACCOUNT_ID`
- `TM_R2_ACCESS_KEY_ID`
- `TM_R2_SECRET_ACCESS_KEY`
- `TM_R2_BUCKET_NAME`
- `TM_R2_PUBLIC_BASE_URL` (for example `https://images.booking.swagritech.com.au`)
- `TM_R2_SIGNED_URL_EXPIRY_SECONDS` (optional, default `900`)

New REST endpoints:

- `GET /api/v1/wineries/{wineryId}/media`
- `POST /api/v1/wineries/{wineryId}/media/upload-url`
- `POST /api/v1/wineries/{wineryId}/media/{mediaId}/complete`

## Azure deployment packaging

To prepare a deployment-ready folder for `swagri-tailormoments-api-01`:

```bash
npm run package:azure
```

This creates a `release/` folder containing the compiled function app, package metadata, and runtime dependencies.

## Current repository behavior

The API now supports:
- memory repository for fast development
- PostgreSQL repository for bookings, wineries, availability, action tokens, and winery request queues

The PostgreSQL adapter is intended for Tailor Moments only and should point to a dedicated Tailor Moments database.
