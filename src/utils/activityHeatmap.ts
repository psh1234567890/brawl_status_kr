import type { PlayerHistoryDay } from "../types/brawl";

const DAY_MS = 24 * 60 * 60 * 1000;
const KST = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
});

export function buildActivityHeatmap(daily: PlayerHistoryDay[], now: Date = new Date()) {
  // A calendar day in KST is represented as a UTC date for timezone-independent arithmetic.
  const todayKey = KST.format(now);
  const endMs = Date.parse(todayKey + "T00:00:00Z");
  const startMs = endMs - 89 * DAY_MS;
  const startDate = new Date(startMs);
  const leadingBlanks = (startDate.getUTCDay() + 6) % 7;
  const recorded = new Map(daily
    .filter((row) => Number.isFinite(row.plays) && row.plays > 0)
    .map((row) => [row.day, row.plays]));
  const days = Array.from({ length: 90 }, (_, index) => {
    const day = new Date(startMs + index * DAY_MS).toISOString().slice(0, 10);
    return { day, plays: recorded.get(day) ?? null };
  });
  const maxPlays = Math.max(1, ...days.map((x) => x.plays ?? 0));
  return {
    leadingBlanks, days, maxPlays,
    recordedDays: days.filter((x) => x.plays !== null).length,
    // An absent row is 'not recorded', never proof of zero actual matches.
  };
}

export function heatmapIntensity(plays: number | null, maxPlays: number) {
  if (plays === null) return 0;
  if (plays <= 0) return 1;
  return Math.min(4, Math.max(1, Math.ceil(plays / Math.max(maxPlays, 1) * 4)));
}
