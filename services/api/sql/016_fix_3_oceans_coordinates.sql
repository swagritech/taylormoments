-- Correct 3 Oceans coordinates to the verified winery location.
update winery
set
  latitude = -33.813177,
  longitude = 115.118549
where lower(name) = '3 oceans';
