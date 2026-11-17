import { MemberFields } from "@/components/fields";
import { ShedForm, Submit } from "@/components/forms";
import { logoutAction, profileAction } from "@/server/actions";
import { privatePage } from "@/server/chrome";

export default function AccountPage() {
  return privatePage(async (ctx) => {
    return (
      <div className="stack">
        <div>
          <p className="eyebrow">You</p>
          <h1>{ctx.actor.name}</h1>
          <p className="muted">Gate codes stay off the wall until you approve a borrow.</p>
        </div>
        <ShedForm action={profileAction}>
          <MemberFields values={ctx.actor} />
          <Submit>Save</Submit>
        </ShedForm>
        <p>
          <a href="/rules">House rules</a>
        </p>
        <form action={logoutAction}>
          <button className="button quiet">Sign out</button>
        </form>
      </div>
    );
  });
}
