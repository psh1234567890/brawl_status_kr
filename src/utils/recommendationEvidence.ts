/** Two-sided 95% Wilson interval for the recorded win/non-win sample.
 * This assumes independent Bernoulli trials. It does not correct collection
 * bias or correlated participants and is not a prediction of the next match.
 * Formula: https://itl.nist.gov/div898/handbook/prc/section2/prc241.htm
 */
export function winRateInterval(wins: number, plays: number): [number, number] | null {
  if (!Number.isSafeInteger(plays) || !Number.isSafeInteger(wins) || plays <= 0 || wins < 0 || wins > plays) return null;
  const z = 1.959963984540054;
  const p = wins / plays;
  const z2 = z * z;
  const denominator = 1 + z2 / plays;
  const center = (p + z2 / (2 * plays)) / denominator;
  const margin = z * Math.sqrt(p * (1 - p) / plays + z2 / (4 * plays * plays)) / denominator;
  return [Math.max(0, center - margin) * 100, Math.min(1, center + margin) * 100];
}
