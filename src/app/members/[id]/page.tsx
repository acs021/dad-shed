import { notFound } from "next/navigation";
import { privatePage } from "@/server/chrome";
import { ShedError } from "@/server/errors";
import { memberPage } from "@/server/queries";
import { telHref } from "@/lib/text";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return privatePage(async (ctx) => {
    try {
      const page = await memberPage(ctx.actor, id);
      return (
        <div className="stack">
          <div>
            <p className="eyebrow">{page.member.role === "admin" ? "Admin" : page.member.city}</p>
            <h1>{page.member.name}</h1>
            {page.member.household ? <p className="muted">{page.member.household}</p> : null}
          </div>
          {page.member.bio ? <p>{page.member.bio}</p> : null}
          {page.member.address ? (
            <section className="card">
              <p>{page.member.address}</p>
              {page.member.phone ? (
                <p>{telHref(page.member.phone) ? <a href={telHref(page.member.phone)!}>{page.member.phone}</a> : page.member.phone}</p>
              ) : null}
              {page.member.email ? <p>{page.member.email}</p> : null}
              <p className="hint">Visible to you because you're an admin, or this is you.</p>
            </section>
          ) : (
            <p className="muted">Contact details show up once a borrow with {page.member.name.split(" ")[0]} is approved.</p>
          )}
          <section className="section">
            <h2>On their wall</h2>
            {page.items.length === 0 ? <p className="muted">Nothing listed.</p> : null}
            {page.items.map((item) => (
              <a className="card" key={item.id} href={`/inventory/${item.id}`}>
                <span className="eyebrow">{item.categoryLabel}</span>
                <strong style={{ display: "block" }}>{item.title}</strong>
              </a>
            ))}
          </section>
        </div>
      );
    } catch (error) {
      if (error instanceof ShedError) notFound();
      throw error;
    }
  });
}
