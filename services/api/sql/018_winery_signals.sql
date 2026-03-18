alter table winery
  add column if not exists winery_signals jsonb;

update winery
set winery_signals = '[]'::jsonb
where winery_signals is null;

alter table winery
  alter column winery_signals set default '[]'::jsonb,
  alter column winery_signals set not null;
