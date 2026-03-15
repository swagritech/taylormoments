# Tailor Moments V1 PostgreSQL Schema Outline

## Core tables

### booking
- booking_id UUID PK
- lead_name TEXT NOT NULL
- lead_phone TEXT NULL
- lead_email TEXT NULL
- booking_date DATE NOT NULL
- pickup_location TEXT NOT NULL
- party_size INTEGER NOT NULL
- status TEXT NOT NULL
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL

### booking_preference
- preference_id UUID PK
- booking_id UUID FK -> booking
- preferred_region TEXT NULL
- notes TEXT NULL

### winery
- winery_id UUID PK
- name TEXT NOT NULL
- region TEXT NOT NULL
- confirmation_mode TEXT NOT NULL
- capacity INTEGER NOT NULL
- active BOOLEAN NOT NULL
- created_at TIMESTAMPTZ NOT NULL
- updated_at TIMESTAMPTZ NOT NULL

### winery_availability
- availability_id UUID PK
- winery_id UUID FK -> winery
- service_date DATE NOT NULL
- start_time TIME NOT NULL
- end_time TIME NOT NULL
- remaining_capacity INTEGER NOT NULL
- status TEXT NOT NULL

### itinerary
- itinerary_id UUID PK
- booking_id UUID FK -> booking
- expert_pick BOOLEAN NOT NULL
- justification TEXT NOT NULL
- score NUMERIC(5,2) NOT NULL
- transport_required BOOLEAN NOT NULL
- status TEXT NOT NULL
- created_at TIMESTAMPTZ NOT NULL

### itinerary_stop
- itinerary_stop_id UUID PK
- itinerary_id UUID FK -> itinerary
- winery_id UUID FK -> winery
- position INTEGER NOT NULL
- arrival_time TIMESTAMPTZ NOT NULL
- departure_time TIMESTAMPTZ NOT NULL
- drive_minutes INTEGER NOT NULL

### transport_job
- transport_job_id UUID PK
- booking_id UUID FK -> booking
- itinerary_id UUID FK -> itinerary
- provider_id UUID NULL
- status TEXT NOT NULL
- pickup_time TIMESTAMPTZ NOT NULL
- vehicle_type TEXT NULL
- payout_estimate NUMERIC(10,2) NULL

### transporter
- transporter_id UUID PK
- name TEXT NOT NULL
- mobile_number TEXT NOT NULL
- active BOOLEAN NOT NULL

### action_token
- token_id UUID PK
- booking_id UUID FK -> booking
- token_type TEXT NOT NULL
- target_type TEXT NOT NULL
- target_id UUID NULL
- token_hash TEXT NOT NULL
- expires_at TIMESTAMPTZ NOT NULL
- status TEXT NOT NULL
- used_at TIMESTAMPTZ NULL
- created_at TIMESTAMPTZ NOT NULL

### exception_queue
- exception_id UUID PK
- booking_id UUID FK -> booking
- reason_code TEXT NOT NULL
- details JSONB NULL
- status TEXT NOT NULL
- created_at TIMESTAMPTZ NOT NULL
- resolved_at TIMESTAMPTZ NULL

## Recommended enums or constrained text values
- booking.status: `draft`, `awaiting_winery`, `confirmed`, `transport_pending`, `exception`, `cancelled`
- winery.confirmation_mode: `auto_confirm`, `manual_review`
- itinerary.status: `draft`, `ranked`, `selected`, `superseded`
- transport_job.status: `open`, `accepted`, `expired`, `cancelled`
- action_token.status: `active`, `used`, `expired`, `revoked`
- action_token.token_type: `winery_approve`, `transporter_accept`, `calendar_add`

## Priority indexes
- booking(booking_date, status)
- winery_availability(winery_id, service_date)
- itinerary(booking_id, expert_pick)
- action_token(expires_at, status)
- exception_queue(status, created_at)
