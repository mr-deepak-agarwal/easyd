import { formatDate } from "@/lib/dates";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";

export type FollowupRow = {
  id: number; reason: string | null; reply: string | null; description: string | null; next_followup_on: string | null;
  file_path: string | null; file_description: string | null; entered_at: string | null; prospect_name?: string | null;
  profiles?: { name: string } | null;
};

export function FollowupList({ rows, showClient = false }: { rows: FollowupRow[]; showClient?: boolean }) {
  const cols = showClient ? 6 : 5;
  return (
    <Table>
      <thead><tr><Th>Date</Th>{showClient && <Th>Client</Th>}<Th>Reason</Th><Th>Reply / notes</Th><Th>Next</Th><Th>By</Th></tr></thead>
      <tbody>
        {rows.length ? rows.map((f) => (
          <tr key={f.id}>
            <Td>{formatDate(f.entered_at)}</Td>
            {showClient && <Td>{f.prospect_name ?? "-"}</Td>}
            <Td>{f.reason}
              {f.file_path && <div><a className="text-brand hover:underline" href={`/crm/followups/${f.id}/download`}>{f.file_description || "Document"}</a></div>}
            </Td>
            <Td>{[f.reply, f.description].filter(Boolean).join(" - ") || "-"}</Td>
            <Td>{formatDate(f.next_followup_on)}</Td>
            <Td>{f.profiles?.name ?? "-"}</Td>
          </tr>
        )) : <EmptyRow cols={cols} text="No follow-ups yet" />}
      </tbody>
    </Table>
  );
}
