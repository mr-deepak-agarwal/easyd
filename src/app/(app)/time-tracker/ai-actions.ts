"use server";

import { requireUser } from "@/lib/session";
import { withAi, textOf } from "@/lib/ai";
import type { DraftResult } from "@/lib/ai-core";

/** Rewrites a rough time-tracker note into clear wording. Adds nothing the person did not write. */
export async function tidyWork(text: string): Promise<DraftResult> {
  await requireUser();
  const t = String(text ?? "").trim().slice(0, 1000);
  if (t.length < 5) return { error: "Write a few words first, then tidy them." };
  const r = await withAi("time_tidy", async (ask) => textOf((await ask({
    system: "Rewrite the note as one or two clear sentences in past tense, first person without the word 'I', for a work log. Keep every fact, number and name exactly. Add nothing new: no outcomes, durations or details that are not in the note. Reply with the rewritten note only.",
    maxTokens: 300,
    messages: [{ role: "user", content: t }],
  })).content));
  return r.ok ? { text: r.value } : { error: r.error };
}
