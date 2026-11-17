import { redirect } from "next/navigation";
import { PublicFrame } from "@/components/shell";
import { MemberFields } from "@/components/fields";
import { ShedForm, Submit } from "@/components/forms";
import { DEFAULT_RULES, DEFAULT_TAGLINE, TIMEZONES } from "@/lib/constants";
import { setupAction } from "@/server/actions";
import { shedGate } from "@/server/queries";

export default async function SetupPage() {
  const gate = await shedGate();
  if (gate.group) redirect("/");
  return (
    <PublicFrame>
      <div className="stack">
        <div>
          <p className="eyebrow">First door</p>
          <h1>Open a shed for your block</h1>
          <p className="lede">You become the first admin. After this, people get in only with an invite you approve.</p>
        </div>
        <ShedForm action={setupAction}>
          <div className="hp" aria-hidden="true">
            <label>
              Company
              <input name="company" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <label>
            Shed name
            <input name="shed_name" required maxLength={80} defaultValue="Dad Shed" />
          </label>
          <label>
            Tagline
            <input name="tagline" maxLength={140} defaultValue={DEFAULT_TAGLINE} />
          </label>
          <label>
            Timezone
            <select name="timezone" defaultValue="America/New_York">
              {TIMEZONES.map((zone) => (
                <option key={zone}>{zone}</option>
              ))}
            </select>
          </label>
          <label>
            Rules
            <textarea name="rules" required maxLength={4000} defaultValue={DEFAULT_RULES} />
          </label>
          <MemberFields />
          <label>
            Password
            <input name="password" type="password" required minLength={10} autoComplete="new-password" />
          </label>
          <label className="check">
            <input type="checkbox" name="accept_rules" required />
            These are the rules I'll hold the shed to
          </label>
          <Submit>Open the shed</Submit>
        </ShedForm>
      </div>
    </PublicFrame>
  );
}
