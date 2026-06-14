// Generates sql/026 from a hand-reviewed structured mapping of the 39 catalog wineries.
// Tags derived ONLY from supported prospect text (known_for, special_experiences, organic,
// established). USP signals (mandarin_staff, halal, wechat_line, etc.) are intentionally
// omitted — no source data; real collection required. Internal `selling_point` is ignored.
import { writeFileSync } from "node:fs";

const canonical = {"vasse-felix":"11111111-1111-1111-1111-111111111111","cullen-wines":"22222222-2222-2222-2222-222222222222","fraser-gallop":"33333333-3333-3333-3333-333333333333","woodlands":"44444444-4444-4444-4444-444444444444"};
function hashToHex(s){let h1=0x811c9dc5,h2=0x01000193;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1^=c;h1=Math.imul(h1,16777619);h2^=h1>>>7;h2=Math.imul(h2,2246822519);}const a=(h1>>>0).toString(16).padStart(8,"0"),b=(h2>>>0).toString(16).padStart(8,"0"),c=((h1^h2)>>>0).toString(16).padStart(8,"0"),d=((h1+h2)>>>0).toString(16).padStart(8,"0");return `${a}${b}${c}${d}`.slice(0,32);}
function slugToUuid(slug){if(canonical[slug])return canonical[slug];const h=hashToHex(`tailormoments:${slug}`);return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;}

