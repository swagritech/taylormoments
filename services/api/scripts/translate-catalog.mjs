// Translates the featured wineries' static content (description, famous_for) into
// Simplified Chinese (zh-Hans) and Vietnamese (vi), writing to winery_translation.
// English stays canonical in winery.*; this fills the per-locale translations.
// Machine-translated (machine_translated=true, reviewed=false) — native review recommended.
//
// Run: TM_PG=... TM_OPENAI_API_KEY=... node ./scripts/translate-catalog.mjs
import pg from "pg";
const { Client } = pg;

const API_KEY = process.env.TM_OPENAI_API_KEY;
const MODEL = process.env.TM_OPENAI_MODEL || "gpt-4o-mini";
if (!API_KEY) { console.error("Missing TM_OPENAI_API_KEY"); process.exit(1); }

const SYSTEM = `You are a native Mandarin AND native Vietnamese copywriter for a premium Margaret River winery-tour brand serving affluent mainland-Chinese and Vietnamese travellers.
TRANSCREATE (do not translate) the English winery "description" and "famous_for" into natural, elegant Simplified Chinese (zh-Hans) and Vietnamese (vi).
- Rewrite freely so each reads as if ORIGINALLY WRITTEN by a native copywriter — natural rhythm and idiom, warm and premium in tone. NO stiff calques, NO word-for-word phrasing, NO translated-sounding constructions (e.g. avoid literal renderings like "目的地餐厅").
- Keep the same factual meaning; never invent facts.
- Keep winery names, "Margaret River", and grape varieties (Cabernet Sauvignon, Chardonnay, Sémillon, etc.) in their original English.
- "famous_for" should be a short, punchy phrase a native would actually say, not a literal gloss.
Return STRICT JSON: {"description_zh":"...","description_vi":"...","famous_for_zh":"...","famous_for_vi":"..."}`;

async function translate(description, famousFor) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `description: ${description}\nfamous_for: ${famousFor || ""}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  return JSON.parse((await res.json()).choices[0].message.content);
}

const c = new Client({ connectionString: process.env.TM_PG, ssl: { rejectUnauthorized: false } });
await c.connect();
const { rows } = await c.query(
  `select winery_id, name, description, famous_for from winery
   where catalog_featured and description is not null and description <> '' order by name`,
);

const upsert = async (wineryId, locale, field, value) => {
  if (!value || !value.trim()) return;
  await c.query(
    `insert into winery_translation (winery_id, locale, field, value, machine_translated, reviewed, updated_at)
     values ($1,$2,$3,$4,true,false,now())
     on conflict (winery_id, locale, field) do update set value=excluded.value, machine_translated=true, updated_at=now()`,
    [wineryId, locale, field, value.trim()],
  );
};

let done = 0;
for (const w of rows) {
  try {
    const t = await translate(w.description, w.famous_for);
    await upsert(w.winery_id, "zh-Hans", "description", t.description_zh);
    await upsert(w.winery_id, "vi", "description", t.description_vi);
    await upsert(w.winery_id, "zh-Hans", "famous_for", t.famous_for_zh);
    await upsert(w.winery_id, "vi", "famous_for", t.famous_for_vi);
    done += 1;
    process.stderr.write(`[${done}/${rows.length}] ${w.name}\n`);
  } catch (e) {
    process.stderr.write(`FAILED ${w.name}: ${e.message}\n`);
  }
}
console.log(`Translated ${done}/${rows.length} wineries into zh-Hans + vi.`);
await c.end();
