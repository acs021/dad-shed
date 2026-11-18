import { notFound } from "next/navigation";
import { ShedForm, Submit } from "@/components/forms";
import { askStatusAction, replyAction } from "@/server/actions";
import { privatePage } from "@/server/chrome";
import { ShedError } from "@/server/errors";
import { askPage } from "@/server/queries";

export default async function AskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return privatePage(async (ctx) => {
    try {
      const page = await askPage(ctx.actor, id);
      return (
        <div className="stack">
          <div>
            <p className="eyebrow">{page.ask.status}</p>
            <h1>{page.ask.title}</h1>
            <p className="muted">
              {page.ask.author_name}
              {page.ask.categoryLabel ? ` · ${page.ask.categoryLabel}` : ""}
            </p>
          </div>
          {page.ask.details ? <p>{page.ask.details}</p> : null}
          {page.replies.map((reply) => (
            <article className="card" key={reply.id}>
              <strong>{reply.author_name}</strong>
              <p>{reply.body}</p>
              {reply.offer_id ? <p><a href={`/inventory/${reply.offer_id}`}>Offered: {reply.offer_title}</a></p> : null}
            </article>
          ))}
          {page.ask.status === "open" ? (
            <ShedForm action={replyAction}>
              <input type="hidden" name="ask_id" value={page.ask.id} />
              <label>
                Reply
                <textarea name="body" required maxLength={1000} />
              </label>
              {page.mine.length > 0 ? (
                <label>
                  Offer something of yours
                  <select name="offer_item_id" defaultValue="">
                    <option value="">No offer</option>
                    {page.mine.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <Submit>Reply</Submit>
            </ShedForm>
          ) : null}
          {page.ask.youWrote || ctx.actor.role === "admin" ? (
            <ShedForm action={askStatusAction} className="actions">
              <input type="hidden" name="ask_id" value={page.ask.id} />
              {page.ask.status !== "fulfilled" ? <Submit name="status" value="fulfilled" variant="quiet">Mark found</Submit> : null}
              {page.ask.status !== "closed" ? <Submit name="status" value="closed" variant="quiet">Close</Submit> : null}
              {page.ask.status !== "open" ? <Submit name="status" value="open" variant="quiet">Reopen</Submit> : null}
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
