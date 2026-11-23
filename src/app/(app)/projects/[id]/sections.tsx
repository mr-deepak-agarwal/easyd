import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/dates";
import { Card } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { computeInvoice, money, type Entity, type InvoiceType } from "@/lib/invoice";
import { createTask } from "../../tasks/actions";
import { TaskFields } from "../../tasks/task-fields";
import type { Database } from "@/lib/database.types";
import {
  addDocument, addMeeting, addMilestone, addProposal, addTeamMember, closeProject, completeMilestone,
  deleteMilestone, editMilestone, postChat, removeTeamMember, updateDetails,
} from "./actions";

type Project = Database["public"]["Tables"]["projects"]["Row"] & { clients: { id: number; firm_name: string | null } | null; leader: { name: string } | null };
const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const h2 = "mb-2 text-sm font-semibold uppercase tracking-wide text-muted";

async function people() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("id, name").eq("active", true).order("name");
  return data ?? [];
}

export async function Overview({ project, editable }: { project: Project; editable: boolean }) {
  const staff = editable ? await people() : [];
  const view = (label: string, value: React.ReactNode) => (<><dt className="text-muted">{label}</dt><dd>{value ?? "-"}</dd></>);
  return (
    <div className="space-y-5">
      {project.status === "pending" && <Card><p className="text-sm">This project is waiting for approval by admin or teamlead2. Team, milestones and files open up once it is approved.</p></Card>}
      {project.status === "rejected" && <Card><p className="text-sm">This project was rejected.</p></Card>}
      {project.status === "closed" && (
        <Card title="Closed"><p className="text-sm">{project.closing_reason}</p><p className="mt-1 text-xs text-muted">Closed on {formatDate(project.actual_end_at)}</p></Card>
      )}
      <Card title="Project details">
        {editable ? (
          <ActionForm action={updateDetails.bind(null, project.id)} className="grid gap-4 sm:grid-cols-2" resetOnSuccess={false}>
            <Field label="Start date" htmlFor="start_date"><Input id="start_date" name="start_date" type="date" defaultValue={project.start_date ?? ""} /></Field>
            <Field label="Deadline" htmlFor="end_date"><Input id="end_date" name="end_date" type="date" defaultValue={project.end_date ?? ""} /></Field>
            <Field label="Planned hours" htmlFor="num_hours"><Input id="num_hours" name="num_hours" inputMode="decimal" defaultValue={project.num_hours?.toString() ?? ""} /></Field>
            <Field label="Project leader" htmlFor="leader_id">
              <Select id="leader_id" name="leader_id" defaultValue={project.leader_id ?? ""}>
                <option value="">-</option>
                {staff.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Description" htmlFor="description" className="sm:col-span-2"><Textarea id="description" name="description" defaultValue={project.description ?? ""} /></Field>
            <Field label="Additional work required" htmlFor="additional_work_required" className="sm:col-span-2">
              <Textarea id="additional_work_required" name="additional_work_required" defaultValue={project.additional_work_required ?? ""} />
            </Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="final_report" defaultChecked={project.final_report} /> Final report submitted</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="final_payment" defaultChecked={project.final_payment} /> Final payment received</label>
            <div className="sm:col-span-2"><SubmitButton>Save</SubmitButton></div>
          </ActionForm>
        ) : (
          <dl className="grid grid-cols-[160px_1fr] gap-y-2 text-sm">
            {view("Client", project.clients?.firm_name)}{view("Leader", project.leader?.name)}
            {view("Project type", project.project_type)}{view("Start date", formatDate(project.start_date))}
            {view("Deadline", formatDate(project.end_date))}{view("Planned hours", project.num_hours)}
            {view("Description", project.description)}{view("Additional work", project.additional_work_required)}
            {view("Final report", project.final_report ? "Submitted" : "No")}{view("Final payment", project.final_payment ? "Received" : "No")}
          </dl>
        )}
      </Card>
      {editable && (
        <Card title="Close project">
          {project.final_report ? (
            <ActionForm action={closeProject.bind(null, project.id)} className="grid gap-4" resetOnSuccess={false}>
              <Field label="Closing note" htmlFor="reason"><Textarea id="reason" name="reason" required maxLength={1000} /></Field>
              <div><SubmitButton variant="danger" confirm="Close this project? This cannot be undone.">Close project</SubmitButton></div>
            </ActionForm>
          ) : <p className="text-sm text-muted">Tick &quot;Final report submitted&quot; above and save before closing the project.</p>}
        </Card>
      )}
    </div>
  );
}

export async function Team({ projectId, editable }: { projectId: number; editable: boolean }) {
  const supabase = await createClient();
  const [{ data: team }, staff] = await Promise.all([
    supabase.from("project_team").select("id, member_type, member_name, num_hours, start_date, end_date").eq("project_id", projectId).order("id"),
    editable ? people() : Promise.resolve([]),
  ]);
  return (
    <div className="space-y-5">
      <Table>
        <thead><tr><Th>Name</Th><Th>Role</Th><Th>Hours</Th><Th>From</Th><Th>To</Th>{editable && <Th />}</tr></thead>
        <tbody>
          {team?.length ? team.map((m) => (
            <tr key={m.id}>
              <Td>{m.member_name}</Td><Td><Badge tone={m.member_type === "Lead" ? "green" : "grey"}>{m.member_type}</Badge></Td>
              <Td>{m.num_hours ?? "-"}</Td><Td>{formatDate(m.start_date)}</Td><Td>{formatDate(m.end_date)}</Td>
              {editable && <Td><form action={removeTeamMember.bind(null, projectId, m.id)}><SubmitButton variant="ghost" confirm={`Remove ${m.member_name} from this project?`}>Remove</SubmitButton></form></Td>}
            </tr>
          )) : <EmptyRow cols={editable ? 6 : 5} text="No team members yet" />}
        </tbody>
      </Table>
      {editable && (
        <Card title="Add a team member">
          <ActionForm action={addTeamMember.bind(null, projectId)} className="grid gap-4 sm:grid-cols-3">
            <Field label="Person" htmlFor="member_id">
              <Select id="member_id" name="member_id" required defaultValue="">
                <option value="" disabled>Choose</option>
                {staff.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </Field>
            <Field label="Role" htmlFor="member_type">
              <Select id="member_type" name="member_type" defaultValue="Associate"><option value="Associate">Associate</option><option value="Lead">Lead</option></Select>
            </Field>
            <Field label="Hours" htmlFor="t_hours"><Input id="t_hours" name="num_hours" inputMode="decimal" /></Field>
            <Field label="From" htmlFor="t_start"><Input id="t_start" name="start_date" type="date" /></Field>
            <Field label="To" htmlFor="t_end"><Input id="t_end" name="end_date" type="date" /></Field>
            <div className="flex items-end"><SubmitButton>Add</SubmitButton></div>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}

export async function Milestones({ projectId, editable }: { projectId: number; editable: boolean }) {
  const supabase = await createClient();
  const [{ data: milestones }, { data: log }, { data: team }] = await Promise.all([
    supabase.from("project_milestones").select("id, milestone, percentage, start_date, end_date, complete, owner_id, completed_at, profiles:owner_id(name)").eq("project_id", projectId).order("id"),
    supabase.from("project_completions").select("id, percent_complete, reason, entry_at, project_milestones(milestone), profiles:entry_by(name)").eq("project_id", projectId).order("id", { ascending: false }),
    supabase.from("project_team").select("member_id, member_name").eq("project_id", projectId).not("member_id", "is", null).order("member_name"),
  ]);
  const owners = (team ?? []).map((t) => ({ id: t.member_id as string, name: t.member_name ?? "" }));
  const allocated = (milestones ?? []).reduce((s, m) => s + m.percentage, 0);
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">Each milestone carries a weight. The project&apos;s progress is the total weight of finished milestones. {allocated}% of 100% allocated.</p>
      <Table>
        <thead><tr><Th>Milestone</Th><Th>Owner</Th><Th>Weight</Th><Th>From</Th><Th>To</Th><Th>Status</Th>{editable && <Th />}</tr></thead>
        <tbody>
          {milestones?.length ? milestones.map((m) => (
            <tr key={m.id}>
              <Td>{m.milestone}</Td><Td>{(m.profiles as { name: string } | null)?.name ?? <span className="text-muted">-</span>}</Td><Td>{m.percentage}%</Td><Td>{formatDate(m.start_date)}</Td><Td>{formatDate(m.end_date)}</Td>
              <Td>{m.complete ? <Badge tone="green">Done {formatDate(m.completed_at)}</Badge> : <Badge tone="amber">Open</Badge>}</Td>
              {editable && (
                <Td>
                  {!m.complete && (
                    <div className="space-y-2">
                      <ActionForm action={completeMilestone.bind(null, projectId, m.id)} className="flex items-center gap-2">
                        <Input name="reason" placeholder="Note (optional)" className="w-40" aria-label={`Note for ${m.milestone}`} />
                        <SubmitButton confirm={`Mark "${m.milestone}" as complete?`}>Complete</SubmitButton>
                      </ActionForm>
                      <details>
                        <summary className="cursor-pointer text-xs text-brand">Edit or delete</summary>
                        <ActionForm action={editMilestone.bind(null, projectId, m.id)} className="mt-2 grid gap-2" resetOnSuccess={false}>
                          <Input name="milestone" defaultValue={m.milestone} aria-label="Milestone" required />
                          <Input name="percentage" defaultValue={String(m.percentage)} inputMode="numeric" aria-label="Weight" required />
                          <Input name="start_date" type="date" defaultValue={m.start_date ?? ""} aria-label="From" />
                          <Input name="end_date" type="date" defaultValue={m.end_date ?? ""} aria-label="To" />
                          <Select name="owner_id" defaultValue={m.owner_id ?? ""} aria-label="Owner"><option value="">No owner</option>{owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select>
                          <SubmitButton variant="secondary">Save changes</SubmitButton>
                        </ActionForm>
                        <form action={deleteMilestone.bind(null, projectId, m.id)} className="mt-1"><SubmitButton variant="ghost" confirm="Delete this milestone?">Delete</SubmitButton></form>
                      </details>
                    </div>
                  )}
                </Td>
              )}
            </tr>
          )) : <EmptyRow cols={editable ? 7 : 6} text="No milestones yet" />}
        </tbody>
      </Table>
      {editable && (
        <Card title="Add a milestone">
          <ActionForm action={addMilestone.bind(null, projectId)} className="grid gap-4 sm:grid-cols-4">
            <Field label="Milestone" htmlFor="m_name" className="sm:col-span-2"><Input id="m_name" name="milestone" required maxLength={300} /></Field>
            <Field label="Weight (%)" htmlFor="m_pct"><Input id="m_pct" name="percentage" inputMode="numeric" required /></Field>
            <Field label="Owner" htmlFor="m_owner"><Select id="m_owner" name="owner_id" defaultValue=""><option value="">No owner</option>{owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select></Field>
            <Field label="From" htmlFor="m_start"><Input id="m_start" name="start_date" type="date" /></Field>
            <Field label="To" htmlFor="m_end"><Input id="m_end" name="end_date" type="date" /></Field>
            <div className="flex items-end"><SubmitButton>Add</SubmitButton></div>
          </ActionForm>
        </Card>
      )}
      <section>
        <h2 className={h2}>Completion log</h2>
        <Table>
          <thead><tr><Th>Date</Th><Th>Milestone</Th><Th>Added</Th><Th>Note</Th><Th>By</Th></tr></thead>
          <tbody>
            {log?.length ? log.map((l) => (
              <tr key={l.id}>
                <Td>{formatDate(l.entry_at)}</Td><Td>{(l.project_milestones as { milestone: string } | null)?.milestone ?? "-"}</Td>
                <Td>+{l.percent_complete}%</Td><Td>{l.reason ?? "-"}</Td><Td>{(l.profiles as { name: string } | null)?.name ?? "-"}</Td>
              </tr>
            )) : <EmptyRow cols={5} text="Nothing completed yet" />}
          </tbody>
        </Table>
      </section>
    </div>
  );
}

export async function Files({ projectId, canManage, open }: { projectId: number; canManage: boolean; open: boolean }) {
  const supabase = await createClient();
  const [{ data: docs }, { data: proposals }] = await Promise.all([
    supabase.from("project_documents").select("id, description, entry_at, profiles:entry_by(name)").eq("project_id", projectId).order("id", { ascending: false }),
    supabase.from("project_proposals").select("id, description, entry_at, profiles:entry_by(name)").eq("project_id", projectId).order("id", { ascending: false }),
  ]);
  const list = (rows: typeof docs, kind: string) => (
    <Table>
      <thead><tr><Th>Date</Th><Th>Description</Th><Th>By</Th><Th /></tr></thead>
      <tbody>
        {rows?.length ? rows.map((r) => (
          <tr key={r.id}>
            <Td>{formatDate(r.entry_at)}</Td><Td>{r.description || "(no description)"}</Td><Td>{(r.profiles as { name: string } | null)?.name ?? "-"}</Td>
            <Td><a className="text-brand hover:underline" href={`/projects/${projectId}/files/${kind}/${r.id}`}>Download</a></Td>
          </tr>
        )) : <EmptyRow cols={4} text="Nothing uploaded yet" />}
      </tbody>
    </Table>
  );
  const upload = (action: typeof addDocument, label: string) => (
    <ActionForm action={action.bind(null, projectId)} className="mt-3 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <Field label={`${label} (up to 4 MB)`} htmlFor={`f_${label}`}><Input id={`f_${label}`} name="file" type="file" required accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" /></Field>
      <Field label="Description" htmlFor={`d_${label}`}><Input id={`d_${label}`} name="description" maxLength={500} /></Field>
      <SubmitButton>Upload</SubmitButton>
    </ActionForm>
  );
  return (
    <div className="space-y-6">
      <section><h2 className={h2}>Documents</h2>{list(docs, "documents")}{open && upload(addDocument, "Document")}</section>
      <section><h2 className={h2}>Proposals</h2>{list(proposals, "proposals")}{open && canManage && upload(addProposal, "Proposal")}</section>
    </div>
  );
}

export async function Meetings({ projectId, open }: { projectId: number; open: boolean }) {
  const supabase = await createClient();
  const [{ data: meetings }, staff] = await Promise.all([
    supabase.from("project_meetings").select("id, members, agenda, meeting_at, conclusion, profiles:created_by(name)").eq("project_id", projectId).order("meeting_at", { ascending: false }),
    people(),
  ]);
  const name = new Map(staff.map((p) => [p.id, p.name]));
  return (
    <div className="space-y-5">
      <Table>
        <thead><tr><Th>When</Th><Th>Agenda</Th><Th>Attendees</Th><Th>Conclusion</Th></tr></thead>
        <tbody>
          {meetings?.length ? meetings.map((m) => (
            <tr key={m.id}>
              <Td>{new Date(m.meeting_at ?? "").toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</Td>
              <Td>{m.agenda}</Td><Td>{m.members.map((id) => name.get(id) ?? "Former staff").join(", ") || "-"}</Td><Td>{m.conclusion ?? "-"}</Td>
            </tr>
          )) : <EmptyRow cols={4} text="No meetings recorded" />}
        </tbody>
      </Table>
      {open && (
        <Card title="Record a meeting">
          <ActionForm action={addMeeting.bind(null, projectId)} className="grid gap-4 sm:grid-cols-2">
            <Field label="Agenda" htmlFor="agenda"><Input id="agenda" name="agenda" required maxLength={1000} /></Field>
            <Field label="Date and time (IST)" htmlFor="meeting_at"><Input id="meeting_at" name="meeting_at" type="datetime-local" required /></Field>
            <fieldset className="sm:col-span-2">
              <legend className="mb-1 text-sm font-medium">Attendees</legend>
              <div className="grid max-h-40 grid-cols-2 gap-1 overflow-auto sm:grid-cols-4">
                {staff.map((p) => <label key={p.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="members" value={p.id} /> {p.name}</label>)}
              </div>
            </fieldset>
            <Field label="Conclusion" htmlFor="conclusion" className="sm:col-span-2"><Textarea id="conclusion" name="conclusion" maxLength={2000} /></Field>
            <div className="sm:col-span-2"><SubmitButton>Save meeting</SubmitButton></div>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}

export async function Forum({ projectId, open, currentUserId }: { projectId: number; open: boolean; currentUserId: string }) {
  const supabase = await createClient();
  const { data: chats } = await supabase.from("project_forum_chats").select("id, user_id, message, created_at, profiles:user_id(name)").eq("project_id", projectId).order("created_at", { ascending: false }).limit(200);
  return (
    <div className="space-y-5">
      {open && (
        <Card>
          <ActionForm action={postChat.bind(null, projectId)} className="grid gap-3">
            <Field label="Message" htmlFor="message"><Textarea id="message" name="message" required maxLength={2000} /></Field>
            <div><SubmitButton>Post</SubmitButton></div>
          </ActionForm>
        </Card>
      )}
      <ul className="space-y-3">
        {chats?.length ? chats.map((c) => (
          <li key={c.id} className={`rounded-xl border border-border p-3 text-sm ${c.user_id === currentUserId ? "bg-brand-soft" : "bg-card"}`}>
            <div className="mb-1 text-xs text-muted">{(c.profiles as { name: string } | null)?.name ?? "Former staff"} · {new Date(c.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</div>
            <p className="whitespace-pre-wrap">{c.message}</p>
          </li>
        )) : <li className="text-sm text-muted">No messages yet</li>}
      </ul>
    </div>
  );
}

export async function Costing({ projectId }: { projectId: number }) {
  const supabase = await createClient();
  const { data } = await supabase.from("project_costing").select("id, grade_label, grade, num_employees, total_hours, overheads, multiply_factor, total_cost, added_at").eq("project_id", projectId).eq("active", true).order("id");
  return (
    <Table>
      <thead><tr><Th>Grade</Th><Th>Rate</Th><Th>People</Th><Th>Hours</Th><Th>Date</Th></tr></thead>
      <tbody>
        {data?.length ? <>
          {data.map((c) => <tr key={c.id}><Td>{c.grade_label}</Td><Td>{inr(Number(c.grade))}</Td><Td>{c.num_employees}</Td><Td>{c.total_hours}</Td><Td>{formatDate(c.added_at)}</Td></tr>)}
          <tr className="bg-background font-medium"><Td colSpan={5}>Overhead hours {data[0].overheads} · factor x{data[0].multiply_factor} · <span className="text-brand">Quoted total {inr(Number(data[0].total_cost))}</span></Td></tr>
        </> : <EmptyRow cols={5} text="No costing recorded" />}
      </tbody>
    </Table>
  );
}

export async function Tasks({ projectId, open }: { projectId: number; open: boolean }) {
  const supabase = await createClient();
  const [{ data: tasks }, staff] = await Promise.all([
    supabase.from("tasks").select("id, title, ends_on, status, task_participants(is_responsible, profiles(name))").eq("project_id", projectId).order("status", { ascending: false }).order("ends_on", { nullsFirst: false }),
    open ? people() : Promise.resolve([]),
  ]);
  return (
    <div className="space-y-5">
      <Table>
        <thead><tr><Th>Task</Th><Th>Responsible</Th><Th>Due</Th><Th>Status</Th></tr></thead>
        <tbody>
          {tasks?.length ? tasks.map((t) => (
            <tr key={t.id}>
              <Td><Link href={`/tasks/${t.id}`} className="font-medium text-brand hover:underline">{t.title}</Link></Td>
              <Td>{t.task_participants.filter((p) => p.is_responsible).map((p) => (p.profiles as { name: string } | null)?.name).filter(Boolean).join(", ") || "-"}</Td>
              <Td>{formatDate(t.ends_on)}</Td>
              <Td>{t.status === "completed" ? <Badge tone="green">Completed</Badge> : <Badge tone="amber">Open</Badge>}</Td>
            </tr>
          )) : <EmptyRow cols={4} text="No tasks on this project yet" />}
        </tbody>
      </Table>
      {open && (
        <Card title="New task on this project">
          <ActionForm action={createTask.bind(null, projectId)} className="grid gap-4 sm:grid-cols-2" resetOnSuccess={false}>
            <TaskFields people={staff} />
            <div className="sm:col-span-2"><SubmitButton>Create task</SubmitButton></div>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}

export async function ProjectInvoices({ projectId, canCreate }: { projectId: number; canCreate: boolean }) {
  const supabase = await createClient();
  const { data } = await supabase.from("invoices")
    .select("id, invoice_no, invoice_type, invoice_by, invoice_date, delivery_state_code, advance, ope, currency_type, confirmed, converted, invoice_lines(taxable_value)")
    .eq("project_id", projectId).is("deleted_at", null).order("id", { ascending: false });
  return (
    <div className="space-y-3">
      {canCreate && <div><Link href={`/invoices/new?project=${projectId}`} className="inline-block rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90">New invoice</Link></div>}
      <Table>
        <thead><tr><Th>Invoice no.</Th><Th>Date</Th><Th className="text-right">Total</Th><Th>Status</Th></tr></thead>
        <tbody>
          {data?.length ? data.map((r) => {
            const t = computeInvoice({ type: r.invoice_type as InvoiceType, entity: r.invoice_by as Entity, lines: r.invoice_lines, advance: r.advance, ope: r.ope, deliveryStateCode: r.delivery_state_code });
            return (
              <tr key={r.id}>
                <Td><Link href={`/invoices/${r.id}`} className="font-medium text-brand hover:underline">{r.invoice_no}</Link></Td>
                <Td>{formatDate(r.invoice_date)}</Td>
                <Td className="text-right tabular-nums">{money(t.total, r.currency_type)}</Td>
                <Td>{r.confirmed ? <Badge tone="green">Paid</Badge> : r.converted ? <Badge tone="grey">Converted</Badge> : <Badge tone="amber">Unpaid</Badge>}</Td>
              </tr>
            );
          }) : <EmptyRow cols={4} text="No invoices yet" />}
        </tbody>
      </Table>
    </div>
  );
}
