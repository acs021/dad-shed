import { redirect } from "next/navigation";
import { TIMEZONES } from "@/lib/constants";
import { CopyCode, ShedForm, Submit } from "@/components/forms";
import { groupAction, inviteAction, reviewAction, revokeInviteAction } from "@/server/actions";
import { privatePage } from "@/server/chrome";
import { ShedError } from "@/server/errors";
import { adminFor } from "@/server/queries";

export default function AdminPage() {
  return privatePage(async (ctx) => {
    if (ctx.actor.role !== "admin") redirect("/");
    try {
      const data = await adminFor(ctx.actor);
      const pending = data.members.filter((member) => member.status === "pending");
      return (
        <div className="stack">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>{data.group.name}</h1>
            <p className="lede">Invites get people to the door. You still approve each one.</p>
          </div>
          <section className="section">
            <h2>Waiting</h2>
            {pending.length === 0 ? <p className="muted">Nobody's waiting.</p> : null}
            {pending.map((member) => (
              <article className="card stack tight" key={member.id}>
                <strong>{member.name}</strong>
                <p className="muted">
                  {member.email} · {member.phone} · {member.address_line}, {member.city}
                </p>
                <ShedForm action={reviewAction} className="actions">
                  <input type="hidden" name="id" value={member.id} />
                  <Submit name="decision" value="approve">Approve</Submit>
                  <Submit name="decision" value="suspend" variant="danger">Decline</Submit>
                </ShedForm>
              </article>
            ))}
          </section>
          <section className="section">
            <h2>Invite</h2>
            <ShedForm action={inviteAction}>
              <label>
                Note
                <input name="note" maxLength={140} placeholder="For the group text" />
              </label>
              <div className="split">
                <label>
                  Uses
                  <input name="max_uses" type="number" min={1} max={100} defaultValue={1} />
                </label>
                <label>
                  Days until it expires
                  <input name="days" type="number" min={1} max={365} defaultValue={30} />
                </label>
                <label>
                  Lock to email
                  <input name="email" type="email" placeholder="Optional" />
                </label>
              </div>
              <Submit>Create invite</Submit>
            </ShedForm>
            {data.invites.map((invite) => (
              <article className="card row" key={invite.id}>
                <div>
                  <strong>{invite.code}</strong>
                  <p className="muted">
                    {invite.use_count}/{invite.max_uses} used
                    {invite.email ? ` · ${invite.email}` : ""}
                    {invite.note ? ` · ${invite.note}` : ""}
                    {invite.revoked_at ? " · revoked" : ""}
                  </p>
                </div>
                <div className="actions">
                  <CopyCode code={invite.code} />
                  {invite.revoked_at ? null : (
                    <ShedForm action={revokeInviteAction}>
                      <input type="hidden" name="id" value={invite.id} />
                      <Submit variant="quiet">Revoke</Submit>
                    </ShedForm>
                  )}
                </div>
              </article>
            ))}
          </section>
          <section className="section">
            <h2>People</h2>
            {data.members
              .filter((member) => member.status !== "pending")
              .map((member) => (
                <article className="card row" key={member.id}>
                  <div>
                    <strong>{member.name}</strong>
                    <p className="muted">
                      {member.role} · {member.status} · {member.city}
                    </p>
                  </div>
                  {member.id !== ctx.actor.id ? (
                    <ShedForm action={reviewAction}>
                      <input type="hidden" name="id" value={member.id} />
                      <Submit name="decision" value={member.status === "approved" ? "suspend" : "reinstate"} variant="quiet">
                        {member.status === "approved" ? "Pause" : "Let back in"}
                      </Submit>
                    </ShedForm>
                  ) : null}
                </article>
              ))}
          </section>
          <section className="section">
            <h2>Shed</h2>
            <ShedForm action={groupAction}>
              <label>
                Name
                <input name="shed_name" required maxLength={80} defaultValue={data.group.name} />
              </label>
              <label>
                Tagline
                <input name="tagline" maxLength={140} defaultValue={data.group.tagline} />
              </label>
              <label>
                Timezone
                <select name="timezone" defaultValue={data.group.timezone}>
                  {TIMEZONES.map((zone) => (
                    <option key={zone}>{zone}</option>
                  ))}
                </select>
              </label>
              <label>
                Rules
                <textarea name="rules" required maxLength={4000} defaultValue={data.group.rules} />
              </label>
              <Submit>Save shed</Submit>
            </ShedForm>
          </section>
        </div>
      );
    } catch (error) {
      if (error instanceof ShedError) redirect("/");
      throw error;
    }
  });
}
