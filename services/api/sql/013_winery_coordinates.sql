-- Add canonical winery coordinates (WGS84) and backfill from geocoded address data
alter table winery
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

-- Backfill coordinates for existing seeded wineries
update winery as w
set latitude = v.latitude,
    longitude = v.longitude,
    updated_at = now()
from (values
  ('11111111-1111-1111-1111-111111111111'::uuid, -33.81799462, 115.03681765),
  ('22222222-2222-2222-2222-222222222222'::uuid, -33.81791409, 115.03893560),
  ('33333333-3333-3333-3333-333333333333'::uuid, -33.78755329, 115.07903354),
  ('44444444-4444-4444-4444-444444444444'::uuid, -33.78835900, 115.03129902),
  ('6be3229f-dc8c-8265-b76f-a0fa486fa504'::uuid, -33.74660153, 115.03245220),
  ('99889e7f-0541-3e5e-9cc9-a0219ec9dcdd'::uuid, -33.73696647, 115.01289565),
  ('786a007c-6447-c792-1c2d-c7eedcb1c80e'::uuid, -33.79630798, 115.03462001),
  ('af6a0bbf-f27a-5a9c-5d10-5123a1e4665b'::uuid, -33.80363523, 115.05605782),
  ('d5df22ab-333e-2eed-e6e1-0c46091d5198'::uuid, -33.79814600, 115.06630897),
  ('83a42af6-841d-a94d-07b9-83bb07c1d443'::uuid, -33.78204797, 115.04710804),
  ('6878ef0b-b794-39dc-dfec-d6d7200d28e7'::uuid, -33.80333444, 115.03798744),
  ('b1222f17-4b74-754c-fa56-5a5bfc96a463'::uuid, -33.77703903, 115.09325688),
  ('81c43507-fd2d-866e-7ce9-b3697ef1bb75'::uuid, -33.99666589, 115.05435328),
  ('8023295f-0fda-e61e-8ff9-cf418ffe0f7d'::uuid, -33.99545149, 115.05145070),
  ('bf7e6df5-5101-2569-ee7f-489c107f935e'::uuid, -33.96637357, 115.03510776),
  ('7097c5db-283a-6e0e-58ad-abd598d233e9'::uuid, -33.96979020, 115.10448879),
  ('0220379d-36c2-41b8-34e2-762538e27955'::uuid, -33.98051220, 115.05324335),
  ('c22cbb53-a339-8a7b-6115-3128656645ce'::uuid, -34.04393236, 115.03172373),
  ('d1239ea2-d792-43c7-06b1-dd65a8b5e269'::uuid, -33.96293472, 115.03423663),
  ('773a08da-f201-c484-853b-cc5e693bcd5e'::uuid, -33.98516094, 115.08858855),
  ('de8c34be-f131-04ad-2fbd-3013cfbd396b'::uuid, -33.68914721, 115.07698588),
  ('d83fd6d2-8bdd-989f-53e2-4e4d641d6f71'::uuid, -33.70389742, 115.07692000),
  ('5c8e4e4b-601e-70f2-3c90-3eb9bcacbf3d'::uuid, -33.71433573, 115.04716772),
  ('017d1fc8-1afd-10bd-1b80-0f751c7a3085'::uuid, -33.72769742, 115.03845610),
  ('5d5bd129-3b5e-bb49-6605-6a6098ba8c72'::uuid, -33.67934439, 115.02710472),
  ('82dc2053-1d49-5227-9f95-7274a025727a'::uuid, -33.71963962, 115.04786014),
  ('67b423d3-54e3-48fa-3357-6b29bc976ccd'::uuid, -33.82726599, 115.06169532),
  ('8d99b646-1362-04a2-9efb-b2e4a0fbbae8'::uuid, -33.89202110, 115.03345761),
  ('d1bf0d17-ae35-b32c-7f8a-be3b7ff4c043'::uuid, -33.72004800, 115.03140673),
  ('31378e5f-07d1-217b-36e6-af243908afda'::uuid, -33.81675370, 115.06323323),
  ('e831283e-09c2-eaca-e1f3-c2f4f1f41308'::uuid, -33.83609235, 115.13087393),
  ('b4e8b6a2-851b-de47-31f3-68e53a0494e9'::uuid, -33.89461588, 115.03599942),
  ('75208f29-0dc6-1580-78e6-9aa982e6a4a9'::uuid, -33.78238999, 115.13591598),
  ('36716a04-29bc-98e3-1fcd-f2e7602e02e7'::uuid, -33.81660811, 115.11710699),
  ('fa2f4f97-b0f9-2886-4ad6-6711ab28781d'::uuid, -33.95135185, 115.16438629),
  ('49e41adf-d8bc-e9ef-9158-f33022a104ce'::uuid, -34.02050687, 115.17854165),
  ('c60a5b7c-8a29-51e8-4c23-0a945033ad64'::uuid, -34.18857945, 115.15850027),
  ('bc30ab2c-95ed-c658-29dd-6d74521e7184'::uuid, -34.17204569, 115.12403690),
  ('1b5e3afb-da62-c8a2-c13c-f259f5c1039d'::uuid, -33.91052038, 115.14125383)
) as v(winery_id, latitude, longitude)
where w.winery_id = v.winery_id
  and (w.latitude is distinct from v.latitude or w.longitude is distinct from v.longitude);

create index if not exists idx_winery_lat_lon on winery (latitude, longitude);
