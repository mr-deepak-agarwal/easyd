import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { COSTING_ROLES } from "@/lib/roles";
import { formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { SubmitButton } from "@/components/ui/submit-button";
import { dismissPurchase } from "../actions";

export default async function PurchasePage() {
  await requireRole(COSTING_ROLES);
  const supabase = await createClient();
  const { data } = await supabase.from("purchase_requests").select("id, item, category, current_stock, created_at").order("id", { ascending: false }).limit(500);
  return (
    <div className="space-y-5">
      <PageHeader title="Items To Purchase" description="Items that fell to their buffer level. Adding stock above the buffer clears them." />
      <Table>
        <thead><tr><Th>Since</Th><Th>Item</Th><Th>Category</Th><Th>Stock left</Th><Th /></tr></thead>
        <tbody>
          {data?.length ? data.map((r) => (
            <tr key={r.id}>
              <Td>{formatDate(r.created_at)}</Td><Td>{r.item}</Td><Td>{r.category ?? "-"}</Td><Td>{r.current_stock}</Td>
              <Td><form action={dismissPurchase.bind(null, r.id)}><SubmitButton variant="ghost" confirm="Remove this from the list?">Remove</SubmitButton></form></Td>
            </tr>
          )) : <EmptyRow cols={5} text="Nothing to purchase" />}
        </tbody>
      </Table>
    </div>
  );
}
