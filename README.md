# Tailor Moments

This repository contains the greenfield Tailor Moments MVP for partner discovery and early hosted demos.

## Structure

- `apps/web` - Next.js app for customer booking, winery controls, transport planning, and operations workflows.
- `docs/backend-boundary.md` - Clear separation between the new MVP and any existing SwagriTech Azure backend services.
- `docs/deployment-cloudflare-pages.md` - Cloudflare Pages deployment notes for the hosted workflow prototype.
- `tailormoments_system_architecture.pdf` - Earlier architecture draft.
- `tailormoments_system_architecture.docx` - Editable architecture draft.

## Current product status

The app is now a live workflow prototype rather than a purely static mockup.

Current capabilities:
- multiple enquiries
- shared booking board across screens
- winery settings that affect planning behavior
- transport planning derived from the active booking
- repository-based data access with demo and remote modes

## Running the app

```bash
cd apps/web
npm install
npm run dev
```

## Environment variables

See `apps/web/.env.example`.

Current supported variables:
- `NEXT_PUBLIC_DATA_MODE=demo|remote`
- `NEXT_PUBLIC_API_BASE_URL=https://your-azure-api-host`

Use `demo` for local storage-backed testing.
Use `remote` when an Azure API is ready to serve and persist workflow state.

## Deployment status

The current `apps/web` app is deployment-ready for a hosted workflow prototype on Cloudflare Pages.

Recommended use:
- demo/staging environment
- partner walkthroughs
- internal review
- production workflow prototyping before full auth and payments

Still not fully production complete:
- no real authentication yet
- no Azure-backed persistence connected yet
- no payment workflow yet
- no audit/security hardening yet

## Cloudflare Pages

See `docs/deployment-cloudflare-pages.md` for the current setup.
