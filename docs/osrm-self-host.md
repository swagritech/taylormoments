# Self-hosted OSRM (Tailor Moments)

Use a dedicated OSRM instance so itinerary travel-time calls do not depend on the public shared endpoint.

## 1) Prepare data (WA extract)

Recommended source: Geofabrik Australia/Oceania extract. Keep the `.osm.pbf` file in a persistent volume.

## 2) Build routing files

```bash
docker run --rm -t -v ${PWD}:/data osrm/osrm-backend osrm-extract -p /opt/car.lua /data/western-australia.osm.pbf
docker run --rm -t -v ${PWD}:/data osrm/osrm-backend osrm-partition /data/western-australia.osrm
docker run --rm -t -v ${PWD}:/data osrm/osrm-backend osrm-customize /data/western-australia.osrm
```

## 3) Run server

```bash
docker run -d --name tm-osrm -p 5000:5000 -v ${PWD}:/data osrm/osrm-backend osrm-routed --algorithm mld /data/western-australia.osrm
```

## 4) Verify

```bash
curl "http://localhost:5000/table/v1/driving/115.075,-33.952;115.046991,-33.824264?annotations=duration"
```

## 5) Wire API app settings

- `TM_TRAVEL_TIME_PROVIDER=osrm`
- `TM_TRAVEL_TIME_OSRM_BASE_URL=https://<your-osrm-host>`
- `TM_TRAVEL_TIME_CACHE_BACKEND=redis`
- `TM_TRAVEL_TIME_REDIS_URL=rediss://...`

Use script:

```powershell
powershell -ExecutionPolicy Bypass -File services/api/scripts/configure-travel-performance.ps1 `
  -OsrmBaseUrl "https://osrm.booking.swagritech.com.au" `
  -RedisUrl "rediss://:password@hostname:6380" `
  -WarmupToken "<secret>"
```
