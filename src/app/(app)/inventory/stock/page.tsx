import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { COSTING_ROLES } from "@/lib/roles";
import { formatDate } from "@/lib/dates";
import { PageHeader, Card } from "@/components/ui/page-header";
import { Table, Th, Td, EmptyRow } from "@/components/ui/data-table";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { Badge } from "@/components/ui/badge";
import { addStock, consumeStock } from "../actions";

export default async function StockPage({ searchParams }: PageProps<"/inventory/stock">) {
  await requireRole(COSTING_ROLES);
  const sp = await searchParams;
  const history = (Array.isArray(sp.view) ? sp.view[0] : sp.view) === "history";
  const supabase = await createClient();
  const [{ data: items }, { data: used }] = await Promise.all([
    supabase.from("stock_items").select("id, item, category, description, quantity, price, purchase_date, buffer").order("item").limit(1000),
    history ? supabase.from("stock_consumption").select("id, item, category, quantity, consumed_at").order("id", { ascending: false }).limit(300) : Promise.resolve({ data: null }),
  ]);
  const tab = (label: string, href: string, on: boolean) => (
    <Link href={href} className={`rounded-md border px-3 py-1.5 text-sm ${on ? "border-brand bg-brand text-white" : "border-border bg-card hover:bg-raised"}`}>{label}</Link>
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Stock Details" description="Items in stock; using an item below its buffer adds it to Items To Purchase">
        {tab("Stock", "/inventory/stock", !history)}{tab("Consumption history", "/inventory/stock?view=history", history)}
      </PageHeader>

      {history ? (
        <Table>
          <thead><tr><Th>Date</Th><Th>Item</Th><Th>Category</Th><Th>Quantity used</Th></tr></thead>
          <tbody>
            {used?.length ? used.map((u) => (
              <tr key={u.id}><Td>{formatDate(u.consumed_at)}</Td><Td>{u.item}</Td><Td>{u.category ?? "-"}</Td><Td>{u.quantity}</Td></tr>
            )) : <EmptyRow cols={4} text="Nothing has been used yet" />}
          </tbody>
        </Table>
      ) : (
        <>
          <Card title="Add stock">
            <p className="mb-3 text-sm text-muted">If the item and category already exist, the quantity is added to the current stock.</p>
            <ActionForm action={addStock} className="grid gap-4 sm:grid-cols-3">
              <Field label="Item" htmlFor="item"><Input id="item" name="item" required maxLength={200} /></Field>
              <Field label="Category" htmlFor="category"><Input id="category" name="category" maxLength={100} /></Field>
              <Field label="Description" htmlFor="description"><Input id="description" name="description" maxLength={500} /></Field>
              <Field label="Quantity" htmlFor="qty"><Input id="qty" name="qty" inputMode="numeric" required /></Field>
              <Field label="Buffer (reorder level)" htmlFor="buffer"><Input id="buffer" name="buffer" inputMode="numeric" defaultValue="0" required /></Field>
              <Field label="Price per unit (Rs)" htmlFor="price"><Input id="price" name="price" inputMode="decimal" /></Field>
              <Field label="Purchase date" htmlFor="purchase_date"><Input id="purchase_date" name="purchase_date" type="date" /></Field>
              <div className="flex items-end"><SubmitButton>Save stock</SubmitButton></div>
            </ActionForm>
          </Card>
          <Table>
            <thead><tr><Th>Item</Th><Th>Category</Th><Th>In stock</Th><Th>Buffer</Th><Th>Price</Th><Th>Purchased</Th><Th>Use</Th></tr></thead>
            <tbody>
              {items?.length ? items.map((i) => (
                <tr key={i.id}>
                  <Td><div className="font-medium">{i.item}</div>{i.description && <div className="text-xs text-muted">{i.description}</div>}</Td>
                  <Td>{i.category ?? "-"}</Td>
                  <Td>{i.quantity} {i.quantity <= i.buffer && <Badge tone="red">Low</Badge>}</Td>
                  <Td>{i.buffer}</Td>
                  <Td>{i.price == null ? "-" : Number(i.price).toLocaleString("en-IN")}</Td>
                  <Td>{formatDate(i.purchase_date)}</Td>
                  <Td>
                    <ActionForm action={consumeStock.bind(null, i.id)} className="flex items-center gap-2">
                      <Input name="qty" inputMode="numeric" placeholder="Qty" className="w-20" aria-label={`Quantity of ${i.item} used`} />
                      <SubmitButton variant="secondary">Use</SubmitButton>
                    </ActionForm>
                  </Td>
                </tr>
              )) : <EmptyRow cols={7} text="No stock recorded yet" />}
            </tbody>
          </Table>
        </>
      )}
    </div>
  );
}
