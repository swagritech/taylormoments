alter table booking
  add column if not exists preferred_start_time time,
  add column if not exists preferred_end_time time;
