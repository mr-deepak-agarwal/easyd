import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { formatDate } from "@/lib/dates";
import { PageHeader, Card } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { addCircular, removeCircular } from "./actions";

export default async function CircularsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: circulars } = await supabase
    .from("circulars").select("id, title, entered_on").eq("active", true)
    .order("entered_on", { ascending: false, nullsFirst: false }).order("id", { ascending: false });
  const isAdmin = user.role === "admin";

  return (
    <div className="space-y-5">
      <PageHeader title="Circulars" description="Company notices and policies" />
      {isAdmin && (
        <Card title="Publish a circular">
          <ActionForm action={addCircular} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Title" htmlFor="title"><Input id="title" name="title" required maxLength={100} /></Field>
            <Field label="File" htmlFor="file" hint="PDF, Word, Excel or image, up to 4 MB">
              <Input id="file" name="file" type="file" required accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" />
            </Field>
            <SubmitButton>Publish</SubmitButton>
          </ActionForm>
        </Card>
      )}
      <Table>
        <thead><tr><Th>Title</Th><Th>Date</Th><Th className="w-40" /></tr></thead>
        <tbody>
          {circulars?.length ? circulars.map((c) => (
            <tr key={c.id}>
              <Td className="font-medium">{c.title}</Td>
              <Td>{formatDate(c.entered_on)}</Td>
              <Td>
                <div className="flex items-center gap-3">
                  <a href={`/hr/circulars/${c.id}/download`} className="text-brand hover:underline">Download</a>
                  {isAdmin && (
                    <form action={removeCircular.bind(null, c.id)}>
                      <SubmitButton variant="ghost" confirm="Remove this circular?">Remove</SubmitButton>
                    </form>
                  )}
                </div>
              </Td>
            </tr>
          )) : <EmptyRow cols={3} text="No circulars yet" />}
        </tbody>
      </Table>
    </div>
  );
}
