# Cloudflare Pages Deployment

This project can be deployed to Cloudflare Pages as a static Next.js export.

## Repository settings

- Repository: `swagritech/taylormoments`
- Production branch: `main`
- Root directory: `apps/web`
- Recommended temporary custom domain: `tailormoments.swagritech.com.au`

## Build settings

- Framework preset: `Next.js (Static HTML Export)`
- Build command: `npm run build`
- Build output directory: `out`

## Why this works

The current app uses static routes and client-side state, so `Next.js` static export is a good fit for the hosted MVP.

## Recommended first deployment posture

Use the first Cloudflare deployment as a demo environment, not a production launch.

Recommended protections:
- Cloudflare Access or another lightweight gate if you want partner-only viewing
- no indexing until the production site exists
- use a SwagriTech subdomain now and move to the Tailor Moments domain later

## Custom domain setup

Recommended first hostname:

- `tailormoments.swagritech.com.au`

Cloudflare Pages custom domain flow:

1. Create the Pages project first.
2. In the Pages project, go to `Custom domains`.
3. Add `tailormoments.swagritech.com.au`.
4. If `swagritech.com.au` is already a Cloudflare zone on the same account, Cloudflare can create the DNS record for you.
5. If the DNS is elsewhere, add the CNAME only after associating the custom domain in the Pages dashboard.

Important:

Do not add the CNAME manually before associating the domain in the Pages dashboard, or resolution may fail.

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
