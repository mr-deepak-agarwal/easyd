import type { Role } from "./roles";

export type NavItem = { label: string; href: string; roles: readonly Role[] };
export type NavGroup = { label: string; items: NavItem[] };

const ALL: readonly Role[] = ["admin", "bd", "teamlead", "teamlead2", "employee"];
const MGMT: readonly Role[] = ["admin", "bd", "teamlead", "teamlead2"];
const ADMIN: readonly Role[] = ["admin"];

// Mirrors the role rules of the old sidebar.php, now in one typed place.
export const NAV: NavGroup[] = [
  { label: "Home", items: [{ label: "Dashboard", href: "/dashboard", roles: ALL }, { label: "Ask EasyD", href: "/ask", roles: ALL }] },
  {
    label: "HR",
    items: [
      { label: "Attendance", href: "/hr/attendance", roles: ALL },
      { label: "Leave", href: "/hr/leave", roles: ALL },
      { label: "Payroll", href: "/hr/payroll", roles: ALL },
      { label: "Bio-Data", href: "/hr/biodata", roles: ALL },
      { label: "Incentives", href: "/hr/incentives", roles: ALL },
      { label: "Appraisal", href: "/hr/appraisal", roles: ALL },
      { label: "Circulars", href: "/hr/circulars", roles: ALL },
      { label: "Suggestions", href: "/hr/suggestions", roles: ALL },
      { label: "Holidays", href: "/hr/holidays", roles: ALL },
      { label: "New Staff", href: "/hr/new-staff", roles: ADMIN },
    ],
  },
  {
    label: "CRM",
    items: [
      { label: "Clients", href: "/crm/clients", roles: MGMT },
      { label: "Follow-ups", href: "/crm/followups", roles: MGMT },
    ],
  },
  {
    label: "Projects",
    items: [
      { label: "Pending Projects", href: "/projects/pending", roles: MGMT },
      { label: "View Projects", href: "/projects", roles: ALL },
      { label: "Invoices", href: "/invoices", roles: ["admin", "bd", "teamlead2"] },
      { label: "Reimbursements", href: "/projects/reimbursements", roles: ALL },
      { label: "Reports", href: "/projects/reports", roles: MGMT },
      { label: "Risks", href: "/projects/risks", roles: MGMT },
      { label: "Profitability", href: "/projects/profitability", roles: ["admin", "teamlead2"] },
      { label: "Grades", href: "/projects/grades", roles: ["admin", "teamlead2"] },
      { label: "Overheads", href: "/projects/overheads", roles: ["admin", "teamlead2"] },
      { label: "Cost Analysis", href: "/projects/cost-analysis", roles: ["admin", "teamlead2"] },
    ],
  },
  {
    label: "Work",
    items: [
      { label: "Time Tracker", href: "/time-tracker", roles: ALL },
      { label: "Tasks", href: "/tasks", roles: ALL },
      { label: "Calendar", href: "/calendar", roles: ALL },
      { label: "Project Library", href: "/library", roles: ALL },
      { label: "Chat", href: "/chat", roles: ALL },
    ],
  },
  {
    label: "Inventory",
    items: [
      { label: "Stock Details", href: "/inventory/stock", roles: ["admin", "teamlead2"] },
      { label: "Items To Purchase", href: "/inventory/purchase", roles: ["admin", "teamlead2"] },
    ],
  },
  {
    label: "Admin",
    items: [{ label: "Employee Registration", href: "/admin/employees", roles: ADMIN }],
  },
];

export function navForRole(role: Role): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter(
    (g) => g.items.length > 0,
  );
}
