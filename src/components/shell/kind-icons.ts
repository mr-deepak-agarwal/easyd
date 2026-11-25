import { AtSign, CalendarClock, ClipboardList, MessageSquare, UserCheck, type LucideIcon } from "lucide-react";

// Shared by the bell and the dashboard, so it is not a client module.
export const KIND_ICON: Record<string, LucideIcon> = {
  task_assigned: ClipboardList, task_comment: MessageSquare, mention: AtSign, task_due: CalendarClock,
  leave_request: UserCheck, leave_decision: UserCheck, time_edit_request: UserCheck, project_pending: ClipboardList, appraisal_published: UserCheck,
};
