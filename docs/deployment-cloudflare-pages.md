# Cloudflare Pages Deployment

This project is deployed to Cloudflare Pages as a static Next.js export.

## Repository settings

- Repository: `swagritech/taylormoments`
- Production branch: `main`
- Root directory: `apps/web`
- Current custom domain: `booking.swagritech.com.au`

## Build settings

- Framework preset: `None`
- Build command: `npm run build`
- Build output directory: `out`

## Environment variables

Use these in the Cloudflare Pages production environment:

- `NEXT_PUBLIC_DATA_MODE=remote`
- `NEXT_PUBLIC_API_BASE_URL=https://swagri-tailormoments-api-01.azurewebsites.net`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY=`
- `NEXT_PUBLIC_CUSTOMER_SIGN_IN_URL=`
- `NEXT_PUBLIC_PARTNER_SIGN_IN_URL=`
- `NEXT_PUBLIC_OPS_SIGN_IN_URL=`

Recommended rollout:

1. Set `NEXT_PUBLIC_DATA_MODE=remote`
2. Set `NEXT_PUBLIC_API_BASE_URL=https://swagri-tailormoments-api-01.azurewebsites.net`
3. Redeploy Pages
4. Test `/customer`, `/approve`, and `/accept`
5. Add the Turnstile site key after the Cloudflare widget is created

## Live frontend behavior

The frontend now supports:

- live itinerary recommendations via `POST /api/v1/itinerary/recommend`
- live booking requests via `POST /api/v1/bookings`
- winery approval token links via `POST /api/v1/action-tokens/winery-approve`
- mobile approval flow on `/approve?token=...`
- mobile transport acceptance flow on `/accept?token=...`

## Why this works on Pages

The routes remain static pages and the token-handling happens client-side, so Cloudflare Pages can host the UX while Azure Functions handles the workflow API.

## Current hosting posture

Use the current deployment as a live workflow prototype.

Appropriate uses:
- partner demos
- internal operations testing
- UX redesign rounds
- early backend contract validation

## After deployment

Validate:
- home page loads correctly
- `/customer`
- `/approve`
- `/accept`
- `/wineries`
- `/transport`
- `/ops`
- customer recommendation requests reach Azure
- booking requests create records successfully
- winery approval links land on the approve screen with the token filled in

## Next deployment step

After the frontend is confirmed against the live API, the next environment additions are:
- Entra External ID sign-in URLs
- Cloudflare Turnstile site key
- Azure Communication Services sender details on the API side
