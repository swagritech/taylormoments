# Travel Alerting Setup (Phase 4)

## Email target

- `sean@swagritech.com.au`

## GitHub Actions monitor

Workflow:
- `.github/workflows/travel-quality-monitor.yml`

Behavior:
- Runs `npm run quality:travel` on:
  - hourly schedule (`17` minutes past each hour, UTC),
  - manual trigger,
  - pushes to `main` that touch travel-quality logic.
- Uploads a `travel-quality-report` artifact for every run.
- Marks the workflow as failed when thresholds are breached.

Notification path:
- GitHub Actions failure notifications are delivered via GitHub notification settings for repo admins/watchers.
- Workflow actor identity in this repo is `sean@swagritech.com.au`.

## Azure Monitor alerts (live)

Action group:
- `tm-api-ops-email-alerts`
- receiver: `sean@swagritech.com.au`

Metric alerts:
1. `tm-api-http5xx-spike`
- scope: `swagri-tailormoments-api-01`
- condition: `total Http5xx > 5`
- window/frequency: `5m / 5m`
- severity: `2`

2. `tm-api-response-time-high`
- scope: `swagri-tailormoments-api-01`
- condition: `avg HttpResponseTime > 3`
- window/frequency: `10m / 5m`
- severity: `3`

These alerts are enabled and wired to the action group email receiver.
