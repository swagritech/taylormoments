// One-time AI enrichment: structure the 39 customer-selectable prospect wineries
// into the real WineStyle / WinerySignal taxonomy and emit a numbered SQL migration.
//
// Source of truth principle: the DB becomes authoritative. This script reads the
// legacy static prospect catalog, uses OpenAI (gpt-4o-mini) to STRUCTURE existing
// free text into enum values, and writes sql/026 to backfill the DB.
//
// Guardrail: the model is instructed to ONLY emit values supported by the source
// text and to NEVER fabricate language/dietary/cultural USP signals. Those are left
// empty for real data collection.
//
// Run:  TM_OPENAI_API_KEY=... node ./scripts/enrich-catalog-wineries.mjs
import { readFileSync, writeFileSync } from "node:fs";

const MODEL = process.env.TM_OPENAI_MODEL || "gpt-4o-mini";
const API_KEY = process.env.TM_OPENAI_API_KEY;
if (!API_KEY) {
  console.error("Missing TM_OPENAI_API_KEY");
  process.exit(1);
}

// Exact enum vocabularies (must match services/api/src/domain/models.ts)
const WINE_STYLES = [
  "Organic & Biodynamic", "Natural & Minimal Intervention", "Small batch & Boutique",
  "Family-owned Estate", "Estate-grown fruit only", "Well known Margaret River Name",
  "Lesser known (off the beaten track)", "Red Wine Specialist", "White Wine Specialist",
  "Sparkling & Method traditionnelle Specialist", "Fortified & Dessert Wines",
  "Internationally awarded", "Wines only available at cellar door",
];
const WINERY_SIGNALS = [
  "view_stunning","intimate_welcome","historic_estate","secluded","garden_picnic",
  "wheelchair_access","minibus_parking","dog_friendly","child_friendly","close_to_town",
  "cellar_door_tasting","guided_tasting","private_tasting_room","barrel_tasting","sunset_tasting",
  "winery_lunch","cheese_board","wine_chocolate","charcuterie_board","cooking_class",
  "picnic_on_estate","vineyard_walk","cellar_tour","blending_experience","harvest_experience",
  "accommodation","corporate_events","wedding_venue","seated_tasting","quiet_space",
  "halliday_5star","gold_medals","trophy_winner","press_featured","multi_generation",
  "female_winemaker","certified_organic","regenerative","small_production",
];
// Signals that must NEVER be inferred (no source data; real collection required)
// e.g. mandarin_staff, vietnamese_staff, asian_pairing, wechat_line, hosted_asian_groups,
// exported_asia, halal, kosher, vegan, etc. — deliberately excluded from the allowed list above.

const data = JSON.parse(readFileSync(new URL("../../../apps/web/src/lib/data/winery-prospects.json", import.meta.url), "utf8"));
const prospects = Array.isArray(data) ? data : Object.values(data)[0];

const SYSTEM = `You convert Margaret River winery marketing notes into STRUCTURED tags.
You are given a fixed vocabulary of wine styles and winery signals. You may ONLY return values from these exact lists.
Rules:
- Only include a tag if the source text clearly supports it. When in doubt, leave it out.
- NEVER infer language support, cultural, religious or dietary attributes (halal, kosher, vegan, mandarin, etc.) — there is no source data for these.
- "organic: Certified Organic" -> certified_organic + "Organic & Biodynamic". "organic: Sustainable/Biodynamic" -> regenerative only if stated.
- Established before ~1990 with a family/heritage story -> historic_estate and/or multi_generation only if supported.
- Return concise, customer-facing copy for description (1-2 sentences) and famous_for (short phrase) derived ONLY from the source.
Return STRICT JSON: {"wine_styles":[],"winery_signals":[],"description":"","famous_for":""}`;

const allowedStyles = new Set(WINE_STYLES);
const allowedSignals = new Set(WINERY_SIGNALS);

