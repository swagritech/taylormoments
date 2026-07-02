# Tailor Moments — Architecture Review & Product Roadmap (June 2026)

Product vision: **B2B2C winery-tour platform for Margaret River** with stable B2B revenue
(% rev-share on bookings from wineries + transport, later a partner SaaS subscription tier),
premium inbound-Asia customers, an AI concierge across the booking lifecycle, and
distribution through AI platforms (Claude / ChatGPT / Gemini) to complete
discovery → booking at scale.

Team: two founders (frontend + backend), no hires planned — leverage managed services and
AI agents for ops. No signed partners yet; ~40 prospect wineries (4 live canonical records).

---

## Current state (assessment summary)

**Stack:** Next.js static export on Cloudflare Pages · Azure Functions + PostgreSQL ·
self-hosted OSRM + Redis (travel times) · OpenAI (justifications) · R2 (media) ·
ACS email/SMS (NOT configured in prod) · custom HMAC auth (customer/winery/transport/ops).

**Strengths:** lean and cheap (<~$150/mo run cost); clean repository pattern; action-token
magic-link approvals; booking state machine; itinerary engine with full generation logging;
genuine Asian-market differentiation (transcreated zh-Hans/vi, WeChat/LINE signals).

**Critical gaps found:**
1. **Email/SMS unconfigured in prod** — winery approval links & booking notifications are
   only logged, never sent. The core booking loop is severed. (Also breaks password reset.)
2. Turnstile not enforced (bot bookings possible).
3. No staging environment — everything is tested in production.
4. No tests, no CI; manual deploys from laptops; direct pushes to main.
5. Frontend/backend types duplicated by hand (no shared contract) — already caused
   duplicated work (two homepage implementations).
6. Partner model hard-coded (role enum + `transport_company` string on user) — blocks new
   partner types (restaurants, hotels, experiences, shipping).
7. No payments/pricing/commission anywhere in the schema.
8. Booking lifecycle is create-only: no customer modify/cancel, no post-trip states.

---

## Commercial model → technical implications

| Decision | Implication |
|---|---|
| % rev-share on bookings | **Stripe Connect destination charges**: customer pays TM, platform fee retained automatically, partner share paid out by Stripe. No invoicing ops. |
| Future partner SaaS (insights/tools) | Start **logging booking attribution + partner revenue events now** so the analytics tier has historical data at launch. Schema: `partner_revenue_event`. |
| Connect to partner booking systems (Rezdy etc.) | Do a **Rezdy discovery spike** early: Rezdy's agent/marketplace model may provide availability + booking + commission in one integration. Fallback for non-Rezdy partners: **.ics calendar invites** on confirmed bookings (works with Outlook + Google, no OAuth). |
| B = merchants (wineries, transport, later restaurants/hotels/experiences) | **Generalize `partner` entity before adding partner type #3.** Travel agencies deferred. |
| Two-person team + AI agents | Buy over build: Stripe hosted surfaces, Resend/Postmark email, Rezdy sync. The **MCP server doubles as internal AI-agent tooling.** |
| Wine shipment: export to Asia via partner (candidate: australiatastingroom.com, unvetted) | **Concierge-first**: "ship my wine home" request + manual handoff + referral commission. Do NOT build export compliance. Vet partner first (checklist below). |

---

## Roadmap

### P0 — Stop the bleeding (1–2 weeks) — mostly backend/ops
- [ ] **Email live in production.** Configure ACS (or switch to Resend — simpler, ~free at
      this volume). Verify: winery approval links, booking confirmations, password reset.
- [ ] **.ics calendar attachment** on booking-confirmed emails to partners (and customers).
      Cheap, universal "integration" with Outlook/Google before any real API work.
- [ ] **Enforce Turnstile** (`TM_TURNSTILE_SECRET_KEY` in prod app settings).
- [ ] **Staging environment**: second Function App + small Postgres; frontend preview
      channel pointing at it; add staging origin to API CORS.
- [ ] **CI on GitHub Actions**: tsc + build + minimal API tests on PR; auto-deploy Pages on
      merge to main (kills the "is my fix live?" class of confusion).
- [ ] **Alerting**: App Insights alert on 5xx rate + failed notification sends.
- [ ] Finish converting remaining old-design pages (/plan, /customer/dashboard, /partner,
      /partner/ops, /accept, /approve, /custom) — already agreed, in progress.

