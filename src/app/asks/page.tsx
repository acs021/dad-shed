import { privatePage } from "@/server/chrome";
import { asksFor } from "@/server/queries";

export default function AsksPage() {
  return privatePage(async (ctx) => {
    const asks = await asksFor(ctx.actor);
    return (
      <div className="stack">
        <div className="row">
          <div>
            <p className="eyebrow">Asks</p>
            <h1>If the wall missed it</h1>
            <p className="lede">Look first. If nobody listed it, the block still might have one in a garage.</p>
          </div>
          <a className="button" href="/asks/new">
            New ask
          </a>
        </div>
        {asks.length === 0 ? <p className="muted">Nobody's hunting for anything right now.</p> : null}
        {asks.map((ask) => (
          <a className="card" key={ask.id} href={`/asks/${ask.id}`}>
            <div className="row">
              <strong>{ask.title}</strong>
              <span className="pill">{ask.status}</span>
            </div>
            <p className="muted">
              {ask.author_name}
              {ask.categoryLabel ? ` · ${ask.categoryLabel}` : ""} · {ask.replies} replies
            </p>
          </a>
        ))}
      </div>
    );
  });
}