// [slug, name, styles[], signals[], famousFor, description]
const M = [
["vasse-felix","Vasse Felix",["Well known Margaret River Name"],["cellar_door_tasting","winery_lunch","vineyard_walk","historic_estate"],"Cabernet & Chardonnay","Margaret River's founding winery (est. 1967), celebrated for its Art of Cabernet and Chardonnay, with a vine-to-table epicurean lunch tour."],
["cullen-wines","Cullen Wines",["Organic & Biodynamic","White Wine Specialist","Well known Margaret River Name"],["cellar_door_tasting","certified_organic","regenerative","vineyard_walk","historic_estate"],"Kevin John Chardonnay","Biodynamic pioneers (est. 1971) known for the iconic Kevin John Chardonnay and a biodynamic spiral garden tour."],
["fraser-gallop","Fraser Gallop",["Red Wine Specialist"],["cellar_door_tasting","barrel_tasting","cellar_tour","vineyard_walk"],"Bordeaux-style reds","Bordeaux-style elegance from the Parterre vineyard, with an electric-buggy vineyard and barrel tour."],
["woodlands","Woodlands",["Red Wine Specialist","Organic & Biodynamic","Estate-grown fruit only"],["cellar_door_tasting","certified_organic","seated_tasting","guided_tasting","historic_estate"],"Heritage Cabernet","Dry-grown vines and elegant heritage Cabernets (est. 1973), with seated vertical museum tastings."],
["stormflower","Stormflower",["Organic & Biodynamic","Natural & Minimal Intervention","Small batch & Boutique"],["cellar_door_tasting","certified_organic","intimate_welcome","garden_picnic","small_production"],"Low-intervention small batch","Compost-focused, low-intervention small-batch wines with intimate garden-side tastings."],
["windows-estate","Windows Estate",["Organic & Biodynamic","Small batch & Boutique"],["cellar_door_tasting","certified_organic","cellar_tour","guided_tasting"],"Artisan basket-press wines","Artisan basket-press methods with a soil focus, offering a behind-the-scenes Grape to Glass tour."],
["pierro","Pierro",["White Wine Specialist","Well known Margaret River Name","Organic & Biodynamic"],["cellar_door_tasting","vineyard_walk","intimate_welcome","historic_estate"],"Elite Chardonnay","Elite Burgundian-style Chardonnay (est. 1979), with personalised Friday vineyard tours."],
["ashbrook-estate","Ashbrook Estate",["Family-owned Estate"],["cellar_door_tasting","guided_tasting","multi_generation","historic_estate","intimate_welcome"],"Multi-generational family wines","Multi-generational family estate (est. 1975) with a mud-brick cellar door and traditional guided tastings."],
["hayshed-hill","Hayshed Hill",[],["cellar_door_tasting","winery_lunch","charcuterie_board","historic_estate"],"Rustico tapas pairing","Set around a historic hay shed (est. 1973), known for Rustico tapas and wine pairing lunches."],
["fermoy-estate","Fermoy Estate",["Red Wine Specialist"],["cellar_door_tasting","seated_tasting"],"World-class Cabernet","Wilyabrup 'sweet spot' estate making world-class Cabernet, with seated Reserve tastings."],
["gralyn-estate","Gralyn Estate",["Fortified & Dessert Wines","Well known Margaret River Name","Organic & Biodynamic"],["cellar_door_tasting","historic_estate","guided_tasting"],"Famous fortifieds","The region's first cellar door (est. 1975), famous for fortifieds and premium vertical museum flights."],
["menzies-vineyard","Menzies Vineyard",["Estate-grown fruit only","Small batch & Boutique","Organic & Biodynamic"],["cellar_door_tasting","barrel_tasting","cellar_tour"],"High-density terroir","High-density 1m x 1m plantings for pure terroir, with a behind-the-scenes barrel room tour."],
["voyager-estate","Voyager Estate",["Organic & Biodynamic","Well known Margaret River Name"],["cellar_door_tasting","certified_organic","winery_lunch","vineyard_walk","historic_estate"],"Manicured gardens & degustation","Cape Dutch-style estate famous for manicured gardens, offering a 7-course degustation and garden walk."],
["leeuwin-estate","Leeuwin Estate",["Well known Margaret River Name"],["cellar_door_tasting","press_featured","corporate_events","historic_estate"],"Art Series & concerts","World-famous Art Series labels and concerts (est. 1973), with wine and art gallery pairing flights."],
["cape-mentelle","Cape Mentelle",["Red Wine Specialist","Well known Margaret River Name"],["cellar_door_tasting","historic_estate","corporate_events"],"Iconic Cabernet","SBS pioneers with iconic Cabernet heritage (est. 1970) and seasonal Movies in the Vineyard."],
["stella-bella","Stella Bella",[],["cellar_door_tasting","guided_tasting"],"Suckfizzle","Southern cool-climate elegance, known for Suckfizzle and horizontal tasting sessions."],
["xanadu-wines","Xanadu Wines",["Internationally awarded"],["cellar_door_tasting","trophy_winner","guided_tasting","historic_estate"],"Consistent trophy winner","A consistent trophy winner with a modern rustic vibe and Cellar Collective museum sessions."],
["mr-barval","Mr. Barval",["Small batch & Boutique"],["cellar_door_tasting","charcuterie_board","guided_tasting"],"Italian-soul handcraft","Traditional hand-craft wines with an Italian soul, paired with curated tastings and local grazing boards."],
["yeah-wine","Yeah Wine",["Natural & Minimal Intervention","Small batch & Boutique","Lesser known (off the beaten track)"],["cellar_door_tasting","cellar_tour","intimate_welcome"],"Authentic rustic wines","Unpretentious, authentic rustic wines with winemaker-led private tours."],
["mchenry-hohnen","McHenry Hohnen",["Organic & Biodynamic","Natural & Minimal Intervention","Estate-grown fruit only"],["cellar_door_tasting","certified_organic","regenerative","winery_lunch","vineyard_walk"],"Single-vineyard mastery","Single-vineyard, low-intervention wines with a vintner's lunch and biodiversity walks."],
["deep-woods","Deep Woods",["White Wine Specialist"],["cellar_door_tasting","view_stunning","seated_tasting","guided_tasting"],"Elite Chardonnay","Ridge-top views and elite Chardonnay, with Reserve horizontal deck tastings."],
["aravina-estate","Aravina Estate",[],["cellar_door_tasting","winery_lunch","corporate_events"],"Luxury estate & car museum","A luxury estate with a Sports Car Museum, offering a car museum and wine high tea."],
["wills-domain","Wills Domain",["Red Wine Specialist"],["cellar_door_tasting","winery_lunch"],"Paladin Shiraz & fine dining","Fine-dining focus and the flagship Paladin Shiraz, with a 4-course chef's selection lunch."],
["blind-corner","Blind Corner",["Natural & Minimal Intervention","Organic & Biodynamic"],["cellar_door_tasting","certified_organic","regenerative","vineyard_walk"],"Radical natural wines","Radical natural winemaking from eco-pioneers, with a wild wine and bee-keeping farm tour."],
["marri-wood-park","Marri Wood Park",["Organic & Biodynamic","Natural & Minimal Intervention"],["cellar_door_tasting","certified_organic","regenerative","secluded","intimate_welcome","vineyard_walk"],"Biodynamic forest vineyard","A biodynamic forest vineyard with beach vibes and forest-side personalised tastings."],
["skigh-wine","Skigh Wine",["Natural & Minimal Intervention","Small batch & Boutique","Organic & Biodynamic"],["cellar_door_tasting","cheese_board"],"Lo-Fi young wines","Funky 'Lo-Fi' young wines, with Green Room cheese and wine sessions."],
["howard-park","Howard Park",["White Wine Specialist","Sparkling & Method traditionnelle Specialist"],["cellar_door_tasting","guided_tasting"],"Riesling & sparkling","Modern architecture and a focus on Riesling and bubbles, with Methode Traditionnelle masterclasses."],
["passel-estate","Passel Estate",["Small batch & Boutique"],["cellar_door_tasting","intimate_welcome","vineyard_walk","secluded"],"Wildlife sanctuary wines","A highly personal estate with a wildlife sanctuary focus and a Nature & Wine wildlife walk."],
["house-of-cards","House of Cards",["Organic & Biodynamic"],["cellar_door_tasting","certified_organic","wine_chocolate"],"Organic award-winning labels","Organic methods and award-winning labels, with The Full Hand chocolate and wine flight."],
["bettenay-s","Bettenay's",[],["cellar_door_tasting","view_stunning","wine_chocolate"],"Wine & nougat pairing","Known for wine and world-class nougat pairing in a lakeside setting."],
["ls-merchants","LS Merchants",["Natural & Minimal Intervention","Small batch & Boutique"],["cellar_door_tasting","blending_experience"],"Experimental funky wines","Experimental, high-energy wines with a hands-on School of Winemaking."],
["edwards-wines","Edwards Wines",[],["cellar_door_tasting","seated_tasting"],"Aviation-themed cellar door","Aviation-themed estate with a Tiger Moth plane on site and a seated 'Wings' room flight."],
["churchview","Churchview",["Organic & Biodynamic"],["cellar_door_tasting","certified_organic","picnic_on_estate","vineyard_walk"],"16 organic varietals","Organically operated across 16 varietals, with self-guided organic vineyard picnics."],
["3-oceans","3 Oceans",[],["cellar_door_tasting","wheelchair_access","charcuterie_board","corporate_events"],"Accessible large-format venue","A highly accessible, large-format venue offering regional produce platter experiences."],
["brown-hill","Brown Hill",["Red Wine Specialist"],["cellar_door_tasting","barrel_tasting","private_tasting_room"],"Bold reds","Bold reds and barrel-hall experiences, with private Barrel Room tastings."],
["si-vintners","Si Vintners",["Natural & Minimal Intervention","Organic & Biodynamic"],["cellar_door_tasting","certified_organic","regenerative","intimate_welcome"],"Zero-intervention natural wines","Natural-farming, zero-intervention wines via by-appointment winemaker sessions."],
["glenarty-road","Glenarty Road",["Organic & Biodynamic"],["cellar_door_tasting","certified_organic","regenerative","winery_lunch","vineyard_walk"],"Farm-to-table","Farm-to-table with sheep and vines, offering a Ground to Glass foragers tour."],
["hamelin-bay","Hamelin Bay",[],["cellar_door_tasting","view_stunning","seated_tasting","winery_lunch","charcuterie_board"],"Valley & lake views","Coastal-influenced wines with valley and lake views, and a seated deck platter and wine lunch."],
["evoi-wines","Evoi Wines",["Small batch & Boutique"],["cellar_door_tasting","halliday_5star","barrel_tasting","intimate_welcome","small_production"],"Boutique 5-star","Boutique 5-star, small-batch focus with barrel tasting alongside the owner."],
];

