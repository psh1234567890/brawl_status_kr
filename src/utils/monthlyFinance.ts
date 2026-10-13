export const financeFields = ["advertising", "sponsorship", "donations", "hosting", "database", "domain", "other"] as const;
export type FinanceField = (typeof financeFields)[number];
export type MonthlyFinance = { month: string } & Record<FinanceField, string>;
export const emptyFinance: MonthlyFinance = { month: "", advertising: "", sponsorship: "", donations: "", hosting: "", database: "", domain: "", other: "" };
export function financeSummary(values: MonthlyFinance) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(values.month)) return null;
  const numbers = financeFields.map(key => {
    const value = values[key].trim();
    return /^\d+(?:\.\d{1,2})?$/.test(value) && Number(value) <= 1_000_000_000 ? Number(value) : NaN;
  });
  if (numbers.some(value => !Number.isFinite(value))) return null;
  const revenue = numbers.slice(0, 3).reduce((total, value) => total + Math.round(value * 100), 0) / 100;
  const costs = numbers.slice(3).reduce((total, value) => total + Math.round(value * 100), 0) / 100;
  return { revenue, costs, profit: Math.round((revenue - costs) * 100) / 100 };
}
