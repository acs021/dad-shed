import { redirect } from "next/navigation";
import { PublicFrame } from "@/components/shell";
import { logoutAction } from "@/server/actions";
import { getActor } from "@/server/current";

export default async function SuspendedPage() {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.status === "approved") redirect("/");
  if (actor.status === "pending") redirect("/waiting");
  return (
    <PublicFrame>
      <div className="stack">
        <h1>Your membership is paused.</h1>
        <p className="lede">An admin will have to let you back in.</p>
        <form action={logoutAction}>
          <button className="button quiet">Sign out</button>
        </form>
      </div>
    </PublicFrame>
  );
}
