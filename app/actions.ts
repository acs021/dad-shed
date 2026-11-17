"use server";

import { redirect } from "next/navigation";
import { addAsk } from "@/lib/catalog";

export async function askForGear(formData: FormData) {
  const text = String(formData.get("need") ?? "");
  try {
    addAsk(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save that.";
    redirect(`/?error=${encodeURIComponent(message)}`);
  }
  redirect("/");
}
