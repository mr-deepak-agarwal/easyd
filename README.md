# Easy D (rebuild)

Next.js (App Router) + TypeScript + Supabase. Replaces the old PHP/MySQL application.

## Status: Phases 1 (foundation), 2 (HR), 3 (CRM, costing, inventory), 4 (project lifecycle) and 5 (tasks, calendar) complete
- App shell in the MARC green theme, role-based menu (admin, bd, teamlead, teamlead2, employee)
- Login with Supabase Auth, session refresh and route protection in `src/proxy.ts`
- Server-side role checks (`src/lib/session.ts`): `requireUser()`, `requireRole([...])`
- Postgres schema for every table of the production database, with foreign keys: `supabase/migrations/`
- Row Level Security on all tables (roles enforced by the database, not just the menu)
- Next phases (HR, CRM, projects, invoicing, ...) plug into the `[...slug]` placeholder routes

## Phase 2 - what is in it
| Route | Who | What |
|---|---|---|
| `/hr/holidays` | all view, admin edits | Holiday calendar by year |
| `/hr/circulars` | all view, admin uploads (max 4 MB) | Circulars with signed-URL download |
| `/hr/new-staff` | admin | Creates login + profile + bio-data, uploads CV/qualification (max 2 MB each), shows the generated password once |
| `/admin/employees` | admin | Activate/deactivate (bans login), change role, reset password |
| `/profile` | everyone | Change own password |
| `/hr/biodata` | admin all, others own | Bio-data view/edit, document downloads |
| `/hr/leave` | everyone | Apply, balances, overlap check; `/approvals` for admin/teamlead/teamlead2 (bulk approve/reject, never own leave); `/quota` admin |
| `/hr/attendance` | admin, bd, teamlead, teamlead2 (employees see own) | Month register; admin uploads the legacy CSV (existing days are skipped, unknown names reported) |

Also run migration `20261115000005_storage_and_leave_rules.sql` (private buckets `staff`, `circulars`, `documents`, leave/attendance visibility). Upload caps respect Vercel's 4.5 MB request limit.

Checks: `npm run typecheck`, `npm test`, `npm run build`.

## Phase 3 - what is in it
| Route | Who | What |
|---|---|---|
| `/crm/clients` | admin, bd, teamlead, teamlead2 | Client list (Active / Priority / Inactive, search) and the "New enquiry" form: finds the client by firm name (any case) or creates it, then adds the lead and contact |
| `/crm/clients/[id]` | same | Edit client, mark inactive, contacts, leads, follow-ups |
| `/crm/leads/[id]` | same view; **admin and bd approve/reject** | Edit a pending lead, see its costing and follow-ups. Approving creates the project and moves the lead's costing, follow-ups and documents onto it in one transaction (`approve_lead`) |
| `/crm/followups` | same | Due/overdue and most recent follow-ups; optional document (max 4 MB) |
| `/projects/grades`, `/projects/overheads` | **admin, teamlead2** | Hourly grade costs; overhead per hour (history kept) |
| `/projects/cost-analysis` | **admin, teamlead2** | Calculator: lines (grade x people x hours x days) + overhead hours, times a factor (x2, x2.5, x3 or custom). Totals are recomputed on the server; saving replaces the previous estimate |
| `/inventory/stock`, `/inventory/purchase` | **admin, teamlead2** edit; management can read | Add/top up stock, use stock (cannot go below zero), consumption history, auto "to purchase" list when stock reaches its buffer |

Run migration `20261115000006_crm_costing_inventory_rules.sql`. It also tightens costing writes to admin and teamlead2 only (bd could write before).
Money rule: costing rows store the grade rate in `grade` (as the old system did) so the data migration can copy them across unchanged.

## Phase 4 - what is in it
| Route | Who | What |
|---|---|---|
| `/projects` | everyone (employees only see projects they are on) | Open / Closed lists with search and progress bars |
| `/projects/new` | admin, bd, teamlead, teamlead2 | Opens a **pending** project (optional proposal file, max 4 MB) |
| `/projects/pending` | management view; **admin and teamlead2 approve/reject** | Approval queue |
| `/projects/[id]` | project people | Tabs: Overview (details, final report/payment, close), Team, Milestones, Documents + Proposals, Meetings, Forum, Costing (management only) |

Who can run a project (`can_manage_project`): admin, teamlead, teamlead2, the project leader, or a team member added as "Lead". They edit details, manage the team and milestones, upload proposals and close. Any team member can read, post in the forum, upload documents and record meetings. bd can open projects and view them but not run them.

Rules enforced in the database (migration `20261115000007_project_lifecycle_rules.sql`):
- A project always starts pending; status, approval, closure and progress change only through `decide_project`, `complete_milestone`, `close_project` (a trigger blocks direct edits).
- Progress = total weight of finished milestones (max 100). Milestone weights cannot add up to more than 100.
- Closing needs "Final report submitted" ticked and a closing note; closed projects are read-only.
- One row per person per project.

