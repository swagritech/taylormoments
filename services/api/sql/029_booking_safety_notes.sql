alter table booking
  add column if not exists dietary_requirements jsonb not null default '[]'::jsonb,
  add column if not exists accessibility_requirements jsonb not null default '[]'::jsonb,
  add column if not exists occasion text,
  add column if not exists special_requests text;
