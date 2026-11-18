import { redirect } from "next/navigation";
import { PublicFrame } from "@/components/shell";
import { Wall } from "@/components/wall";
import { getActor } from "@/server/current";
import { privatePage } from "@/server/chrome";
import { homeFor, publicStats, shedGate } from "@/server/queries";
import { humanDate } from "@/lib/text";
import { CATEGORIES } from "@/lib/constants";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; free?: string }>;
}) {
  const gate = await shedGate();
  if (!gate.group) redirect("/setup");
  const actor = await getActor();
  if (!actor) {
    const stats = await publicStats(gate.group.id);
    return (
      <PublicFrame demo={gate.demo}>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">{gate.group.name}</p>
            <h1>Borrow it from someone on the block.</h1>
            <p className="lede">A private lend library for neighbors. Tools, tents, chairs, the pressure washer.</p>
            <div className="actions">
              <a className="button" href="/join">
                I have an invite
              </a>
              <a className="button quiet" href="/login">
                Sign in
              </a>
            </div>
          </div>
          <aside className="hero-panel">
            <p className="stat">
              <strong>{stats.items}</strong>
              <span>on the wall</span>
            </p>
            <p className="stat">
              <strong>{stats.members}</strong>
              <span>neighbors in</span>
            </p>
            <p className="muted">Look first. Ask if it isn’t listed. Pickup notes stay hidden until the owner says yes.</p>
          </aside>
          <ol className="rail">
            <li>
              <span>Look</span>
              Browse the wall. If it isn’t there, post an ask.
            </li>
            <li>
              <span>Ask</span>
              The owner says yes. Then you get the address and gate notes.
            </li>
            <li>
              <span>Take it</span>
              Check it out, use it, bring it back. The owner confirms it’s home.
            </li>
          </ol>
        </section>
      </PublicFrame>
    );
  }
  if (actor.status !== "approved") redirect(actor.status === "pending" ? "/waiting" : "/suspended");
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 80);
  const category = CATEGORIES.some((entry) => entry.id === params.category) ? params.category! : "";
  const onlyFree = params.free === "1";
  return privatePage(async ({ today }) => {
    const home = await homeFor(actor);
    const notices =
      home.waitingOnYou.length + home.overdue.length === 0 ? null : (
        <section className="pulse">
          {home.overdue.map((loan) => (
            <a className="pulse-item warn" key={`${loan.itemId}-overdue`} href={`/inventory/${loan.itemId}`}>
              <p className="eyebrow">Overdue</p>
              <strong>{loan.title}</strong>
              <p className="muted">
                With {loan.borrowerName}. Due {humanDate(loan.dueOn, today)}.
              </p>
            </a>
          ))}
          {home.waitingOnYou.map((loan) => (
            <a className="pulse-item" key={loan.itemId + loan.borrowerId} href={`/inventory/${loan.itemId}`}>
              <p className="eyebrow">Waiting on you</p>
              <strong>{loan.title}</strong>
              <p className="muted">{loan.borrowerName} asked to borrow it.</p>
            </a>
          ))}
        </section>
      );
    return <Wall actor={actor} q={q} category={category} onlyFree={onlyFree} notices={notices} />;
  });
}
