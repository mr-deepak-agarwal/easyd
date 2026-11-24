import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { formatDate, todayIST } from "@/lib/dates";
import { PageHeader, Card } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { addHoliday, deleteHoliday } from "./actions";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function HolidaysPage({ searchParams }: PageProps<"/hr/holidays">) {
  const user = await requireUser();
  const sp = await searchParams;
  const thisYear = Number(todayIST().slice(0, 4));
  const requested = Number(Array.isArray(sp.year) ? sp.year[0] : sp.year);
  const year = requested >= 2000 && requested <= 2100 ? requested : thisYear;

  const supabase = await createClient();
  const { data: holidays } = await supabase
    .from("holidays").select("id, holiday_date, description")
    .gte("holiday_date", `${year}-01-01`).lte("holiday_date", `${year}-12-31`)
    .order("holiday_date");
  const isAdmin = user.role === "admin";

  return (
    <div className="space-y-5">
      <PageHeader title="Holidays" description={`Company holidays for ${year}`}>
        {[year - 1, year, year + 1].map((y) => (
          <Link key={y} href={`/hr/holidays?year=${y}`}
            className={`rounded-md border px-3 py-1.5 text-sm ${y === year ? "border-brand bg-brand text-white" : "border-border bg-card hover:bg-raised"}`}>{y}</Link>
        ))}
      </PageHeader>

      {isAdmin && (
        <Card title="Add a holiday">
          <ActionForm action={addHoliday} className="grid gap-4 sm:grid-cols-[200px_1fr_auto] sm:items-end">
            <Field label="Date" htmlFor="date"><Input id="date" name="date" type="date" required /></Field>
            <Field label="Description" htmlFor="description"><Input id="description" name="description" required maxLength={200} /></Field>
            <SubmitButton>Add</SubmitButton>
          </ActionForm>
        </Card>
      )}

      <Table>
        <thead><tr><Th>Date</Th><Th>Day</Th><Th>Holiday</Th>{isAdmin && <Th className="w-24" />}</tr></thead>
        <tbody>
          {holidays?.length ? holidays.map((h) => (
            <tr key={h.id}>
              <Td>{formatDate(h.holiday_date)}</Td>
              <Td>{WEEKDAYS[new Date(h.holiday_date + "T00:00:00Z").getUTCDay()]}</Td>
              <Td>{h.description}</Td>
              {isAdmin && (
                <Td>
                  <form action={deleteHoliday.bind(null, h.id)}>
                    <SubmitButton variant="ghost" confirm="Delete this holiday?">Delete</SubmitButton>
                  </form>
                </Td>
              )}
            </tr>
          )) : <EmptyRow cols={isAdmin ? 4 : 3} text={`No holidays recorded for ${year}`} />}
        </tbody>
      </Table>
    </div>
  );
}
