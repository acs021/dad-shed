import { privatePage } from "@/server/chrome";
import { membersFor } from "@/server/queries";

export default function MembersPage() {
  return privatePage(async (ctx) => {
    const members = await membersFor(ctx.actor);
    return (
      <div className="stack">
        <div>
          <p className="eyebrow">The block</p>
          <h1>Who's in</h1>
          <p className="muted">Phone numbers and street addresses show up when a borrow is approved, not on this list.</p>
        </div>
        <div className="cards two">
          {members.map((member) => (
            <a className="card" key={member.id} href={`/members/${member.id}`}>
              <strong>{member.name}</strong>
              <p className="muted">
                {member.household ? `${member.household} · ` : ""}
                {member.city}
                {member.role === "admin" ? " · admin" : ""}
              </p>
              {member.bio ? <p>{member.bio}</p> : null}
            </a>
          ))}
        </div>
      </div>
    );
  });
}
