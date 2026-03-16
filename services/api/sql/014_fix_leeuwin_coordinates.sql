-- Correct Leeuwin Estate coordinates to the verified cellar-door location.
update winery
set
  latitude = -34.012521,
  longitude = 115.064967
where lower(name) = 'leeuwin estate';
