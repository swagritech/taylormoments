# Tailor Moments V1 Brief

This document captures the active V1 product brief for Tailor Moments and supersedes any earlier assumptions that conflict with it.

## Core product direction

Tailor Moments V1 is a frictionless booking prototype for winery visits and transport coordination.

Key principles:
- mobile-first UX
- recommendation-led booking experience
- no-login partner actions
- exception-only internal ops workflow
- full separation from REOC infrastructure and data

## Stack direction

- Frontend: Next.js
- Backend: Azure Functions or Azure Container Apps
- Database: PostgreSQL
- Identity: Entra External ID with OTP
- AI: OpenAI structured outputs
- Edge/security: Cloudflare + Turnstile
- Messaging: Azure Communication Services

## Non-negotiable constraints

- Tailor Moments resources must remain isolated from REOC resources
- UI should be touch-first and vertically structured
- "Portal login" for winery/driver action should be replaced with one-click magic links
- `/itinerary/recommend` must return structured JSON including `expert_pick` and `justification`
- ActionToken logic is a priority path for the 2-week partner pitch

## UX modules

### 1. Recommended for You
- replace complex filters with a top recommendation
- show one large expert-picked itinerary card first
- hide secondary options behind `Show More`

### 2. One-Click partner actions
- winery confirmation by magic link
- transporter accept flow by direct link
- no login required for the action itself

### 3. Exception-only ops
- ops team should focus on unresolved bookings only
- non-response on token within 4 hours escalates to exception queue
- AI should help suggest the next best recovery option

## Immediate implementation priorities

1. PostgreSQL schema
2. REST contracts
3. ActionToken workflow
4. Recommendation endpoint contract
5. Mobile-first front-end redesign against those flows
