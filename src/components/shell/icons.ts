import { House, Users, Handshake, FolderKanban, ListChecks, Boxes, ShieldCheck, type LucideIcon } from "lucide-react";

// One icon per module group in the rail. Unknown groups fall back to a folder.
export const GROUP_ICON: Record<string, LucideIcon> = {
  Home: House, HR: Users, CRM: Handshake, Projects: FolderKanban, Work: ListChecks, Inventory: Boxes, Admin: ShieldCheck,
};
export const iconFor = (label: string): LucideIcon => GROUP_ICON[label] ?? FolderKanban;
