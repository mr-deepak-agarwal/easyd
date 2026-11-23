"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/session";
import { COSTING_ROLES } from "@/lib/roles";
import type { ActionState } from "@/lib/action-state";

const int = (label: string, min: number) =>
  z.string().trim().regex(/^\d{1,7}$/, `${label}: enter a whole number`).transform(Number).refine((n) => n >= min, `${label}: enter ${min === 0 ? "zero or more" : "at least " + min}`);

const addSchema = z.object({
  item: z.string().trim().min(1, "Enter the item name").max(200),
  category: z.string().trim().max(100),
  description: z.string().trim().max(500),
  qty: int("Quantity", 1),
  buffer: int("Buffer", 0),
  price: z.string().trim().transform((v) => (v === "" ? null : Number(v))).refine((v) => v === null || (Number.isFinite(v) && v >= 0), "Enter a valid price"),
  purchase_date: z.string().transform((v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null)),
});

/** Adds a new item, or tops up the quantity if the same item and category already exist. */
export async function addStock(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(COSTING_ROLES);
  const parsed = addSchema.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_stock", {
    p_item: d.item, p_category: d.category, p_description: d.description, p_qty: d.qty,
    p_price: d.price as number, p_purchase_date: d.purchase_date as string, p_buffer: d.buffer,
  });
  if (error) return { error: error.message };
  revalidatePath("/inventory/stock");
  revalidatePath("/inventory/purchase");
  return { ok: "Stock saved" };
}

export async function consumeStock(itemId: number, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole(COSTING_ROLES);
  const qty = int("Quantity", 1).safeParse(formData.get("qty") ?? "");
  if (!qty.success) return { error: qty.error.issues[0].message };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_stock", { p_item_id: itemId, p_qty: qty.data });
  if (error) return { error: error.message };
  revalidatePath("/inventory/stock");
  revalidatePath("/inventory/purchase");
  return { ok: `${qty.data} used, ${data} left` };
}

export async function dismissPurchase(id: number): Promise<void> {
  await requireRole(COSTING_ROLES);
  const supabase = await createClient();
  await supabase.from("purchase_requests").delete().eq("id", id);
  revalidatePath("/inventory/purchase");
}
