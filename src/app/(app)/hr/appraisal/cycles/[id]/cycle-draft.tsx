"use client";

import { DraftButton } from "@/components/ai/draft-button";
import { draftCycleRemark } from "../../ai-actions";

export function CycleDraft({ resultId }: { resultId: number }) {
  return <DraftButton target="remark" run={() => draftCycleRemark(resultId)} />;
}