Not in this phase (by design): the project Tasks and Invoices tabs arrive with the Workspace (Phase 5) and Invoicing (Phase 6). The old system emailed people when they were added to a project; that needs the email provider and comes with notifications.

## Phase 5 - what is in it
| Route | Who | What |
|---|---|---|
| `/tasks`, `/tasks/[id]` | everyone | Open / Completed lists (overdue flagged), create, edit, complete and reopen, comments |
| `/projects/[id]?tab=tasks` | project people | Tasks on a project; the creator, the project's managers and responsible people can edit |
| `/calendar` | everyone | Month view: holidays, who is on approved leave (no reasons), birthdays (no dates of birth), project meetings, project start and deadline dates, task due dates. Project items show only for people who can see the project |

Task rules (migration `20261115000008_workspace_rules.sql`):
- A general task is visible to its creator, the people on it and admin only. Management no longer sees other people's private tasks (same as the old system).
- A project task is visible to everyone who can see the project.
- Edit/complete/reopen: the creator, a responsible person, admin, or whoever runs the project. Other participants can read and comment.
- Fixes an earlier gap where an employee's own "create task" would have been refused.

Calendar leave and birthday data comes through two small database functions that return only names and days.

**Forms:** `ActionForm` now keeps what the person typed when a form is rejected (React clears forms after every submit).

Not built (and why): **Project Library** needs invoices and reports, so it comes with Phase 6/7. **Chat** in the old code is a client-only template with no server and no data, so there is nothing to migrate; real team chat would be a new feature (Supabase Realtime).

## Phase 6 - what is in it
| Route | Who | What |
|---|---|---|
| `/invoices` | admin, bd, teamlead2 | All invoices with search, type / entity / payment filters; create form for an open project |
| `/invoices/new?project=ID`, `/invoices/[id]/edit` | admin, teamlead2 | Multi-line invoice form, prefilled from the client. Edit keeps the number; confirmed invoices are locked |
| `/invoices/[id]` | admin, bd, teamlead2 | Printable invoice (letterhead, GSTIN, bank details per billing entity), convert proforma to tax invoice, confirm payment, delete |
| `/invoices/sac` | admin | SAC code list used in the invoice form |
| `/projects/[id]?tab=invoices` | admin, bd, teamlead2 | The project's invoices |

Rules kept exactly as in the old app:
- Numbers: `P-` Proforma, `T-` Tax, `E-` Export, then `MARC-26-27-n`, `AC-26-27-n`, `KPC-26-27-n`, `KPC-MH-26-27-<series>-n`, `KPC-MP-26-27-<series>-n` (series M, Q, Y, MISC for Mumbai and Indore). The financial year starts in April. The next number is the highest existing one for that prefix plus 1 (deleted invoices do not count, as before).
- GST 18% on (lines - advance + out-of-pocket expenses): CGST 9% + SGST 9% when the delivery state code equals the billing entity's own state (MARC/AC/Goa 30, Mumbai 27, Indore 23), otherwise IGST 18%. Export invoices are against LUT: no GST, no advance, in the chosen currency with a rupee value per line.
- Only admin and teamlead2 can write; bd can read (migration `20261115000009_invoicing_rules.sql`). All changes go through database functions, so numbering is atomic (8 parallel creations tested) and every action is written to the audit log.

**Data note (important for the import):** the old table stored one row per invoice *line*, repeating the header. The "46 duplicate numbers" are multi-line invoices, not clashes (0 real clashes). The new schema has an `invoices` header and `invoice_lines`, so the import must group old rows by (billing entity, invoice number, project, date, recipient, type). Uniqueness of numbers is **not enforced yet**, as agreed; once the data is checked after launch add: `create unique index on public.invoices (invoice_by, invoice_no) where deleted_at is null;`

Not in this phase: reimbursements (still a placeholder), bulk print, invoice reports (Phase 7).

## Phase 7 - what is in it
| Route | Who | What |
|---|---|---|
| `/time-tracker` | everyone | Log chargeable (project) or non-chargeable time, browse by month, delete own entries. admin, teamlead and teamlead2 can also view everyone's time |
| `/time-tracker/[id]/edit`, `/time-tracker/approvals` | owner / admin | An edit is not applied directly: it is sent for admin approval (approve, approve all). The owner can withdraw it; admin can reject |
| `/hr/payroll` | admin writes, staff read own | Salary register, a suggested monthly pay, one salary per person per month |
| `/hr/incentives` | admin writes, staff read own | Incentives with totals |
| `/projects/reports` | admin, bd, teamlead, teamlead2 | Project efficiency (planned vs actual hours and cost by grade), employee efficiency (admin, teamlead, teamlead2), revenue and invoice reports (admin, bd, teamlead2) with CSV download |
| `/library` | everyone, limited to projects they can see | Project documents, proposals and (for invoice viewers) invoices, with search and filters |

