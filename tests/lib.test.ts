import { describe, expect, it } from "vitest";
import { leaveDays } from "../src/lib/leave";
import { parseCsv } from "../src/lib/csv";
import { defaultEmpid, generatePassword } from "../src/lib/staff";
import { daysInMonth, formatDate } from "../src/lib/dates";

describe("leaveDays", () => {
  it("counts calendar days inclusive", () => {
    expect(leaveDays("2026-11-05", "2026-11-05", "CL Full Day")).toBe(1);
    expect(leaveDays("2026-11-05", "2026-11-09", "PL Full Day")).toBe(5);
    expect(leaveDays("2026-12-30", "2027-01-02", "CL Full Day")).toBe(4);
  });
  it("counts a single half day as 0.5", () => {
    expect(leaveDays("2026-11-05", "2026-11-05", "CL Half Day")).toBe(0.5);
  });
  it("rejects reversed or invalid dates", () => {
    expect(leaveDays("2026-11-09", "2026-11-05", "CL Full Day")).toBe(0);
    expect(leaveDays("nope", "2026-11-05", "CL Full Day")).toBe(0);
  });
});

describe("parseCsv", () => {
  it("parses a simple attendance sheet", () => {
    const rows = parseCsv("Name,1,2,3\nAsha Rao,P,P,A\nVikram,P,,P\n");
    expect(rows).toEqual([["Name", "1", "2", "3"], ["Asha Rao", "P", "P", "A"], ["Vikram", "P", "", "P"]]);
  });
  it("handles quotes, commas, CRLF, BOM and blank lines", () => {
    const rows = parseCsv('﻿Name,1\r\n"Rao, Asha",P\r\n\r\n"Say ""hi""",A\r\n');
    expect(rows).toEqual([["Name", "1"], ["Rao, Asha", "P"], ['Say "hi"', "A"]]);
  });
  it("handles a final row without a newline", () => {
    expect(parseCsv("a,b\nc,d")).toEqual([["a", "b"], ["c", "d"]]);
  });
});

describe("staff helpers", () => {
  it("derives the legacy username from the first name", () => {
    expect(defaultEmpid("Asha Rao")).toBe("asha@marcglocal.com");
    expect(defaultEmpid("  Dr. Vikram   Shah ")).toBe("vikram@marcglocal.com");
    expect(defaultEmpid("CA Neha Jain")).toBe("neha@marcglocal.com");
    expect(defaultEmpid("")).toBe("");
  });
  it("generates a 12-character password without look-alike characters", () => {
    const pw = generatePassword();
    expect(pw).toHaveLength(12);
    expect(pw).not.toMatch(/[0O1lI]/);
    expect(generatePassword()).not.toBe(pw);
  });
});

describe("dates", () => {
  it("formats dates like the old app", () => {
    expect(formatDate("2026-11-05")).toBe("05-Nov-2026");
    expect(formatDate(null)).toBe("-");
  });
  it("knows month lengths", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 11)).toBe(30);
  });
});

import { computeCosting } from "../src/lib/costing";
describe("computeCosting", () => {
  it("multiplies hours, rate, overheads and factor like the old screen", () => {
    // 2 people x 8 h x 5 days = 80 h at 500 = 40,000; 2 + 3 grade: 1 x 4 h x 10 d = 40 h at 1000 = 40,000
    const r = computeCosting(
      [{ rate: 500, employees: 2, hoursPerEmployee: 8, days: 5 }, { rate: 1000, employees: 1, hoursPerEmployee: 4, days: 10 }],
      10, 250, 2.5);
    expect(r.lines).toEqual([{ hours: 80, cost: 40000 }, { hours: 40, cost: 40000 }]);
    expect(r.subtotal).toBe(80000);
    expect(r.overheadCost).toBe(2500);
    expect(r.base).toBe(82500);
    expect(r.total).toBe(206250);
  });
  it("rounds to paise", () => {
    expect(computeCosting([{ rate: 33.333, employees: 1, hoursPerEmployee: 1, days: 1 }], 0, 0, 1).total).toBe(33.33);
  });
});

