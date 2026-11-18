import { notFound } from "next/navigation";
import { conditionLabel } from "@/lib/constants";
import { borrowStatusLabel } from "@/lib/present";
import { humanDate, mapsDirections, researchLinks, telHref } from "@/lib/text";
import { BorrowActions, Status } from "@/components/bits";
import { ShedForm, Submit } from "@/components/forms";
import { listingAction, requestBorrowAction } from "@/server/actions";
import { privatePage } from "@/server/chrome";
import { ShedError } from "@/server/errors";
import { getItemPage } from "@/server/queries";

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return privatePage(async (ctx) => {
    try {
      const page = await getItemPage(ctx.actor, id);
      const lookups = researchLinks(page.item.title);
      const viewerLoan = page.open.find((borrow) => borrow.borrowerId === ctx.actor.id);
      const canRequest =
        !page.item.youOwn &&
        page.item.listing === "available" &&
        page.slotsFree > 0 &&
        !viewerLoan;
      return (
        <div className="stack">
          {page.item.photo ? <img className="hero-photo" src={page.item.photo} alt="" /> : null}
          <div>
            <p className="eyebrow">{page.item.categoryLabel}</p>
            <h1>{page.item.title}</h1>
            <p className="muted">
              {page.owner.name}
              {page.owner.household ? ` · ${page.owner.household}` : ""} · {page.owner.city}
            </p>
            <p>
              <Status label={page.availability.label} tone={page.availability.tone} />{" "}
              <span className="pill">{conditionLabel(page.item.condition)}</span>
              {page.item.consumable ? <span className="pill">Replace what you use</span> : null}
            </p>
          </div>
          {page.item.description ? <p>{page.item.description}</p> : null}
          {page.item.safetyNotes ? <p className="banner warn">{page.item.safetyNotes}</p> : null}
          {page.item.replacementNote ? <p className="muted">If it breaks: {page.item.replacementNote}</p> : null}
          <p className="muted">
            Up to {page.item.maxDays} days. {page.item.needsApproval ? "The owner approves each borrow." : "A request reserves it immediately."}{" "}
            {page.slotsFree} of {page.item.quantity} free.
          </p>
          {page.open.length > 0 ? (
            <section className="stack">
              <h2>Who has it</h2>
              {page.open.map((borrow) => (
                <article className="card stack tight" key={borrow.id}>
                  <div className="row">
                    <strong>{borrow.borrowerName}</strong>
                    <Status label={borrowStatusLabel(borrow.status, borrow.overdue)} tone={borrow.overdue ? "warn" : "muted"} />
                  </div>
                  <p className="muted">
                    {humanDate(borrow.startOn, page.today)} → {humanDate(borrow.dueOn, page.today)}
                  </p>
                  {borrow.message ? <p>{borrow.message}</p> : null}
                  {borrow.borrowerPhone ? <p>{borrow.borrowerPhone}</p> : null}
                  <BorrowActions id={borrow.id} actions={borrow.actions} next={`/inventory/${page.item.id}`} />
                </article>
              ))}
            </section>
          ) : null}
          {page.owner.address ? (
            <section className="card stack tight">
              <h2>Pickup</h2>
              <p>{page.owner.address}</p>
              {page.owner.pickup ? <p>{page.owner.pickup}</p> : null}
              {page.owner.phone ? (
                <p>
                  {telHref(page.owner.phone) ? <a href={telHref(page.owner.phone)!}>{page.owner.phone}</a> : page.owner.phone}
                </p>
              ) : null}
              <a className="button" href={mapsDirections(page.owner.address)} target="_blank" rel="noopener noreferrer">
                Directions in Google Maps
              </a>
            </section>
          ) : (
            <p className="muted">Street address and gate notes show up after the owner says yes.</p>
          )}
          <section className="stack tight">
            <h2>Read up</h2>
            {page.links.map((link) => (
              <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            ))}
            <div className="actions">
              {lookups.map((link) => (
                <a key={link.label} className="button quiet" href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              ))}
            </div>
          </section>
          {canRequest ? (
            <ShedForm action={requestBorrowAction}>
              <input type="hidden" name="item_id" value={page.item.id} />
              <div className="split">
                <label>
                  From
                  <input type="date" name="start_on" required defaultValue={page.today} />
                </label>
                <label>
                  Back by
                  <input type="date" name="due_on" required />
                </label>
              </div>
              <label>
                Note
                <textarea name="message" maxLength={500} placeholder="What you need it for" />
              </label>
              <Submit>{page.item.needsApproval ? "Ask to borrow" : "Reserve it"}</Submit>
            </ShedForm>
          ) : null}
          {page.item.youOwn ? (
            <a className="button quiet" href={`/inventory/${page.item.id}/edit`}>
              Edit
            </a>
          ) : null}
          {ctx.actor.role === "admin" && !page.item.youOwn ? (
            <ShedForm action={listingAction}>
              <input type="hidden" name="id" value={page.item.id} />
              <input type="hidden" name="listing" value={page.item.listing === "hidden" ? "available" : "hidden"} />
              <Submit variant="quiet">{page.item.listing === "hidden" ? "Put it back on the wall" : "Hide from the wall"}</Submit>
            </ShedForm>
          ) : null}
        </div>
      );
    } catch (error) {
      if (error instanceof ShedError) notFound();
      throw error;
    }
  });
}
