import { connection } from "next/server";
import { addAsk, listAsks } from "@/lib/catalog";

export async function GET() {
  await connection();
  return Response.json({ asks: listAsks() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Send a short note about what you need." },
      { status: 400 },
    );
  }

  const text =
    typeof body === "object" && body !== null && "text" in body
      ? String((body as { text: unknown }).text)
      : "";

  try {
    const ask = addAsk(text);
    return Response.json({ ask }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save that.";
    return Response.json({ error: message }, { status: 400 });
  }
}