import { eventsByDay, monthGrid, parseMonth, shiftMonth } from "../src/lib/calendar";
describe("calendar helpers", () => {
  it("builds Monday-first weeks", () => {
    const rows = monthGrid(2026, 11); // 1 Nov 2026 is a Sunday
    expect(rows[0].indexOf("2026-11-01")).toBe(6);
    expect(rows.flat().filter(Boolean)).toHaveLength(30);
    expect(rows.every((r) => r.length === 7)).toBe(true);
  });
  it("moves between months across year ends", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });
  it("ignores a malformed month", () => {
    expect(parseMonth("2026-13", { year: 2026, month: 11 })).toEqual({ year: 2026, month: 11 });
    expect(parseMonth("2027-02", { year: 2026, month: 11 })).toEqual({ year: 2027, month: 2 });
  });
  it("clips a long leave to the month", () => {
    const m = eventsByDay(2026, 11, [{ kind: "leave", label: "A", from: "2026-10-30", to: "2026-11-02" }]);
    expect([...m.keys()]).toEqual(["2026-11-01", "2026-11-02"]);
  });
});

import { financialYear, invoicePrefix, computeInvoice, amountInWords, money } from "../src/lib/invoice";
describe("invoice rules", () => {
  it("financial year starts in April", () => {
    expect(financialYear("2026-04-01")).toBe("26-27");
    expect(financialYear("2027-03-31")).toBe("26-27");
    expect(financialYear("2026-11-20")).toBe("26-27");
    expect(financialYear("2026-03-31")).toBe("25-26");
  });
  it("uses the legacy number prefixes", () => {
    expect(invoicePrefix("Proforma", "MARC", null, "26-27")).toBe("P-MARC-26-27-");
    expect(invoicePrefix("Taxable", "AC", null, "26-27")).toBe("T-AC-26-27-");
    expect(invoicePrefix("Taxable", "KNPM", "Q", "26-27")).toBe("T-KPC-MH-26-27-Q-");
    expect(invoicePrefix("Proforma", "KNPI", "MISC", "26-27")).toBe("P-KPC-MP-26-27-MISC-");
    expect(invoicePrefix("Export", "KNP", null, "26-27")).toBe("E-KPC-26-27-");
  });
  const lines = [{ taxable_value: 10000 }, { taxable_value: "5000.50" }];
  it("splits GST into CGST+SGST inside the seller's state", () => {
    const t = computeInvoice({ type: "Taxable", entity: "MARC", lines, advance: 1000, ope: 500, deliveryStateCode: "30" });
    expect(t.taxable).toBe(14500.5);
    expect(t.mode).toBe("cgst_sgst");
    expect(t.cgst + t.sgst).toBe(t.gst);
    expect(t.gst).toBe(2610.09);
    expect(t.total).toBe(17110.59);
  });
  it("uses IGST outside the seller's state, and the entity's own state", () => {
    expect(computeInvoice({ type: "Taxable", entity: "MARC", lines, deliveryStateCode: "27" }).mode).toBe("igst");
    expect(computeInvoice({ type: "Taxable", entity: "KNPM", lines, deliveryStateCode: "27" }).mode).toBe("cgst_sgst");
    expect(computeInvoice({ type: "Proforma", entity: "KNPI", lines, deliveryStateCode: "23" }).mode).toBe("cgst_sgst");
    expect(computeInvoice({ type: "Taxable", entity: "MARC", lines, deliveryStateCode: "" }).mode).toBe("igst");
  });
  it("export invoices carry no GST or advance", () => {
    const t = computeInvoice({ type: "Export", entity: "MARC", lines, advance: 999, ope: 10 });
    expect(t.gst).toBe(0);
    expect(t.total).toBe(15010.5);
  });
  it("writes amounts in Indian words", () => {
    expect(amountInWords(0)).toBe("Rupees Zero Only");
    expect(amountInWords(17110)).toBe("Rupees Seventeen Thousand One Hundred and Ten Only");
    expect(amountInWords(123456)).toBe("Rupees One Lakh Twenty Three Thousand Four Hundred and Fifty Six Only");
    expect(amountInWords(12500000.5)).toBe("Rupees One Crore Twenty Five Lakh and Fifty Paise Only");
    expect(amountInWords(1000)).toBe("Rupees One Thousand Only");
  });
  it("formats money by currency", () => {
    expect(money(1234567.5)).toBe("₹12,34,567.50");
    expect(money(10, "USD")).toBe("$10.00");
  });
});

