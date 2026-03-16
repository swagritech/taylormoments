create table if not exists password_reset_token (
  token_id uuid primary key,
  user_id uuid not null references user_account(user_id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  status text not null check (status in ('active', 'used', 'expired')),
  created_at timestamptz not null default now(),
  used_at timestamptz
);

create index if not exists idx_password_reset_token_user_status
on password_reset_token (user_id, status, expires_at desc);

