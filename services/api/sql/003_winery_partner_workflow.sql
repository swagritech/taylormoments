create table if not exists winery_contact (
  winery_id uuid primary key references winery(winery_id) on delete cascade,
  contact_name text,
  email text,
  phone text,
  preferred_channel text not null default 'email',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists winery_booking_request (
  request_id uuid primary key,
  booking_id uuid not null references booking(booking_id) on delete cascade,
  winery_id uuid not null references winery(winery_id) on delete cascade,
  action_token_id uuid not null references action_token(token_id) on delete cascade,
  action_url text not null,
  status text not null,
  sent_channel text not null,
  sent_recipient text,
  sent_at timestamptz not null default now(),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_winery_booking_request_winery_status
  on winery_booking_request (winery_id, status, created_at desc);

create index if not exists idx_winery_booking_request_token
  on winery_booking_request (action_token_id);

insert into winery_contact (winery_id, contact_name, email, phone, preferred_channel)
values
  ('11111111-1111-1111-1111-111111111111', 'Leeuwin Coast Cellar Door', 'bookings@leeuwincoast.example', '+61412000001', 'email'),
  ('22222222-2222-2222-2222-222222222222', 'Redgate Ridge Host Team', 'hosting@redgateridge.example', '+61412000002', 'email'),
  ('33333333-3333-3333-3333-333333333333', 'Caves Road Floor Team', 'team@cavesroadcellars.example', '+61412000003', 'sms'),
  ('44444444-4444-4444-4444-444444444444', 'Yallingup Hills Concierge', 'concierge@yallinguphills.example', '+61412000004', 'email')
on conflict (winery_id) do update
set
  contact_name = excluded.contact_name,
  email = excluded.email,
  phone = excluded.phone,
  preferred_channel = excluded.preferred_channel,
  updated_at = now();
