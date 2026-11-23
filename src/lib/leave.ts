export const LEAVE_TYPES = [
  "CL Half Day",
  "CL Full Day",
  "PL Half Day",
  "PL Full Day",
  "OD Half Day",
  "OD Full Day",
  "Work From Home",
  "Compensatory Off",
  "Optional Holiday",
] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

const MS_PER_DAY = 86_400_000;

/**
 * Number of leave days. Calendar days from..to inclusive, as in the old app,
 * except that a half-day type counts as 0.5 on a single day.
 */
export function leaveDays(from: string, to: string, type: string): number {
  const a = Date.parse(from + "T00:00:00Z");
  const b = Date.parse(to + "T00:00:00Z");
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  const days = Math.round((b - a) / MS_PER_DAY) + 1;
  return type.includes("Half Day") && days === 1 ? 0.5 : days;
}

export const LEAVE_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};
