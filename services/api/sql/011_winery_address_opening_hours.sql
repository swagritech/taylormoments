alter table winery
  add column if not exists address text,
  add column if not exists opening_hours text;
