export function shuffle<T>(items: readonly T[], rng: () => number = Math.random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const value = rng();
    const target = Math.min(index, Math.max(0, Math.floor(value * (index + 1))));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}
