alter table user_account
  add column if not exists partner_role_title text,
  add column if not exists terms_accepted_at timestamptz;

alter table winery
  add column if not exists website text;
