export const ROLES = ["admin", "bd", "teamlead", "teamlead2", "employee"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  bd: "BD",
  teamlead: "Team Lead",
  teamlead2: "Team Lead II",
  employee: "User",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Roles that work with clients, leads and follow-ups. */
export const MGMT_ROLES: readonly Role[] = ["admin", "bd", "teamlead", "teamlead2"];
/** Roles that can approve or reject leads. */
export const LEAD_DECIDERS: readonly Role[] = ["admin", "bd"];
/** Roles that can edit costing, grades, overheads and inventory. */
export const COSTING_ROLES: readonly Role[] = ["admin", "teamlead2"];
/** Roles that can see invoices. */
export const INVOICE_VIEWERS: readonly Role[] = ["admin", "bd", "teamlead2"];
/** Roles that can create, edit, convert, confirm and delete invoices. */
export const INVOICE_EDITORS: readonly Role[] = ["admin", "teamlead2"];
/** Roles that can see everyone's time sheets. */
export const TIME_VIEWERS: readonly Role[] = ["admin", "teamlead", "teamlead2"];
