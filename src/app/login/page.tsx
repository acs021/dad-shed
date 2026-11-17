import { redirect } from "next/navigation";
import { PublicFrame } from "@/components/shell";
import { ShedForm, Submit } from "@/components/forms";
import { loginAction } from "@/server/actions";
import { getActor } from "@/server/current";
import { shedGate } from "@/server/queries";
import { DEMO_PASSWORD } from "@/server/seed";

export default async function LoginPage() {
  const gate = await shedGate();
  if (!gate.group) redirect("/setup");
  const actor = await getActor();
  if (actor?.status === "approved") redirect("/");
  return (
    <PublicFrame demo={gate.demo}>
      <div className="stack">
        <h1>Sign in</h1>
        <ShedForm action={loginAction}>
          <label>
            Email
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <Submit>Sign in</Submit>
        </ShedForm>
        {gate.demo ? (
          <aside className="card stack tight">
            <p className="eyebrow">Sample logins</p>
            <p>sam@cedar.example is the admin. Also maria, chris, priya, ben, and jordan @cedar.example.</p>
            <p>
              Password <strong>{DEMO_PASSWORD}</strong>
            </p>
            <p>
              Invite code <strong>{gate.inviteCode}</strong>
            </p>
          </aside>
        ) : null}
        <p>
          New here? <a href="/join">Use an invite</a>
        </p>
      </div>
    </PublicFrame>
  );
}
