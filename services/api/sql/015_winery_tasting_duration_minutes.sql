alter table winery
  add column if not exists tasting_duration_minutes integer;

update winery
set tasting_duration_minutes = 45
where tasting_duration_minutes is null;

alter table winery
  alter column tasting_duration_minutes set default 45,
  alter column tasting_duration_minutes set not null;

alter table winery
  drop constraint if exists winery_tasting_duration_minutes_check;

alter table winery
  add constraint winery_tasting_duration_minutes_check
  check (tasting_duration_minutes > 0 and tasting_duration_minutes <= 480);
