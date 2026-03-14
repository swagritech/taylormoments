# SwagriTech Backend Boundary

This document keeps a clean distinction between the greenfield Tailor Moments MVP and any existing SwagriTech Azure backend capability.

## What exists in this repo now

The current repository contains a standalone front-end MVP in `apps/web`.

It is intentionally:
- demo-friendly
- seeded with sample data
- independent from production integrations
- easy to change after partner feedback

## What belongs to Tailor Moments MVP

These pieces are new product work:
- customer booking journey
- winery availability portal concept
- transporter job board concept
- unified operations dashboard concept
- sample itinerary generation logic for demos

## What belongs to existing or future SwagriTech Azure backend work

These concerns should stay clearly separated until requirements are validated:
- real authentication and authorization
- real winery calendar sync
- real transport marketplace workflows
- booking persistence and audit history
- payment processing
- notifications and communications
- production APIs and data contracts

## Recommended integration approach

Treat the MVP as a front-end product prototype first.

When we are ready to connect to SwagriTech Azure services, we should add:
- an integration layer under `apps/web/src/lib/api`
- typed DTOs that describe backend contracts explicitly
- environment-based switching between seed data and live APIs

## Short-term rule

For the next two weeks, if a feature is only needed to tell the story in partner meetings, keep it in the MVP.
If a feature introduces backend coupling without improving learning, defer it.

