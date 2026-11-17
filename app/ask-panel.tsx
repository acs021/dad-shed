import { connection } from "next/server";
import { askForGear } from "./actions";
import { listAsks } from "@/lib/catalog";

export async function AskPanel({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const { error } = await searchParams;
  const asks = listAsks();

  return (
    <div className="flex flex-col gap-5">
      <form action={askForGear} className="flex flex-col gap-3">
        <label htmlFor="need" className="text-sm font-medium">
          What do you need?
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="need"
            name="need"
            maxLength={140}
            placeholder="Hedge trimmer, car jack, folding chairs"
            className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2 text-base outline-none ring-cedar focus:ring-2"
          />
          <button
            type="submit"
            className="rounded-lg bg-cedar px-4 py-2 text-base font-medium text-card"
          >
            Ask the shed
          </button>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-cedar">
            {error}
          </p>
        ) : null}
      </form>
      <div>
        <h3 className="font-display text-lg text-foreground">Recent asks</h3>
        {asks.length === 0 ? (
          <p className="mt-2 text-sm text-foreground/70">
            Nothing yet. If the shelf does not have it, ask the group.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {asks.map((ask) => (
              <li
                key={ask.id}
                className="rounded-lg border border-line bg-card px-3 py-2 text-sm"
              >
                {ask.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
