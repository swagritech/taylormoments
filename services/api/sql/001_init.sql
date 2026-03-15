create table if not exists booking (
  booking_id uuid primary key,
  lead_name text not null,
  lead_phone text,
  lead_email text,
  booking_date date not null,
  pickup_location text not null,
  party_size integer not null check (party_size > 0),
  preferred_region text,
  preferred_wineries uuid[] not null default '{}',
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists winery (
  winery_id uuid primary key,
  name text not null,
  region text not null,
  confirmation_mode text not null,
  capacity integer not null check (capacity > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists winery_availability (
  availability_id uuid primary key,
  winery_id uuid not null references winery(winery_id) on delete cascade,
  service_date date not null,
  start_time time not null,
  end_time time not null,
  remaining_capacity integer not null,
  status text not null
);

create table if not exists action_token (
  token_id uuid primary key,
  booking_id uuid not null references booking(booking_id) on delete cascade,
  token_type text not null,
  target_type text not null,
  target_id uuid,
  token_hash text not null,
  expires_at timestamptz not null,
  status text not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_booking_date_status on booking (booking_date, status);
create index if not exists idx_winery_availability_date on winery_availability (service_date, winery_id);
create index if not exists idx_action_token_status_expiry on action_token (status, expires_at);
