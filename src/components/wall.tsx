import { CATEGORIES } from "@/lib/constants";
import { EmptyState, GearCard, PageHead } from "@/components/gear";
import { browseItems } from "@/server/queries";
import type { Actor } from "@/server/domain";

export async function Wall({
  actor,
  q,
  category,
  onlyFree,
  notices,
}: {
  actor: Actor;
  q: string;
  category: string;
  onlyFree: boolean;
  notices?: React.ReactNode;
}) {
  const data = await browseItems(actor, { q, category, onlyFree });
  const wallHref = (next: { q?: string; category?: string; free?: boolean }) => {
    const params = new URLSearchParams();
    const nextQ = next.q ?? q;
    const nextCategory = next.category ?? category;
    const nextFree = next.free ?? onlyFree;
    if (nextQ) params.set("q", nextQ);
    if (nextCategory) params.set("category", nextCategory);
    if (nextFree) params.set("free", "1");
    const query = params.toString();
    return query ? `/?${query}` : "/";
  };
  return (
    <div className="stack">
      <PageHead
        kicker="The wall"
        title="Look here first"
        lede="Search the shed. If it isn’t hanging, ask the block before anyone buys another one."
        action={
          <div className="actions">
            <a className="button" href="/inventory/new">
              Hang something
            </a>
            <a className="button quiet" href={`/asks/new?title=${encodeURIComponent(q)}`}>
              Ask the shed
            </a>
          </div>
        }
      />
      {notices}
      <form className="search" action="/" method="get">
        {category ? <input type="hidden" name="category" value={category} /> : null}
        {onlyFree ? <input type="hidden" name="free" value="1" /> : null}
        <label>
          Search
          <input name="q" defaultValue={q} placeholder="Ladder, tent, Priya…" />
        </label>
        <button className="button">Search</button>
      </form>
      <div className="chips">
        <a className={category ? "chip" : "chip on"} href={wallHref({ category: "" })}>
          All
        </a>
        {CATEGORIES.map((entry) => (
          <a
            key={entry.id}
            className={category === entry.id ? "chip on" : "chip"}
            href={wallHref({ category: entry.id })}
          >
            {entry.label}
          </a>
        ))}
        <a className={onlyFree ? "chip on" : "chip"} href={wallHref({ free: !onlyFree })}>
          Free now
        </a>
      </div>
      {data.cards.length === 0 ? (
        <EmptyState
          title="Nothing on the wall for that."
          body="Ask the shed. Someone may have it and just hasn’t listed it."
          action={
            <a className="button" href={`/asks/new?title=${encodeURIComponent(q)}`}>
              Ask the shed
            </a>
          }
        />
      ) : (
        <div className="cards wall">
          {data.cards.map((card, index) => (
            <GearCard
              key={card.id}
              href={`/inventory/${card.id}`}
              title={card.title}
              category={card.category}
              ownerName={card.ownerName}
              city={card.city}
              photo={card.photo}
              availability={card.availability}
              note={card.youOwn && card.requestCount > 0 ? `${card.requestCount} waiting on you` : undefined}
              index={index}
            />
          ))}
        </div>
      )}
      <p className="ask-strip">
        Don’t see it?{" "}
        <a href={`/asks/new?title=${encodeURIComponent(q)}`}>Ask the shed</a>
        {q ? ` for “${q}”.` : "."}
      </p>
    </div>
  );
}
