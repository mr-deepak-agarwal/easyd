import { requireUser } from "@/lib/session";
import { aiConfigured } from "@/lib/ai";
import { PageHeader } from "@/components/ui/page-header";
import { AskBox } from "./ask-box";

export default async function AskPage() {
  await requireUser();
  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title="Ask EasyD" description="Ask a question in plain English. You only get answers from what you are allowed to see." />
      <AskBox enabled={aiConfigured()} />
    </div>
  );
}
