import { redirect } from "next/navigation";
import { PublicFrame } from "@/components/shell";
import { MemberFields } from "@/components/fields";
import { ShedForm, Submit } from "@/components/forms";
import { logoutAction, profileAction } from "@/server/actions";
import { getActor } from "@/server/current";

export default async function WaitingPage() {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.status === "approved") redirect("/");
  if (actor.status === "suspended") redirect("/suspended");
  return (
    <PublicFrame>
      <div className="stack">
        <div>
          <p className="eyebrow">Hold on</p>
          <h1>An admin still has to open the door.</h1>
          <p className="lede">You can fill in the pickup details now. The wall stays closed until you're approved.</p>
        </div>
        <ShedForm action={profileAction}>
          <MemberFields values={actor} />
          <Submit>Save profile</Submit>
        </ShedForm>
        <form action={logoutAction}>
          <button className="button quiet">Sign out</button>
        </form>
      </div>
    </PublicFrame>
  );
}
