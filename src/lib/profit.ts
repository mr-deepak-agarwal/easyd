export type ProfitInput = {
  quoted: number | string; invoiced: number | string; collected: number | string;
  minutes: number | string; labour_cost: number | string; reimbursements: number | string;
  overhead_rate: number | string; planned_cost: number | string;
};

const n = (v: unknown) => Number(v) || 0;
const r2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

/**
 * Profit for one project.
 *   contribution = invoiced - labour - reimbursements
 *   profit       = contribution - overheads (hours logged x overhead rate)
 * margin is a percentage of invoiced; null when nothing has been invoiced yet.
 */
export function profitRow(r: ProfitInput) {
  const hours = n(r.minutes) / 60;
  const invoiced = n(r.invoiced), labour = n(r.labour_cost), reimb = n(r.reimbursements);
  const overhead = r2(hours * n(r.overhead_rate));
  const cost = r2(labour + reimb + overhead);
  const contribution = r2(invoiced - labour - reimb);
  const profit = r2(invoiced - cost);
  return {
    hours: r2(hours), quoted: n(r.quoted), invoiced, collected: n(r.collected), outstanding: r2(invoiced - n(r.collected)),
    toBill: n(r.quoted) > 0 ? r2(n(r.quoted) - invoiced) : null,
    labour, reimb, overhead, cost, contribution, profit,
    margin: invoiced > 0 ? r2((profit / invoiced) * 100) : null,
    plannedCost: n(r.planned_cost),
    loss: profit < 0,
  };
}

export function sumProfit(rows: ProfitInput[]) {
  const t = rows.map(profitRow).reduce((a, x) => ({
    quoted: a.quoted + x.quoted, invoiced: a.invoiced + x.invoiced, collected: a.collected + x.collected,
    labour: a.labour + x.labour, reimb: a.reimb + x.reimb, overhead: a.overhead + x.overhead, cost: a.cost + x.cost, profit: a.profit + x.profit,
  }), { quoted: 0, invoiced: 0, collected: 0, labour: 0, reimb: 0, overhead: 0, cost: 0, profit: 0 });
  return { ...t, margin: t.invoiced > 0 ? r2((t.profit / t.invoiced) * 100) : null };
}
