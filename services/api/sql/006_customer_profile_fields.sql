alter table user_account
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists home_country text,
  add column if not exists age_group text,
  add column if not exists gender text;
