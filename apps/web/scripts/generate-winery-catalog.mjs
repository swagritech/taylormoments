// Generates the customer-facing winery catalog from the live DB (single source of truth).
// Replaces the hand-maintained winery-prospects.json. Fetches GET /v1/wineries, keeps the
// catalog_featured wineries (the curated 39), and writes a customer-safe artifact with REAL
// winery UUIDs. Regenerate after winery data changes — never hand-edit the output.
//
// Run from apps/web:  node ./scripts/generate-winery-catalog.mjs [apiBaseUrl]
import { writeFileSync } from "node:fs";

const API_BASE = process.argv[2] || process.env.NEXT_PUBLIC_API_BASE_URL || "https://swagri-tailormoments-api-01.azurewebsites.net";
const url = `${API_BASE.replace(/\/$/, "")}/api/v1/wineries`;

const res = await fetch(url);
if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
const body = await res.json();
const all = body.wineries ?? [];
const featured = all.filter((w) => w.catalog_featured === true);
if (featured.length === 0) throw new Error("No catalog_featured wineries returned — is the API deployed?");

// Customer-safe shape only (no internal sales fields like partner likelihood / challenges).
const catalog = featured
  .map((w) => ({
    winery_id: w.winery_id,
    name: w.name,
    region: w.region,
    latitude: w.latitude ?? null,
    longitude: w.longitude ?? null,
    address: w.address ?? "",
    tasting_price: w.tasting_price ?? null,
    famous_for: w.famous_for ?? "",
    description: w.description ?? "",
    wine_styles: w.wine_styles ?? [],
    winery_signals: w.winery_signals ?? [],
    offers_cheese_board: w.offers_cheese_board ?? false,
    unique_experience_offers: w.unique_experience_offers ?? [],
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const out = new URL("../src/lib/data/winery-catalog.generated.json", import.meta.url);
writeFileSync(out, JSON.stringify(catalog, null, 2) + "\n");
console.log(`Wrote ${catalog.length} featured wineries to src/lib/data/winery-catalog.generated.json`);
