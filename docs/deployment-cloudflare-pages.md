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

For demo mode:

- `NEXT_PUBLIC_DATA_MODE=demo`
- `NEXT_PUBLIC_API_BASE_URL=`

For Azure-backed workflow mode later:

- `NEXT_PUBLIC_DATA_MODE=remote`
- `NEXT_PUBLIC_API_BASE_URL=https://your-azure-api-host`

Expected remote endpoint shape:

- `GET /api/v1/workbench-state`
- `PUT /api/v1/workbench-state`

The app now consumes workflow data through a repository layer, so switching from demo mode to Azure mode is driven by configuration instead of a UI rewrite.

## Why this works

The current app uses static routes and client-side workflow state. That makes Cloudflare Pages a good fit while the backend APIs are still being introduced.

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
- `/wineries`
- `/transport`
- `/ops`
- booking switching works
- winery edits affect planning and ops
- the workflow status badge shows the correct data source mode

## Next deployment step

When Azure APIs are ready, set the environment variables above and test the same UI against the real backend contracts.
