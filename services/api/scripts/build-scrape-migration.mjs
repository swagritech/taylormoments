// Turn the Phase-2 website scrape results into a reviewable SQL migration.
//
// Input:  scripts/scrape-results.json  (the workflow's returned array of per-winery objects)
// Output: sql/030_winery_scrape.sql     (UPDATEs that MERGE scraped signals into the DB)
//
// Safety: scraped signals/styles are UNIONed with whatever's already in the DB (never a
// destructive replace), filtered to the allowed taxonomy, with USP/language/religious
// signals stripped (those are collected via winery self-review, never scraped). Run after
// the scrape completes:  TM_POSTGRES_URL=... node ./scripts/build-scrape-migration.mjs
import { readFileSync, writeFileSync } from "node:fs";
import pg from "pg";

const ALLOWED_STYLES = new Set([
  "Organic & Biodynamic", "Natural & Minimal Intervention", "Small batch & Boutique",
  "Family-owned Estate", "Estate-grown fruit only", "Well known Margaret River Name",
  "Lesser known (off the beaten track)", "Red Wine Specialist", "White Wine Specialist",
  "Sparkling & Method traditionnelle Specialist", "Fortified & Dessert Wines",
  "Internationally awarded", "Wines only available at cellar door",
]);

// Full WinerySignal taxonomy MINUS the never-scrape USP/language/religious signals.
const NEVER = new Set([
  "mandarin_staff", "vietnamese_staff", "asian_pairing", "wechat_line",
  "hosted_asian_groups", "exported_asia", "halal", "kosher",
]);
const ALLOWED_SIGNALS = new Set([
  "view_stunning","intimate_welcome","historic_estate","secluded","garden_picnic",
  "wheelchair_access","wheelchair_pathways","wheelchair_tasting","accessible_bathroom",
  "step_free_entry","accessible_parking","minibus_parking","minibus_access","hearing_loop",
  "large_print","quiet_space","seated_tasting","dog_friendly","child_friendly","close_to_town",
  "cellar_door_tasting","guided_tasting","private_tasting_room","barrel_tasting","sunset_tasting",
  "winery_lunch","cheese_board","charcuterie_board","wine_chocolate","cooking_class",
  "picnic_on_estate","vineyard_walk","cellar_tour","blending_experience","harvest_experience",
  "accommodation","corporate_events","wedding_venue","vegetarian","vegan","dairy_free",
  "gluten_free","gluten_free_strict","nut_free","byo_food","no_food","custom_on_request",
  "mon","tue","wed","thu","fri","sat","sun",
  "halliday_5star","gold_medals","trophy_winner","press_featured","multi_generation",
  "female_winemaker","certified_organic","regenerative","small_production",
]);

const DAY_MAP = {
  monday: "mon", tuesday: "tue", wednesday: "wed", thursday: "thu",
  friday: "fri", saturday: "sat", sunday: "sun",
  mon: "mon", tue: "tue", wed: "wed", thu: "thu", fri: "fri", sat: "sat", sun: "sun",
};

const sqlEsc = (s) => String(s ?? "").replace(/'/g, "''");

const results = JSON.parse(readFileSync(new URL("./scrape-results.json", import.meta.url), "utf8"));

const PG = process.env.TM_POSTGRES_URL;
if (!PG) {
  console.error("Missing TM_POSTGRES_URL");
  process.exit(1);
}
const client = new pg.Client({ connectionString: PG, ssl: { rejectUnauthorized: false } });
await client.connect();

// winery_id -> existing styles/signals for the featured set
const existing = await client.query(
  `SELECT winery_id, name, wine_styles, winery_signals FROM winery WHERE catalog_featured=true AND active=true`,
);
const byId = new Map(existing.rows.map((r) => [r.winery_id, r]));

const lines = [];
const summary = [];
let matched = 0;

for (const r of results) {
  const row = byId.get(r.id);
  if (!row) {
    summary.push(`SKIP (no match): ${r.winery} (${r.id})`);
    continue;
  }
  matched += 1;

  const styles = new Set((row.wine_styles ?? []).filter((s) => ALLOWED_STYLES.has(s)));
  for (const s of r.wine_styles ?? []) if (ALLOWED_STYLES.has(s)) styles.add(s);

  const signals = new Set((row.winery_signals ?? []).filter((s) => ALLOWED_SIGNALS.has(s) && !NEVER.has(s)));
  for (const s of r.winery_signals ?? []) if (ALLOWED_SIGNALS.has(s) && !NEVER.has(s)) signals.add(s);

  // open days -> day signals
  for (const d of r.open_days ?? []) {
    const code = DAY_MAP[String(d).trim().toLowerCase()];
    if (code) signals.add(code);
  }
  // lunch tier -> food signal
  const tier = r.lunch?.tier;
  if (tier === "restaurant") signals.add("winery_lunch");
  if (tier === "platters" && !signals.has("winery_lunch")) signals.add("cheese_board");

  const styleArr = [...styles];
  const signalArr = [...signals];
  const description = sqlEsc((r.description ?? "").trim());
  const famousFor = sqlEsc((r.famous_for ?? "").trim());
  const hours = sqlEsc((r.opening_hours_note ?? "").trim());
  const conf = sqlEsc(r.confidence ?? "");
  const src = sqlEsc((r.sources ?? [])[0] ?? "");

  lines.push(`-- ${row.name}  (confidence: ${r.confidence}; +${signalArr.length - (row.winery_signals ?? []).length} signals)`);
  lines.push(`UPDATE winery SET
  wine_styles = '${sqlEsc(JSON.stringify(styleArr))}'::jsonb,
  winery_signals = '${sqlEsc(JSON.stringify(signalArr))}'::jsonb,${description ? `\n  description = '${description}',` : ""}${famousFor ? `\n  famous_for = '${famousFor}',` : ""}${hours ? `\n  opening_hours = '${hours}',` : ""}
  data_scraped_at = now(),
  data_confidence = '${conf}',${src ? `\n  data_source_url = '${src}',` : ""}
  updated_at = now()
WHERE winery_id = '${row.winery_id}';`);
  lines.push("");

  summary.push(
    `${row.name.padEnd(20)} sigs ${(row.winery_signals ?? []).length} -> ${signalArr.length}  | lunch:${tier ?? "?"} | days:${(r.open_days ?? []).length} | conf:${r.confidence}`,
  );
}

await client.end();

const header = `-- 030_winery_scrape.sql
-- Phase 2: website-scraped visit signals for the 39 featured wineries.
-- Generated by scripts/build-scrape-migration.mjs from scrape-results.json.
-- Signals are MERGED (union) with existing data; USP/language/religious signals excluded.

BEGIN;
`;
writeFileSync(new URL("../sql/030_winery_scrape.sql", import.meta.url), `${header}\n${lines.join("\n")}\nCOMMIT;\n`);

console.log(`Matched ${matched}/${results.length} wineries. Wrote sql/030_winery_scrape.sql`);
console.log("\n=== coverage ===");
console.log(summary.join("\n"));
