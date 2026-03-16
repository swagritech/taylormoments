const canonicalWineryIds: Record<string, string> = {
  "vasse-felix": "11111111-1111-1111-1111-111111111111",
  "cullen-wines": "22222222-2222-2222-2222-222222222222",
  "fraser-gallop": "33333333-3333-3333-3333-333333333333",
  woodlands: "44444444-4444-4444-4444-444444444444",
};

export function isLiveBookableSlug(slug: string) {
  return Boolean(canonicalWineryIds[slug]);
}

function hashToHex(seed: string) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;

  for (let i = 0; i < seed.length; i += 1) {
    const code = seed.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 16777619);
    h2 ^= h1 >>> 7;
    h2 = Math.imul(h2, 2246822519);
  }

  const hexA = (h1 >>> 0).toString(16).padStart(8, "0");
  const hexB = (h2 >>> 0).toString(16).padStart(8, "0");
  const hexC = ((h1 ^ h2) >>> 0).toString(16).padStart(8, "0");
  const hexD = ((h1 + h2) >>> 0).toString(16).padStart(8, "0");
  return `${hexA}${hexB}${hexC}${hexD}`.slice(0, 32);
}

export function slugToWineryUuid(slug: string) {
  const known = canonicalWineryIds[slug];
  if (known) {
    return known;
  }

  const hashHex = hashToHex(`tailormoments:${slug}`);
  return `${hashHex.slice(0, 8)}-${hashHex.slice(8, 12)}-${hashHex.slice(12, 16)}-${hashHex.slice(16, 20)}-${hashHex.slice(20, 32)}`;
}
