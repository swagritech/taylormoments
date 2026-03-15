insert into winery (winery_id, name, region, confirmation_mode, capacity, active)
values
  ('11111111-1111-1111-1111-111111111111', 'Leeuwin Coast Estate', 'Wilyabrup', 'auto_confirm', 10, true),
  ('22222222-2222-2222-2222-222222222222', 'Redgate Ridge', 'Redgate', 'manual_review', 12, true),
  ('33333333-3333-3333-3333-333333333333', 'Caves Road Cellars', 'Cowaramup', 'auto_confirm', 8, true),
  ('44444444-4444-4444-4444-444444444444', 'Yallingup Hills Winery', 'Yallingup Siding', 'manual_review', 14, true)
on conflict (winery_id) do update
set
  name = excluded.name,
  region = excluded.region,
  confirmation_mode = excluded.confirmation_mode,
  capacity = excluded.capacity,
  active = excluded.active,
  updated_at = now();

insert into winery_availability (availability_id, winery_id, service_date, start_time, end_time, remaining_capacity, status)
values
  ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '2026-04-10', '10:00', '11:15', 8, 'open'),
  ('bbbb2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '2026-04-10', '11:30', '12:30', 10, 'open'),
  ('cccc3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '2026-04-10', '09:45', '11:15', 6, 'open'),
  ('dddd4444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '2026-04-10', '12:30', '13:45', 12, 'open'),
  ('eeee1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '2026-04-11', '10:15', '11:30', 10, 'open')
on conflict (availability_id) do update
set
  winery_id = excluded.winery_id,
  service_date = excluded.service_date,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  remaining_capacity = excluded.remaining_capacity,
  status = excluded.status;
