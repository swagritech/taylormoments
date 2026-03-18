alter table winery
  add column if not exists wine_styles jsonb;

update winery
set wine_styles = '[]'::jsonb
where wine_styles is null;

alter table winery
  alter column wine_styles set default '[]'::jsonb,
  alter column wine_styles set not null;
