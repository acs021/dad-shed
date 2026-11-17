import { redirect } from "next/navigation";
import { PublicFrame } from "@/components/shell";
import { MemberFields } from "@/components/fields";
import { ShedForm, Submit } from "@/components/forms";
import { joinAction } from "@/server/actions";
import { shedGate } from "@/server/queries";

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const gate = await shedGate();
  if (!gate.group) redirect("/setup");
  const params = await searchParams;
  return (
    <PublicFrame demo={gate.demo}>
      <div className="stack">
        <div>
          <p className="eyebrow">{gate.group.name}</p>
          <h1>Ask to come in</h1>
          <p className="lede">An admin still has to approve you. Your street address stays off the wall until a borrow is a yes.</p>
        </div>
        <details className="card">
          <summary>House rules</summary>
          <p className="prose">{gate.group.rules}</p>
        </details>
        <ShedForm action={joinAction}>
          <div className="hp" aria-hidden="true">
            <label>
              Company
              <input name="company" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <label>
            Invite code
            <input name="code" required defaultValue={params.code ?? ""} autoCapitalize="characters" />
          </label>
          <MemberFields />
          <label>
            Password
            <input name="password" type="password" required minLength={10} autoComplete="new-password" />
          </label>
          <label className="check">
            <input type="checkbox" name="accept_rules" required />
            I'll follow the house rules
          </label>
          <Submit>Request a spot</Submit>
        </ShedForm>
      </div>
    </PublicFrame>
  );
}
