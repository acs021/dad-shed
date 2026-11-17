import { CATEGORIES } from "@/lib/constants";
import { Status } from "@/components/bits";
import { privatePage } from "@/server/chrome";
import { browseItems } from "@/server/queries";

const TINTS = ["#1c3b30", "#3d6b35", "#8a4630", "#24556b", "#6b4b2a", "#5c3d55", "#3e4a62", "#6a5340"];

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; free?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 80);
  const category = CATEGORIES.some((entry) => entry.id === params.category) ? params.category! : "";
  return privatePage(async (ctx) => {
    const data = await browseItems(ctx.actor, { q, category, onlyFree: params.free === "1" });
    return (
      <div className="stack">
        <div className="row">
          <div>
            <p className="eyebrow">The wall</p>
            <h1>What's around</h1>
          </div>
          <a className="button" href="/inventory/new">
            Add something
          </a>
        </div>
        <form className="search" action="/inventory" method="get">
          {category ? <input type="hidden" name="category" value={category} /> : null}
          <label>
            Search
            <input name="q" defaultValue={q} placeholder="Ladder, tent, Priya…" />
          </label>
          <button className="button">Search</button>
        </form>
        <div className="chips">
          <a className={category ? "chip" : "chip on"} href={`/inventory?q=${encodeURIComponent(q)}`}>
            All
          </a>
          {CATEGORIES.map((entry) => (
            <a
              key={entry.id}
              className={category === entry.id ? "chip on" : "chip"}
              href={`/inventory?category=${entry.id}&q=${encodeURIComponent(q)}`}
            >
              {entry.label}
            </a>
          ))}
        </div>
        {data.cards.length === 0 ? (
          <div className="empty">
            <h2>Nothing on the wall for that.</h2>
            <p className="muted">Ask the shed. Someone may have it and just hasn't listed it.</p>
            <a className="button" href={`/asks/new?title=${encodeURIComponent(q)}`}>
              Ask the shed
            </a>
          </div>
        ) : (
          <div className="cards wall">
            {data.cards.map((card, index) => (
              <a className="card item-row" key={card.id} href={`/inventory/${card.id}`}>
                {card.photo ? (
                  <img className="thumb" src={card.photo} alt="" />
                ) : (
                  <span className="monogram" style={{ background: TINTS[index % TINTS.length] }}>
                    {card.title.slice(0, 1)}
                  </span>
                )}
                <span>
                  <span className="eyebrow">{card.category}</span>
                  <strong style={{ display: "block" }}>{card.title}</strong>
                  <span className="muted">
                    {card.ownerName} · {card.city}
                  </span>
                  <span style={{ display: "block", marginTop: 6 }}>
                    <Status label={card.availability.label} tone={card.availability.tone} />
                  </span>
                  {card.youOwn && card.requestCount > 0 ? (
                    <span className="hint">{card.requestCount} waiting on you</span>
                  ) : null}
                </span>
              </a>
            ))}
          </div>
        )}
        <p>
          <a href={`/asks/new?title=${encodeURIComponent(q)}`}>Don't see it? Ask the shed.</a>
        </p>
      </div>
    );
  });
}
