# Cloudflare Pages Deployment

This project can be deployed to Cloudflare Pages as a static Next.js export.

## Repository settings

- Repository: `swagritech/taylormoments`
- Production branch: `main`
- Root directory: `apps/web`

## Build settings

- Framework preset: `Next.js`
- Build command: `npm run build`
- Build output directory: `out`

## Why this works

The current app uses static routes and client-side state, so `Next.js` static export is a good fit for the hosted MVP.

## Recommended first deployment posture

Use the first Cloudflare deployment as a demo environment, not a production launch.

Recommended protections:
- Cloudflare Access or another lightweight gate if you want partner-only viewing
- no indexing until the production site exists

## After deployment

Validate:
- home page loads correctly
- `/customer`
- `/wineries`
- `/transport`
- `/ops`
- local client-side state still persists in the browser

## Next deployment step

When Azure APIs are introduced, reassess whether the app should stay fully static or move to a different deployment mode.
