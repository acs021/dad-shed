import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { getActor } from "@/server/current";
import type { Actor } from "@/server/domain";
import { loadFrame } from "@/server/queries";

export async function privatePage(render: (ctx: { actor: Actor; today: string }) => Promise<React.ReactNode>) {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.status === "suspended") redirect("/suspended");
  if (actor.status === "pending") redirect("/waiting");
  const frame = await loadFrame(actor);
  return <Shell frame={frame}>{await render({ actor, today: frame.today })}</Shell>;
}
