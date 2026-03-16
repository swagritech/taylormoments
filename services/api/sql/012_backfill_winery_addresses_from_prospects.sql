-- Backfill winery.address from prospect source data by winery name
-- Safe/idempotent: only fills blank addresses

with source(name, full_address) as (
values
  ('Vasse Felix', '4415 Caves Rd, Wilyabrup'),
  ('Cullen Wines', '4323 Caves Rd, Wilyabrup'),
  ('Fraser Gallop', '493 Metricup Rd, Wilyabrup'),
  ('Woodlands', '3948 Caves Rd, Wilyabrup'),
  ('Stormflower', '3503 Caves Rd, Wilyabrup'),
  ('Windows Estate', '400 Quininup Rd, Wilyabrup'),
  ('Pierro', '4051 Caves Rd, Wilyabrup'),
  ('Ashbrook Estate', '379 Tom Cullity Dr, Wilyabrup'),
  ('Hayshed Hill', '511 Harmans Mill Rd, Wilyabrup'),
  ('Fermoy Estate', '838 Metricup Rd, Wilyabrup'),
  ('Gralyn Estate', '4145 Caves Rd, Wilyabrup'),
  ('Menzies Vineyard', '400 Metricup Rd, Wilyabrup'),
  ('Voyager Estate', '41 Stevens Rd, Margaret River'),
  ('Leeuwin Estate', 'Stevens Rd, Margaret River'),
  ('Cape Mentelle', '331 Wallcliffe Rd, Margaret River'),
  ('Stella Bella', '205 Rosa Brook Rd, Margaret River'),
  ('Xanadu Wines', '316 Boodjidup Rd, Margaret River'),
  ('Mr. Barval', '7087 Caves Rd, Redgate'),
  ('Yeah Wine', '401 Wallcliffe Rd, Margaret River'),
  ('McHenry Hohnen', '5962 Bussell Hwy, Margaret River'),
  ('Deep Woods', '889 Commonage Rd, Yallingup'),
  ('Aravina Estate', '61 Thornton Rd, Yallingup'),
  ('Wills Domain', '17 Brash Rd, Yallingup'),
  ('Blind Corner', '1101 Caves Rd, Yallingup'),
  ('Marri Wood Park', '28 Whittle Rd, Yallingup'),
  ('Skigh Wine', '633 Abbeys Farm Rd, Yallingup'),
  ('Howard Park', '543 Miamup Rd, Cowaramup'),
  ('Passel Estate', '655 Ellen Brook Rd, Cowaramup'),
  ('House of Cards', 'Cnr Caves & Quininup Rd, Cowaramup'),
  ('Bettenay''s', '248 Tom Cullity Dr, Cowaramup'),
  ('LS Merchants', '163 Treeton Rd N, Cowaramup'),
  ('Edwards Wines', '687 Ellen Brook Rd, Cowaramup'),
  ('Churchview', '8 Gale Rd, Metricup'),
  ('3 Oceans', 'Cnr Boundary Rd & Bussell Hwy'),
  ('Brown Hill', '925 Rosa Brook Rd, Rosa Brook'),
  ('Si Vintners', '779 Davis Rd, Rosa Glen'),
  ('Glenarty Road', '70 Glenarty Rd, Karridale'),
  ('Hamelin Bay', '199 McDonald Rd, Karridale'),
  ('Evoi Wines', '529 Osmington Rd, Bramley')
)
update winery w
set address = s.full_address,
    updated_at = now()
from source s
where lower(trim(w.name)) = lower(trim(s.name))
  and (w.address is null or btrim(w.address) = '');
