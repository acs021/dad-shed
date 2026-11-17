import { borrowStatusLabel } from "@/lib/present";
import { humanDate, mapsDirections, telHref } from "@/lib/text";
import { BorrowActions, Status } from "@/components/bits";
import { privatePage } from "@/server/chrome";
import { borrowsFor } from "@/server/queries";

export default function BorrowsPage() {
  return privatePage(async (ctx) => {
    const data = await borrowsFor(ctx.actor);
    const mine = data.loans.filter((loan) => loan.yours);
    const theirs = data.loans.filter((loan) => !loan.yours);
    return (
      <div className="stack">
        <div>
          <p className="eyebrow">Loans</p>
          <h1>Out and back</h1>
        </div>
        <LoanList title="In your hands" loans={mine} today={data.today} empty="You're not borrowing anything." />
        <LoanList title="From your wall" loans={theirs} today={data.today} empty="Nobody has your stuff right now." />
      </div>
    );
  });
}

function LoanList({
  title,
  loans,
  today,
  empty,
}: {
  title: string;
  today: string;
  empty: string;
  loans: Awaited<ReturnType<typeof borrowsFor>>["loans"];
}) {
  return (
    <section className="section">
      <h2>{title}</h2>
      {loans.length === 0 ? <p className="muted">{empty}</p> : null}
      {loans.map((loan) => (
        <article className="card stack tight" key={loan.id}>
          <div className="row">
            <a href={`/inventory/${loan.itemId}`}>
              <strong>{loan.title}</strong>
            </a>
            <Status label={borrowStatusLabel(loan.status, loan.overdue)} tone={loan.overdue ? "warn" : "muted"} />
          </div>
          <p className="muted">
            {loan.yours ? loan.ownerName : loan.borrowerName} · due {humanDate(loan.dueOn, today)}
          </p>
          {loan.message ? <p>{loan.message}</p> : null}
          {loan.borrowerPhone ? (
            <p>{telHref(loan.borrowerPhone) ? <a href={telHref(loan.borrowerPhone)!}>{loan.borrowerPhone}</a> : loan.borrowerPhone}</p>
          ) : null}
          {loan.address ? (
            <p>
              {loan.address}
              {loan.pickup ? ` — ${loan.pickup}` : ""}{" "}
              <a href={mapsDirections(loan.address)} target="_blank" rel="noopener noreferrer">
                Directions
              </a>
            </p>
          ) : null}
          <BorrowActions id={loan.id} actions={loan.actions} next="/borrows" />
        </article>
      ))}
    </section>
  );
}