### P1 — Revenue foundation (4–8 weeks)
- [ ] **Stripe payments (hosted Checkout)**: deposit or full payment at booking; refunds on
      cancel. Booking states extended: `awaiting_payment`, `paid`, `refunded`.
- [ ] **Pricing in the database** (tastings, experiences, packages) — retire the static
      frontend catalog as the source of truth (it already drifts).
- [ ] **Partner entity refactor**: `partner(id, type, name, payout_account, terms,
      commission_pct, capabilities)`; users belong to partners; roles become
      partner-scoped. Migration path from current winery/transport columns.
- [ ] **Customer booking management**: magic-link (email) access to view/modify/cancel;
      lifecycle states `completed` + post-trip hooks (enables concierge later).
- [ ] **Booking attribution + revenue event logging** (feeds future SaaS analytics).
- [ ] **Rezdy discovery spike** (timebox: 2–3 days): agent model, API surface, which target
      wineries use it; decide build-vs-join for availability/commission.
- [ ] Founding-partner onboarding flow: self-serve signup → profile → availability →
      first booking, smooth enough to demo in a winery's tasting room on an iPad.

### P2 — B2B rails (2–4 months)
- [ ] **Stripe Connect payouts** with destination charges + automatic platform fee
      (the rev-share engine). Partner onboarding via Stripe hosted onboarding.
- [ ] **OpenAPI contract** for the API; generate frontend types from it (ends type drift);
      versioned `/v1` formalized. This is also the base for MCP + B2B API.
- [ ] **Availability sync v1**: Rezdy integration if the spike supports it; otherwise
      iCal-feed import + the existing portal availability UI.
- [ ] **Partner analytics v1** (the SaaS seed): monthly revenue statement, bookings sent,
      conversion, guest origin mix. Free for founding partners; becomes the paid tier's core.
- [ ] **New partner types** (restaurant / experience venue) on the generalized partner
      entity — validates the refactor with real product surface.
- [ ] Webhooks out (booking created/confirmed/cancelled) — needed by MCP, Rezdy, and any
      future agency integrations.

### P3 — AI layer & scale (3–6 months)
- [ ] **MCP server** exposing: search_wineries, get_availability, recommend_itinerary,
      create_booking (payment-linked), get_booking, modify_booking. One implementation
      serves Claude, ChatGPT, Gemini (all support MCP) **and** internal AI ops agents.
- [ ] **AI concierge**: WhatsApp + WeChat channels (target-market fit), grounded on the
      MCP tools + booking context. Pre-trip Q&A → in-trip changes → post-trip follow-up.
- [ ] **Post-trip automation**: review request → return-visit offer → wine reshipment
      prompt. This is the return-customer engine.
- [ ] **Wine shipment v1 (concierge)**: "ship my wine home" button on itinerary/summary →
      ops queue → vetted partner handoff → referral commission tracked as revenue event.
- [ ] **Offline itinerary** (PWA/add-to-home or rich email/PDF) — Margaret River coverage
      is patchy; travelers need the plan without signal.
- [ ] Shareable itinerary links (group planning = organic acquisition).

---

## Cost-efficiency notes (do opportunistically, not urgently)
- **Retire Redis**: winery↔winery travel legs are fixed — precompute the ~40×40 matrix
  into Postgres/static file; compute only pickup→winery legs live. OSRM can shrink to a
  minimal instance (or be replaced by the matrix + calibrated haversine for pickup legs).
- Cache OpenAI justifications per (winery set, locale, occasion) — high repetition.
- Keep Functions on consumption plan; App Insights sampling on.
- Current run cost is healthy; the real cost risk is founder time lost to missing
  staging/CI, not cloud spend.

## Wine-shipping partner vetting checklist (for australiatastingroom.com or others)
- Export licensing + experience with target markets (CN, VN, SG, JP, KR) incl. duties,
  labeling, and per-country personal-import limits.
- Door-to-door tracking + temperature-controlled options (premium positioning).
- Pickup logistics from Margaret River cellar doors (or consolidation point).
- Commission/referral structure and white-label packaging options.
- Insurance and breakage/loss policy; customer-service SLA in guest languages.

## Working agreements (two-founder hygiene)
- Frontend = Anh, backend/API/Azure = Sean; shared surfaces (schemas, live-api types,
  explore flow) get a heads-up before edits (the homepage was built twice in June).
- All changes via branch → PR → CI green → merge; Pages auto-deploys from main.
- Production config changes (app settings, CORS, domains) noted in this repo's docs.
