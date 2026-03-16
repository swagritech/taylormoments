alter table winery
  add column if not exists tasting_price numeric(10,2),
  add column if not exists description text,
  add column if not exists famous_for text,
  add column if not exists offers_cheese_board boolean not null default false,
  add column if not exists unique_experience_offers jsonb not null default '[]'::jsonb;