Rules and decisions:
- Time entries are private: you see your own; admin, teamlead and teamlead2 see everyone's; bd sees only their own. Direct edits are limited to admin; everyone else uses the approval flow (migration `20261115000010_time_payroll_rules.sql`). Efficiency reports run through database functions, so no manager gets raw access to other people's hours (migration `20261115000011_report_rules.sql`).
- Suggested salary uses a day rate (decided with the client): salary / 26 per absent working day. Absent days are Mon to Sat, minus holidays and approved full-day CL/PL/Comp Off/Optional Holiday, minus days present (OD and WFH count as present). Migration `20261115000014_salary_day_rate.sql` replaces the legacy salary/208 formula.
- The old app allowed two salaries for one person on different days of the same month. The new one refuses a second "Salary" in a month (other pay types such as Advance or Bonus are fine).
- The old "employee efficiency" report picked an arbitrary time row for actual hours; the new one sums the real entries.
- Production has no salary, incentive, appraisal or library-report rows, so there is nothing to import for those.

Not in this phase: appraisal and suggestion box (HR menu placeholders), reimbursements, bulk invoice print.

## Phase 9: Project profitability (Stage 2)

`/projects/profitability` (admin and teamlead2 only) shows, for every approved or closed project, optionally within a date range:

- **Invoiced**: Taxable and Export invoices, before GST: lines (rupee value) less advance already billed, plus out-of-pocket expenses. Proforma and deleted invoices are not counted. **Collected** is the confirmed part. **Quoted** is the approved costing (renegotiated figure if there is one).
- **Time cost**: hours logged on the project x each person's grade rate. **Expenses**: approved reimbursements. **Overheads**: hours logged x the current overhead rate.
- **Profit** = invoiced - time cost - expenses - overheads; **margin** = profit / invoiced. Loss-making projects are flagged and listed first.

Things to know:
- Grade rates are today's rates; the system keeps no record of which rate applied when the work was done.
- Hours by people with no grade rate cost nothing in the report; the page warns when that happens.
- The overhead treatment (hours x overhead rate) is an assumption, shown on its own column so it can be ignored or changed.

Apply `supabase/migrations/20261115000015_profitability.sql`.

## Run it
1. Create a Supabase project (region: Mumbai).
2. Apply the migrations in order (Supabase CLI: `supabase db push`, or paste each file into the SQL editor), then `supabase/seed.sql`.
3. Copy `.env.example` to `.env.local` and fill in the project URL and keys.
4. Create the first admin: Authentication > Users > Add user (email = login username), then run:
   ```sql
   insert into public.profiles (id, empid, name, role)
   values ('<auth user id>', '<same email>', 'Your Name', 'admin');
   ```
5. `npm install && npm run dev`, then open http://localhost:3000.

## Notes
- Legacy integer ids are preserved (identity "by default"); the data migration resets each sequence.
- Login username = the legacy `empid` (an email address), used as the Supabase Auth email.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser; it is used only in `src/lib/supabase/admin.ts`.
- Invoice numbers must be allocated with `public.next_invoice_number()` so two users never get the same number.
- RLS defaults mirror the old menu rules and must be confirmed with the client during UAT.

## Phase 8: HR and appraisal (Stage 1)

Appraisal is a score worked out from what each person actually does in the ERP, plus reviews by the team lead.

**Score (0 to 100), over a period (default: last 3 months)**

| Part | Default weight | What it measures |
|---|---|---|
| On-time work | 25 | Tasks and milestones finished by their due date |
| Time-tracker discipline | 20 | Days present on which at least 6 hours were logged |
| Time matches assignment | 15 | Share of logged time on projects the person is on the team of |
| Attendance | 10 | Days present out of working days |
| Team lead reviews | 30 | Average of the five 1 to 5 review criteria |

- Admin can change the weights (`/hr/appraisal/weights`); they must add up to 100.
- A part with nothing to judge (no tasks due, no reviews) is "n/a" and its weight is shared among the others.
- Bands: 85+ Excellent, 70+ Good, 50+ Needs improvement, below 50 Poor.
- Working days are Mon to Sat minus holidays and approved full-day leave. Approved OD/WFH counts as present.
- Time on a project the person is not assigned to is allowed but flagged and scored lower. It is not blocked.
- Milestones now have an owner and a completion date, so on-time delivery is credited to a person.

**Reviews**: team leads, team lead 2 and admin review people on the projects they manage (not themselves). One review per person, project and month; resubmitting in the same month updates it.

**Cycles** (`/hr/appraisal/cycles`, admin): create a cycle, close it (scores are frozen), give each employee a final rating 1 to 5 and a remark, publish. Employees see their result only after publishing and can acknowledge it with a comment. A rating is locked once acknowledged.

Apply `supabase/migrations/20261115000012_performance_rules.sql` and `20261115000013_appraisal_cycles.sql`.
