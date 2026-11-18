import { redirect } from "next/navigation";
import { PublicFrame } from "@/components/shell";
import { getActor } from "@/server/current";
import { privatePage } from "@/server/chrome";
import { shedGate } from "@/server/queries";

export default async function RulesPage() {
  const gate = await shedGate();
  if (!gate.group) redirect("/setup");
  const actor = await getActor();
  const body = (
    <article className="stack">
      <h1>House rules</h1>
      <p className="prose">{gate.group.rules}</p>
    </article>
  );
  if (actor?.status === "approved") return privatePage(async () => body);
  return <PublicFrame demo={gate.demo}>{body}</PublicFrame>;
}
