"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/session";
import { withAi, textOf, type Msg, type Block } from "@/lib/ai";
import { TOOLS, runTool } from "@/lib/ai-tools";
import { todayIST } from "@/lib/dates";

export type Turn = { q: string; a: string };
export type AskResult = { answer?: string; used?: string[]; error?: string };

const SYSTEM = (name: string, role: string, today: string) =>
  `You answer questions for ${name} (role: ${role}). Today is ${today} (India). Use the tools to fetch live data; never guess. ` +
  `If a tool says the person has no access, say so plainly and do not try to work around it. You can only read data; you cannot change anything. ` +
  `Give the direct answer first, then the key figures. When listing more than a few items use a short list. Mention the date range you used.`;

export async function askErp(question: string, history: Turn[]): Promise<AskResult> {
  const user = await requireUser();
  const q = String(question ?? "").trim().slice(0, 600);
  if (q.length < 3) return { error: "Type a question first." };
  const past = (Array.isArray(history) ? history : []).slice(-4).flatMap((t): Msg[] => [
    { role: "user", content: String(t.q).slice(0, 600) }, { role: "assistant", content: String(t.a).slice(0, 3000) },
  ]);
  const supabase = await createClient();
  const used: string[] = [];
  const r = await withAi("ask", async (ask) => {
    const messages: Msg[] = [...past, { role: "user", content: q }];
    for (let i = 0; i < 6; i++) {
      const reply = await ask({ system: SYSTEM(user.name, user.role, todayIST()), messages, tools: TOOLS, maxTokens: 1200 });
      const calls = reply.content.filter((b): b is Extract<Block, { type: "tool_use" }> => b.type === "tool_use");
      if (!calls.length) return textOf(reply.content) || "I could not find an answer.";
      messages.push({ role: "assistant", content: reply.content });
      const results: Block[] = [];
      for (const c of calls) {
        used.push(c.name.replace(/_/g, " "));
        results.push({ type: "tool_result", tool_use_id: c.id, content: await runTool(supabase, user, c.name, c.input ?? {}) });
      }
      messages.push({ role: "user", content: results });
    }
    return "That needed too many steps. Try a narrower question.";
  });
  return r.ok ? { answer: r.value, used: [...new Set(used)] } : { error: r.error };
}
