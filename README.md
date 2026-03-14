# Tailor Moments

This repository contains the greenfield Tailor Moments MVP for partner discovery and early hosted demos.

## Structure

- `apps/web` - Next.js MVP used to demo the customer, winery, transport, and operations experience.
- `docs/backend-boundary.md` - Clear separation between the new MVP and any existing SwagriTech Azure backend services.
- `docs/deployment-cloudflare-pages.md` - Initial Cloudflare Pages deployment notes for the hosted demo.
- `tailormoments_system_architecture.pdf` - Earlier architecture draft.
- `tailormoments_system_architecture.docx` - Editable architecture draft.

## MVP goal

In the first two weeks, the aim is not a production-ready marketplace. The aim is a credible working prototype that helps gather feedback from wineries and transport providers.

## Running the app

```bash
cd apps/web
npm install
npm run dev
```

## Deployment status

The current `apps/web` app is deployment-ready for a hosted demo on Cloudflare Pages.

Recommended use:
- demo/staging environment
- partner walkthroughs
- internal review

Not yet recommended as production:
- no real authentication
- no Azure-backed persistence
- local demo data adapter still active

## Cloudflare Pages

See `docs/deployment-cloudflare-pages.md` for the initial setup.
