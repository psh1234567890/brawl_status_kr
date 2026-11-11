/** The existing legacy-v1 map recommendation formula, including both floors. */
export function legacyMetaScore(wins: number, plays: number, minimumPlays = 5) {
  const winRate = plays > 0 ? Math.floor((wins / plays) * 100) : 0;
  return { winRate, score: Math.floor((winRate * plays) / (plays + minimumPlays)) };
}