import { toMinutes, formatMinutes, NON_CHARGEABLE } from "../src/lib/time";
describe("time tracker helpers", () => {
  it("adds hours and minutes", () => {
    expect(toMinutes("2", "30")).toBe(150);
    expect(toMinutes("", "45")).toBe(45);
    expect(toMinutes(8, 0)).toBe(480);
  });
  it("rejects bad input", () => {
    expect(toMinutes("x", "0")).toBeNaN();
    expect(toMinutes("1", "75")).toBeNaN();
    expect(toMinutes("-1", "0")).toBeNaN();
  });
  it("formats minutes", () => {
    expect(formatMinutes(150)).toBe("2h 30m");
    expect(formatMinutes(5)).toBe("0h 05m");
    expect(NON_CHARGEABLE).toContain("Idle");
  });
});

import { efficiencyRow, sumEfficiency, monthRange, csvCell, csvRow } from "../src/lib/report";
describe("report helpers", () => {
  it("compares planned and actual hours and cost", () => {
    const r = efficiencyRow({ est_hours: 10, actual_minutes: 720, rate: 500 });
    expect(r.actualHours).toBe(12);
    expect(r.estCost).toBe(5000);
    expect(r.actualCost).toBe(6000);
    expect(r.saving).toBe(-1000);
    expect(r.over).toBe(true);
    expect(efficiencyRow({ est_hours: 10, actual_minutes: 300, rate: "500" }).over).toBe(false);
  });
  it("copes with empty values", () => {
    expect(efficiencyRow({ est_hours: "", actual_minutes: 0, rate: 0 }).estCost).toBe(0);
    const t = sumEfficiency([{ est_hours: 2, actual_minutes: 60, rate: 100 }, { est_hours: 3, actual_minutes: 120, rate: 200 }]);
    expect(t.estHours).toBe(5); expect(t.actualCost).toBe(500);
  });
  it("month range", () => {
    expect(monthRange("2026-02-10")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthRange("2026-11-20")).toEqual({ from: "2026-11-01", to: "2026-11-30" });
  });
  it("makes CSV cells safe", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("-12.5")).toBe("-12.5");
    expect(csvRow(["x", null, 3])).toBe("x,,3");
  });
});

import { computeScore, scoreParts, bandFor, defaultPeriod, type Raw } from "../src/lib/score";
const W = { ontime: 25, discipline: 20, match: 15, attendance: 10, reviews: 30 };
const base: Raw = { tasks_due: 10, tasks_on_time: 8, milestones_due: 0, milestones_on_time: 0, working_days: 20, attendance_rows: 20, present_days: 18, logged_days: 18,
  assigned_minutes: 900, unassigned_minutes: 100, nonchargeable_minutes: 60, idle_projects: 0, review_count: 2, review_avg: 4 };
