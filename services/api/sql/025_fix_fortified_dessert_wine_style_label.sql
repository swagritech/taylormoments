update winery
set
  wine_styles = coalesce(
    (
      select jsonb_agg(
        case
          when value = to_jsonb('Fortfied & Desert Wines'::text) then to_jsonb('Fortified & Dessert Wines'::text)
          else value
        end
      )
      from jsonb_array_elements(coalesce(winery.wine_styles, '[]'::jsonb)) as styles(value)
    ),
    '[]'::jsonb
  ),
  updated_at = now()
where coalesce(wine_styles, '[]'::jsonb) @> '["Fortfied & Desert Wines"]'::jsonb;
