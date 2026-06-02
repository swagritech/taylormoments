create table if not exists itinerary_generation_log (
  generation_id uuid primary key,
  created_at timestamptz not null default now(),
  request_trace_id text,
  status text not null check (status in ('success', 'no_match', 'error')),
  duration_ms integer not null check (duration_ms >= 0),
  input_snapshot jsonb not null default '{}'::jsonb,
  normalized_input_snapshot jsonb not null default '{}'::jsonb,
  result_snapshot jsonb,
  scheduling_trace jsonb,
  decision_summary text,
  error_message text
);

create index if not exists idx_itinerary_generation_log_created_at
  on itinerary_generation_log (created_at desc);

create index if not exists idx_itinerary_generation_log_status
  on itinerary_generation_log (status, created_at desc);

create table if not exists itinerary_generation_candidate_log (
  candidate_log_id uuid primary key,
  generation_id uuid not null references itinerary_generation_log(generation_id) on delete cascade,
  created_at timestamptz not null default now(),
  winery_id uuid,
  winery_name text not null,
  included boolean not null,
  exclusion_reasons jsonb not null default '[]'::jsonb,
  scoring_breakdown jsonb not null default '{}'::jsonb,
  notes text
);

create index if not exists idx_itinerary_generation_candidate_generation
  on itinerary_generation_candidate_log (generation_id, included);