describe("employee score", () => {
  it("scores each part", () => {
    const p = Object.fromEntries(scoreParts(base).map((x) => [x.key, x.score]));
    expect(p.ontime).toBe(80);
    expect(p.discipline).toBe(100);
    expect(p.match).toBe(90);
    expect(p.attendance).toBe(90);
    expect(p.reviews).toBe(75);
  });
  it("weights the parts", () => {
    const r = computeScore(base, W);
    expect(r.total).toBe(Math.round(((25 * 80 + 20 * 100 + 15 * 90 + 10 * 90 + 30 * 75) / 100) * 10) / 10);
    expect(r.total).toBe(85); expect(r.band).toBe("Excellent");
    expect(r.coverage).toBe(100);
  });
  it("shares the weight of parts with nothing to judge", () => {
    const r = computeScore({ ...base, tasks_due: 0, tasks_on_time: 0, review_count: 0, review_avg: null }, W);
    expect(r.parts.find((x) => x.key === "ontime")?.score).toBeNull();
    expect(r.parts.find((x) => x.key === "reviews")?.score).toBeNull();
    expect(r.total).toBe(Math.round(((20 * 100 + 15 * 90 + 10 * 90) / 45) * 10) / 10);
    expect(r.coverage).toBe(45);
  });
  it("counts milestones with tasks, and late items lower the score", () => {
    const r = scoreParts({ ...base, tasks_due: 4, tasks_on_time: 4, milestones_due: 4, milestones_on_time: 0 });
    expect(r[0].score).toBe(50);
  });
  it("does not judge attendance when none is recorded", () => {
    const r = scoreParts({ ...base, attendance_rows: 0, present_days: 0, logged_days: 0 });
    expect(r[1].score).toBeNull(); expect(r[3].score).toBeNull();
  });
  it("returns no total when nothing can be judged", () => {
    const r = computeScore({ ...base, tasks_due: 0, attendance_rows: 0, assigned_minutes: 0, unassigned_minutes: 0, review_count: 0, review_avg: null }, W);
    expect(r.total).toBeNull(); expect(r.band).toBeNull();
  });
  it("ignores parts weighted zero", () => {
    expect(computeScore(base, { ...W, reviews: 0, ontime: 0, discipline: 0, match: 0, attendance: 100 }).total).toBe(90);
  });
  it("has bands", () => {
    expect(bandFor(85)).toBe("Excellent"); expect(bandFor(84.9)).toBe("Good"); expect(bandFor(50)).toBe("Needs improvement"); expect(bandFor(49)).toBe("Poor");
  });
  it("default period is the last three months", () => {
    expect(defaultPeriod("2026-11-21")).toEqual({ from: "2026-09-01", to: "2026-11-21" });
    expect(defaultPeriod("2026-01-05")).toEqual({ from: "2025-11-01", to: "2026-01-05" });
  });
});

import { profitRow, sumProfit } from "../src/lib/profit";
describe("profit", () => {
  const base = { quoted: 100000, invoiced: 80000, collected: 50000, minutes: 600, labour_cost: 20000, reimbursements: 1000, overhead_rate: 100, planned_cost: 25000 };
  it("works out contribution, overheads, profit and margin", () => {
    const r = profitRow(base);
    expect(r.overhead).toBe(1000); // 10 hours x 100
    expect(r.contribution).toBe(59000);
    expect(r.cost).toBe(22000);
    expect(r.profit).toBe(58000);
    expect(r.margin).toBe(72.5);
    expect(r.outstanding).toBe(30000);
    expect(r.toBill).toBe(20000);
    expect(r.loss).toBe(false);
  });
  it("flags a loss and has no margin before anything is invoiced", () => {
    expect(profitRow({ ...base, invoiced: 10000, collected: 0 }).loss).toBe(true);
    const none = profitRow({ ...base, invoiced: 0, collected: 0 });
    expect(none.margin).toBeNull();
    expect(none.profit).toBe(-22000);
  });
  it("accepts strings from the database and totals rows", () => {
    const t = sumProfit([base, { ...base, invoiced: "20000", labour_cost: "5000", reimbursements: "0", minutes: "0" }]);
    expect(t.invoiced).toBe(100000);
    expect(t.profit).toBe(58000 + 15000);
    expect(t.margin).toBe(73);
  });
});
