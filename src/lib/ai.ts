import "server-only";
import { createClient } from "@/lib/supabase/server";
import { capMessage, capsFromEnv, AI_RULES } from "@/lib/ai-core";

export type Block =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string; is_error?: boolean };
export type Msg = { role: "user" | "assistant"; content: string | Block[] };
export type Tool = { name: string; description: string; input_schema: Record<string, unknown> };
type Reply = { content: Block[]; stop_reason: string; usage: { input_tokens: number; output_tokens: number } };

export const aiConfigured = () => !!process.env.ANTHROPIC_API_KEY;

async function post(body: Record<string, unknown>): Promise<Reply> {
  const base = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
  const res = await fetch(`${base}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5", ...body }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`AI service returned ${res.status}`);
  return (await res.json()) as Reply;
}

export type AiResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Runs one AI feature for the signed-in person: checks the key and the monthly caps, runs `fn`
 * (which may call `ask` several times), then records the tokens used. Errors become plain messages.
 */
export async function withAi<T>(feature: string, fn: (ask: (b: { system?: string; messages: Msg[]; tools?: Tool[]; maxTokens?: number }) => Promise<Reply>) => Promise<T>): Promise<AiResult<T>> {
  if (!aiConfigured()) return { ok: false, error: "AI is not switched on yet. Ask the admin to add the AI key." };
  const supabase = await createClient();
  const { data: u } = await supabase.rpc("ai_usage_summary");
  const msg = capMessage({ total: Number(u?.[0]?.total_tokens ?? 0), mine: Number(u?.[0]?.my_tokens ?? 0) }, capsFromEnv(process.env));
  if (msg) return { ok: false, error: msg };
  let tin = 0, tout = 0;
  try {
    const value = await fn(async (b) => {
      const r = await post({ system: `${AI_RULES}${b.system ? " " + b.system : ""}`, messages: b.messages, tools: b.tools, max_tokens: b.maxTokens ?? 1200 });
      tin += r.usage?.input_tokens ?? 0; tout += r.usage?.output_tokens ?? 0;
      return r;
    });
    return { ok: true, value };
  } catch {
    return { ok: false, error: "The AI service did not answer. Please try again in a moment." };
  } finally {
    if (tin || tout) await supabase.rpc("log_ai_usage", { p_feature: feature, p_input: tin, p_output: tout });
  }
}

export const textOf = (blocks: Block[]) => blocks.filter((b): b is Extract<Block, { type: "text" }> => b.type === "text").map((b) => b.text).join("\n").trim();
