create table if not exists winery_media_asset (
  media_id uuid primary key,
  winery_id uuid not null references winery(winery_id) on delete cascade,
  object_key text not null unique,
  public_url text not null,
  file_name text not null,
  content_type text not null,
  file_size_bytes bigint,
  caption text,
  status text not null default 'pending',
  uploaded_by_user_id uuid references user_account(user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_winery_media_asset_winery_status_created
  on winery_media_asset (winery_id, status, created_at desc);
