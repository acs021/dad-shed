import { redirect } from "next/navigation";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; free?: string }>;
}) {
  const params = await searchParams;
  const next = new URLSearchParams();
  if (params.q) next.set("q", params.q);
  if (params.category) next.set("category", params.category);
  if (params.free) next.set("free", params.free);
  const query = next.toString();
  redirect(query ? `/?${query}` : "/");
}
