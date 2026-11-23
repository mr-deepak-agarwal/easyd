export type CostLineInput = { rate: number; employees: number; hoursPerEmployee: number; days: number };
export type CostLineResult = { hours: number; cost: number };
export type CostingResult = {
  lines: CostLineResult[];
  subtotal: number;
  overheadCost: number;
  base: number;
  total: number;
};

const money = (n: number) => Math.round(n * 100) / 100;

/**
 * Same arithmetic as the old Cost Analysis screen:
 *   line hours = hours per employee x employees x days;  line cost = grade rate x line hours
 *   base = sum of lines + overhead hours x overhead rate;  total = base x multiplying factor.
 */
export function computeCosting(lines: CostLineInput[], overheadHours: number, overheadRate: number, factor: number): CostingResult {
  const out = lines.map((l) => {
    const hours = l.employees * l.hoursPerEmployee * l.days;
    return { hours, cost: money(hours * l.rate) };
  });
  const subtotal = money(out.reduce((s, l) => s + l.cost, 0));
  const overheadCost = money(overheadHours * overheadRate);
  const base = money(subtotal + overheadCost);
  return { lines: out, subtotal, overheadCost, base, total: money(base * factor) };
}

export const FACTOR_PRESETS = [2, 2.5, 3] as const;
