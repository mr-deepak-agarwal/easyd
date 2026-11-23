import {
  Boxes, Building2, Calculator, CalendarCheck, CalendarDays, CheckSquare, Circle, Clock, FolderKanban,
  Gift, Hourglass, Layers, LayoutDashboard, Library, Megaphone, MessageSquare, Palmtree, PhoneCall,
  PiggyBank, Receipt, ShieldAlert, ShoppingCart, Sparkles, TrendingUp, UserCog, UserPlus, UserSquare,
  Users, Wallet, BarChart3, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/ask": Sparkles,
  "/hr/attendance": CalendarCheck,
  "/hr/leave": Palmtree,
  "/hr/payroll": Wallet,
  "/hr/biodata": UserSquare,
  "/hr/incentives": Gift,
  "/hr/appraisal": TrendingUp,
  "/hr/circulars": Megaphone,
  "/hr/suggestions": MessageSquare,
  "/hr/holidays": CalendarDays,
  "/hr/new-staff": UserPlus,
  "/crm/clients": Users,
  "/crm/followups": PhoneCall,
  "/projects/pending": Hourglass,
  "/projects": FolderKanban,
  "/invoices": Receipt,
  "/projects/reimbursements": Receipt,
  "/projects/reports": BarChart3,
  "/projects/risks": ShieldAlert,
  "/projects/profitability": PiggyBank,
  "/projects/grades": Layers,
  "/projects/overheads": Building2,
  "/projects/cost-analysis": Calculator,
  "/time-tracker": Clock,
  "/tasks": CheckSquare,
  "/calendar": CalendarDays,
  "/library": Library,
  "/chat": MessageSquare,
  "/inventory/stock": Boxes,
  "/inventory/purchase": ShoppingCart,
  "/admin/employees": UserCog,
};

export function NavIcon({ href, className }: { href: string; className?: string }) {
  const Icon = ICONS[href] ?? Circle;
  return <Icon className={className} aria-hidden strokeWidth={1.75} />;
}

/** Tint used for the icon chip of each nav group on the dashboard. */
export const GROUP_TINT: Record<string, string> = {
  Home: "bg-emerald-50 text-emerald-700",
  HR: "bg-violet-50 text-violet-700",
  CRM: "bg-sky-50 text-sky-700",
  Projects: "bg-amber-50 text-amber-700",
  Work: "bg-indigo-50 text-indigo-700",
  Inventory: "bg-rose-50 text-rose-700",
  Admin: "bg-slate-100 text-slate-700",
};
