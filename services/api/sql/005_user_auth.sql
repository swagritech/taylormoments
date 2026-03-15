create table if not exists user_account (
  user_id uuid primary key,
  email text not null unique,
  password_hash text not null,
  role text not null,
  display_name text not null,
  winery_id uuid,
  transport_company text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_account_role on user_account (role);
