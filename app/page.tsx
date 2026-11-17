import { Suspense } from "react";
import { AskPanel } from "./ask-panel";
import { shelf } from "@/lib/catalog";

export default function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-5 py-10">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium tracking-wide text-cedar uppercase">
          Cedar Lane
        </p>
        <h1 className="font-display text-5xl leading-none text-foreground">
          Dad Shed
        </h1>
        <p className="max-w-xl text-lg text-foreground/80">
          A shelf neighbors can borrow from, instead of buying another drill.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-2xl">On the shelf</h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {shelf.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-xl border border-line bg-card p-4"
            >
              <p className="text-xs font-medium tracking-wide text-cedar uppercase">
                {item.category}
              </p>
              <h3 className="font-display text-xl">{item.name}</h3>
              <p className="text-sm text-foreground/75">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-line bg-card/60 p-5">
        <h2 className="font-display text-2xl">Ask the shed</h2>
        <p className="mt-1 mb-5 text-sm text-foreground/75">
          This starter keeps asks in memory. They disappear when the app
          restarts. Accounts and a real shared list come later.
        </p>
        <Suspense fallback={<p className="text-sm">Loading asks…</p>}>
          <AskPanel searchParams={searchParams} />
        </Suspense>
      </section>
    </main>
  );
}
