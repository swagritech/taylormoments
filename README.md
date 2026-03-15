# Tailor Moments

This repository contains the greenfield Tailor Moments product build for live workflow prototyping, partner testing, and the transition into a production-ready booking platform.

## Structure

- `apps/web` - Next.js frontend for guest booking, partner actions, transport coordination, and internal operations.
- `services/api` - Tailor Moments Azure Functions backend, isolated from REOC.
- `branding` - Tailor Moments logo and brand guidelines.
- `docs/deployment-cloudflare-pages.md` - Cloudflare Pages deployment notes.
- `docs/tailormoments-v1-brief.md` - product brief and implementation direction.
- `docs/tailormoments-v1-api.md` - REST contract notes.
- `docs/tailormoments-v1-schema.md` - data model notes.

## Current product status

The project now has a live Tailor Moments backend and a branded frontend foundation.

Current capabilities:
- live itinerary recommendation endpoint in Azure
- live booking creation in PostgreSQL
- winery approval token generation
- branded static pages for `/customer`, `/approve`, and `/accept`
- mobile-first partner action surfaces
- Cloudflare Pages-ready frontend with Azure API integration seams

## Running the frontend

```bash
cd apps/web
npm install
npm run dev
```

## Running the backend workspace

```bash
cd services/api
npm install
npm run build
```

## Environment variables

See `apps/web/.env.example` for frontend variables.

Key frontend variables:
- `NEXT_PUBLIC_DATA_MODE=remote`
- `NEXT_PUBLIC_API_BASE_URL=https://swagri-tailormoments-api-01.azurewebsites.net`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY=`
- `NEXT_PUBLIC_CUSTOMER_SIGN_IN_URL=`
- `NEXT_PUBLIC_PARTNER_SIGN_IN_URL=`
- `NEXT_PUBLIC_OPS_SIGN_IN_URL=`

## Deployment status

The frontend is hosted on Cloudflare Pages and the backend is deployed to an isolated Tailor Moments Azure Function App.

Current Azure isolation:
- dedicated resource group: `tailormoments-dev-rg`
- dedicated Function App: `swagri-tailormoments-api-01`
- dedicated PostgreSQL database: Tailor Moments only
- no REOC resource reuse in the Tailor Moments workflow path

## Cloudflare Pages

See `docs/deployment-cloudflare-pages.md` for the current setup and required environment variables.
