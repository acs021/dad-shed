import { redirect } from "next/navigation";
import { PublicFrame } from "@/components/shell";
import { Status } from "@/components/bits";
import { getActor } from "@/server/current";
import { privatePage } from "@/server/chrome";
import { homeFor, publicStats, shedGate } from "@/server/queries";
import { humanDate } from "@/lib/text";
import { borrowStatusLabel } from "@/lib/present";

export default async function HomePage() {
  const gate = await shedGate();
  if (!gate.group) redirect("/setup");
  const actor = await getActor();
  if (!actor) {
    const stats = await publicStats(gate.group.id);
    return (
      <PublicFrame demo={gate.demo}>
        <section className="hero">
          <p className="eyebrow">{gate.group.name}</p>
          <h1>The good stuff, already on the block.</h1>
          <p className="lede">
            {gate.group.tagline || "A private lend library for neighbors. Tools, tents, chairs, the pressure washer."}
          </p>
          <p className="muted">
            {stats.members} neighbors · {stats.items} things on the wall. The gear stays off this page until you're in.
          </p>
          <div className="actions">
            <a className="button" href="/join">
              I have an invite
            </a>
            <a className="button quiet" href="/login">
              Sign in
            </a>
          </div>
          <div className="steps">
            <article className="step">
              <strong>1. An admin lets you in</strong>
              <p className="muted">Invite code first. Then someone already in the shed approves you.</p>
            </article>
            <article className="step">
              <strong>2. List what you'll lend</strong>
              <p className="muted">A name, a photo, and a link if someone should read up before they borrow it.</p>
            </article>
            <article className="step">
              <strong>3. Ask, then pick it up</strong>
              <p className="muted">The owner says yes. Directions and gate notes show up after that.</p>
            </article>
            <article className="step">
              <strong>4. Bring it back</strong>
              <p className="muted">Check it out, check it in, and the owner confirms it's home.</p>
            </article>
          </div>
        </section>
      </PublicFrame>
    );
  }
  if (actor.status !== "approved") redirect(actor.status === "pending" ? "/waiting" : "/suspended");
  return privatePage(async ({ today }) => {
    const home = await homeFor(actor);
    return (
      <div className="stack">
        <div>
          <p className="eyebrow">Good to see you</p>
          <h1>{actor.name.split(" ")[0]}</h1>
        </div>
        {home.overdue.map((loan) => (
          <p className="banner warn" key={`${loan.itemId}-overdue`}>
            {loan.title} is overdue with {loan.borrowerName}. Due {humanDate(loan.dueOn, today)}.
          </p>
        ))}
        <section className="section">
          <h2>Waiting on you</h2>
          {home.waitingOnYou.length === 0 ? <p className="muted">No borrow requests.</p> : null}
          {home.waitingOnYou.map((loan) => (
            <a className="card" key={loan.itemId + loan.borrowerId} href={`/inventory/${loan.itemId}`}>
              <strong>{loan.borrowerName}</strong> wants {loan.title}
            </a>
          ))}
        </section>
        <section className="section">
          <div className="row">
            <h2>In motion</h2>
            <a href="/borrows">All loans</a>
          </div>
          {home.borrowing.length + home.lending.length === 0 ? <p className="muted">Nothing checked out.</p> : null}
          {[...home.borrowing, ...home.lending].map((loan) => (
            <a className="card" key={loan.itemId + loan.status + loan.borrowerId} href={`/inventory/${loan.itemId}`}>
              <div className="row">
                <strong>{loan.title}</strong>
                <Status
                  label={borrowStatusLabel(loan.status, loan.dueOn < today && (loan.status === "checked_out" || loan.status === "return_pending"))}
                  tone={loan.dueOn < today && loan.status === "checked_out" ? "warn" : "muted"}
                />
              </div>
              <p className="muted">
                {loan.borrowerId === actor.id ? `From ${loan.ownerName}` : `With ${loan.borrowerName}`} · due {humanDate(loan.dueOn, today)}
              </p>
            </a>
          ))}
        </section>
        <section className="section">
          <div className="row">
            <h2>Anyone got one?</h2>
            <a href="/asks">The board</a>
          </div>
          {home.asks.length === 0 ? <p className="muted">No open asks.</p> : null}
          {home.asks.map((ask) => (
            <a className="card" key={ask.id} href={`/asks/${ask.id}`}>
              <strong>{ask.title}</strong>
              <p className="muted">{ask.author_name}</p>
            </a>
          ))}
        </section>
        <section className="section">
          <div className="row">
            <h2>On the wall</h2>
            <a href="/inventory">Browse</a>
          </div>
          <div className="cards two">
            {home.recent.map((item) => (
              <a className="card" key={item.id} href={`/inventory/${item.id}`}>
                <p className="eyebrow">{item.categoryLabel}</p>
                <strong>{item.title}</strong>
                <p className="muted">{item.owner_name}</p>
              </a>
            ))}
          </div>
        </section>
      </div>
    );
  });
}
