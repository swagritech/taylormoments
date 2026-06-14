-- 027: Storage for multilingual winery content and data provenance.
--
-- (a) winery_translation: normalized per-locale, per-field translations of static
--     winery content (description, famous_for, experience names, etc.). Keeps
--     translations in the DB (single source of truth) rather than the frontend.
--     Dynamic AI commentary is NOT stored here — it is generated per-request.
--
-- (b) provenance columns on winery: where each winery's data came from, when it was
--     scraped, a confidence band, and whether a human/the winery has verified it.
--     Supports the "winery self-review on signup" model — unverified rows are AI-
--     populated drafts the winery confirms or edits during onboarding.

create table if not exists winery_translation (
  winery_id uuid not null references winery(winery_id) on delete cascade,
  locale text not null,            -- BCP-47: 'zh-Hans', 'vi' (English lives in winery.*)
  field text not null,             -- e.g. 'description', 'famous_for'
  value text not null,
  machine_translated boolean not null default true,
  reviewed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (winery_id, locale, field)
);

create index if not exists idx_winery_translation_locale
  on winery_translation (locale);

alter table winery add column if not exists data_source_url text;
alter table winery add column if not exists data_scraped_at timestamptz;
alter table winery add column if not exists data_confidence text;   -- 'high' | 'medium' | 'low'
alter table winery add column if not exists data_verified boolean not null default false;
