// Format a Date as a local YYYY-MM-DD string.
//
// IMPORTANT: `date.toISOString().slice(0, 10)` formats in UTC, which shifts the
// date back a day for UTC+8 users (Western Australia) — local midnight 30 Jun
// becomes 29 Jun in UTC. For service/booking dates that makes "today" submit as
// yesterday, and the API rejects it with "Those dates have passed." Always
// format service dates from the local calendar parts instead.
export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