const esc = (v) => String(v).replace(/'/g, "''");
let sql = `-- 026: Structured catalog for the 39 customer-selectable wineries (single source of truth).
-- Hand-reviewed mapping of legacy prospect free text into the WineStyle/WinerySignal taxonomy.
-- Generated by scripts/generate-catalog-migration.mjs.
-- USP signals (mandarin_staff, vietnamese_staff, asian_pairing, wechat_line, hosted_asian_groups,
-- exported_asia, halal, kosher, dietary) are intentionally NOT set: no source data, real collection required.

alter table winery add column if not exists catalog_featured boolean not null default false;

`;
for (const [slug, name, styles, signals, famousFor, description] of M) {
  const id = slugToUuid(slug);
  sql += `update winery set
  wine_styles = '${esc(JSON.stringify(styles))}'::jsonb,
  winery_signals = '${esc(JSON.stringify(signals))}'::jsonb,
  catalog_featured = true,
  famous_for = coalesce(nullif(famous_for, ''), '${esc(famousFor)}'),
  description = coalesce(nullif(description, ''), '${esc(description)}'),
  updated_at = now()
where winery_id = '${id}'; -- ${esc(name)}\n\n`;
}
writeFileSync(new URL("../sql/026_enrich_catalog_wineries.sql", import.meta.url), sql);
console.log(`Wrote sql/026 for ${M.length} wineries.`);