async function enrichOne(p) {
  const user = `Winery: ${p.name}
known_for: ${p.known_for || ""}
special_experiences: ${p.special_experiences || ""}
organic: ${p.organic || ""}
cellar_door: ${p.cellar_door || ""}
established: ${p.established || ""}
selling_point: ${p.selling_point || ""}

Allowed wine_styles: ${JSON.stringify(WINE_STYLES)}
Allowed winery_signals: ${JSON.stringify(WINERY_SIGNALS)}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const parsed = JSON.parse(json.choices[0].message.content);
  // Validate against the allowlists — drop anything off-vocabulary (belt and braces)
  const styles = (parsed.wine_styles || []).filter((s) => allowedStyles.has(s));
  const signals = (parsed.winery_signals || []).filter((s) => allowedSignals.has(s));
  return { slug: p.slug, name: p.name, styles, signals,
    description: String(parsed.description || "").slice(0, 600),
    famous_for: String(parsed.famous_for || "").slice(0, 200) };
}

// Reproduce the frontend slug->uuid hash so we target the exact DB rows
const canonical = {"vasse-felix":"11111111-1111-1111-1111-111111111111","cullen-wines":"22222222-2222-2222-2222-222222222222","fraser-gallop":"33333333-3333-3333-3333-333333333333","woodlands":"44444444-4444-4444-4444-444444444444"};
function hashToHex(s){let h1=0x811c9dc5,h2=0x01000193;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1^=c;h1=Math.imul(h1,16777619);h2^=h1>>>7;h2=Math.imul(h2,2246822519);}const a=(h1>>>0).toString(16).padStart(8,"0"),b=(h2>>>0).toString(16).padStart(8,"0"),c=((h1^h2)>>>0).toString(16).padStart(8,"0"),d=((h1+h2)>>>0).toString(16).padStart(8,"0");return `${a}${b}${c}${d}`.slice(0,32);}
function slugToUuid(slug){if(canonical[slug])return canonical[slug];const h=hashToHex(`tailormoments:${slug}`);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;}

const sqlEsc = (v) => v.replace(/'/g, "''");

const results = [];
for (let i = 0; i < prospects.length; i++) {
  const p = prospects[i];
  process.stderr.write(`[${i + 1}/${prospects.length}] ${p.name}\n`);
  try { results.push(await enrichOne(p)); }
  catch (e) { process.stderr.write(`  FAILED: ${e.message}\n`); }
}

// Emit migration 026
let sql = `-- 026: AI-enriched structured catalog for the 39 customer-selectable wineries.
-- Generated by scripts/enrich-catalog-wineries.mjs. Structures legacy prospect free text
-- into the WineStyle/WinerySignal taxonomy. USP signals (mandarin_staff, halal, etc.) are
-- intentionally NOT set here — no source data; require real collection.

alter table winery add column if not exists catalog_featured boolean not null default false;

`;
for (const r of results) {
  const id = slugToUuid(r.slug);
  sql += `update winery set
  wine_styles = '${sqlEsc(JSON.stringify(r.styles))}'::jsonb,
  winery_signals = '${sqlEsc(JSON.stringify(r.signals))}'::jsonb,
  catalog_featured = true${r.description ? `,\n  description = coalesce(nullif(description, ''), '${sqlEsc(r.description)}')` : ""}${r.famous_for ? `,\n  famous_for = coalesce(nullif(famous_for, ''), '${sqlEsc(r.famous_for)}')` : ""},
  updated_at = now()
where winery_id = '${id}'; -- ${sqlEsc(r.name)}\n\n`;
}

writeFileSync(new URL("../sql/026_enrich_catalog_wineries.sql", import.meta.url), sql);
process.stderr.write(`\nWrote sql/026_enrich_catalog_wineries.sql with ${results.length} wineries.\n`);
// Also dump a JSON summary for review
writeFileSync(new URL("../tmp_enrichment_summary.json", import.meta.url), JSON.stringify(results, null, 2));
