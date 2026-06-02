create table if not exists winery_id_alias (
  alias_winery_id uuid primary key,
  canonical_winery_id uuid not null references winery(winery_id) on delete cascade,
  winery_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (alias_winery_id <> canonical_winery_id)
);

create index if not exists idx_winery_id_alias_canonical
  on winery_id_alias (canonical_winery_id);

with ranked as (
  select
    winery_id,
    name,
    row_number() over (
      partition by lower(name)
      order by updated_at desc nulls last, created_at desc nulls last, winery_id desc
    ) as rank_in_name
  from winery
),
canonical as (
  select
    lower(name) as name_key,
    name as winery_name,
    winery_id as canonical_winery_id
  from ranked
  where rank_in_name = 1
),
alias_rows as (
  select
    ranked.winery_id as alias_winery_id,
    canonical.canonical_winery_id,
    canonical.winery_name
  from ranked
  inner join canonical
    on canonical.name_key = lower(ranked.name)
  where ranked.winery_id <> canonical.canonical_winery_id
)
insert into winery_id_alias (
  alias_winery_id,
  canonical_winery_id,
  winery_name,
  updated_at
)
select
  alias_rows.alias_winery_id,
  alias_rows.canonical_winery_id,
  alias_rows.winery_name,
  now()
from alias_rows
on conflict (alias_winery_id) do update
set
  canonical_winery_id = excluded.canonical_winery_id,
  winery_name = excluded.winery_name,
  updated_at = now();
