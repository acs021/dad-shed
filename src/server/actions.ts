"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { DEFAULT_RULES, DEFAULT_TAGLINE } from "@/lib/constants";
import { SESSION_COOKIE } from "@/server/current";
import {
  authenticate,
  createAsk,
  createInvite,
  createItem,
  createShed,
  decideBorrow,
  endSession,
  joinWithInvite,
  replyToAsk,
  requestBorrow,
  reviewMember,
  revokeInvite,
  setAskStatus,
  setListing,
  startSession,
  transitionBorrow,
  updateGroup,
  updateItem,
  updateProfile,
  actorFromToken,
} from "@/server/domain";
import type { BorrowAction } from "@/lib/present";
import { ShedError } from "@/server/errors";
import { shedGate } from "@/server/queries";
import {
  block,
  categoryValue,
  dayValue,
  emailAddress,
  groupInput,
  integer,
  inviteCode,
  itemInput,
  line,
  optionalId,
  passwordValue,
  profileInput,
  rejectHoneypot,
} from "@/server/validators";

async function originOk() {
  const headerList = await headers();
  const origin = headerList.get("origin");
  const host = (headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "").split(",")[0]?.trim();
  if (!origin || !host) throw new ShedError("That request could not be verified.");
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ShedError("That request could not be verified.");
  }
  if (originHost !== host) throw new ShedError("That request could not be verified.");
}

async function actor() {
  const jar = await cookies();
  const current = await actorFromToken(jar.get(SESSION_COOKIE)?.value ?? "");
  if (!current) throw new ShedError("Sign in again.");
  return current;
}

async function setSession(memberId: string) {
  const token = await startSession(memberId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

function nextPath(formData: FormData, fallback: string) {
  const next = String(formData.get("next") ?? "");
  if (
    next === "/borrows" ||
    next === "/admin" ||
    next === "/" ||
    next === "/inventory" ||
    /^\/inventory\/[0-9a-f-]{36}$/i.test(next) ||
    /^\/asks\/[0-9a-f-]{36}$/i.test(next)
  ) {
    return next;
  }
  return fallback;
}

function catchError(error: unknown): ActionState {
  if (error instanceof ShedError) return { error: error.message };
  throw error;
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let destination = "/";
  try {
    await originOk();
    const current = await authenticate(emailAddress(formData.get("email")), String(formData.get("password") ?? ""));
    await setSession(current.id);
    destination = current.status === "approved" ? "/" : current.status === "pending" ? "/waiting" : "/suspended";
  } catch (error) {
    return catchError(error);
  }
  redirect(destination);
}

export async function logoutAction() {
  await originOk();
  const jar = await cookies();
  await endSession(jar.get(SESSION_COOKIE)?.value ?? "");
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function setupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await originOk();
    rejectHoneypot(formData);
    const gate = await shedGate();
    if (gate.group) throw new ShedError("This shed already has a founder.");
    if (!formData.has("accept_rules")) throw new ShedError("Read the rules and agree before you open the shed.");
    const profile = profileInput(formData);
    const group = groupInput(formData);
    const founder = await createShed({
      ...profile,
      password: passwordValue(formData.get("password")),
      shedName: group.name,
      tagline: group.tagline || DEFAULT_TAGLINE,
      rules: group.rules || DEFAULT_RULES,
      timezone: group.timezone,
    });
    await setSession(founder.id);
  } catch (error) {
    return catchError(error);
  }
  redirect("/");
}

export async function joinAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await originOk();
    rejectHoneypot(formData);
    if (!formData.has("accept_rules")) throw new ShedError("Read the rules and agree before you join.");
    const member = await joinWithInvite({
      ...profileInput(formData),
      password: passwordValue(formData.get("password")),
      code: inviteCode(formData.get("code")),
    });
    await setSession(member.id);
  } catch (error) {
    return catchError(error);
  }
  redirect("/waiting");
}

export async function profileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await originOk();
    await updateProfile(await actor(), profileInput(formData));
  } catch (error) {
    return catchError(error);
  }
  return { ok: true };
}

export async function groupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await originOk();
    await updateGroup(await actor(), groupInput(formData));
  } catch (error) {
    return catchError(error);
  }
  return { ok: true };
}

export async function inviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await originOk();
    const email = String(formData.get("email") ?? "").trim();
    await createInvite(await actor(), {
      email: email ? emailAddress(email) : "",
      maxUses: integer(formData.get("max_uses") || "1", "Uses", 1, 100),
      note: line(formData.get("note"), "Note", 140, false),
      days: integer(formData.get("days") || "30", "Days", 1, 365),
    });
  } catch (error) {
    return catchError(error);
  }
  redirect("/admin");
}

export async function revokeInviteAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await originOk();
    await revokeInvite(await actor(), optionalId(formData.get("id")));
  } catch (error) {
    return catchError(error);
  }
  redirect("/admin");
}

export async function reviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await originOk();
    const decision = String(formData.get("decision") ?? "");
    if (decision !== "approve" && decision !== "suspend" && decision !== "reinstate") {
      throw new ShedError("That choice isn't available.");
    }
    await reviewMember(await actor(), optionalId(formData.get("id")), decision);
  } catch (error) {
    return catchError(error);
  }
  redirect("/admin");
}

export async function createItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    await originOk();
    id = await createItem(await actor(), itemInput(formData));
  } catch (error) {
    return catchError(error);
  }
  redirect(`/inventory/${id}`);
}

export async function updateItemAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = optionalId(formData.get("id"));
  try {
    await originOk();
    await updateItem(await actor(), id, itemInput(formData));
  } catch (error) {
    return catchError(error);
  }
  redirect(`/inventory/${id}`);
}

export async function listingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = optionalId(formData.get("id"));
  try {
    await originOk();
    const listing = String(formData.get("listing") ?? "");
    if (listing !== "available" && listing !== "maintenance" && listing !== "hidden") {
      throw new ShedError("That choice isn't available.");
    }
    await setListing(await actor(), id, listing);
  } catch (error) {
    return catchError(error);
  }
  redirect(`/inventory/${id}`);
}

export async function requestBorrowAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const itemId = optionalId(formData.get("item_id"));
  try {
    await originOk();
    await requestBorrow(await actor(), {
      itemId,
      startOn: dayValue(formData.get("start_on"), "Start"),
      dueOn: dayValue(formData.get("due_on"), "Return"),
      message: block(formData.get("message"), "Note", 500),
    });
  } catch (error) {
    return catchError(error);
  }
  redirect(`/inventory/${itemId}`);
}

export async function borrowAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const next = nextPath(formData, "/borrows");
  try {
    await originOk();
    const id = optionalId(formData.get("id"));
    const decision = String(formData.get("decision") ?? "");
    const note = block(formData.get("note"), "Note", 500);
    const current = await actor();
    if (decision === "approve" || decision === "decline") {
      await decideBorrow(current, id, decision);
    } else if (
      decision === "cancel" ||
      decision === "checkout" ||
      decision === "checkin" ||
      decision === "confirm"
    ) {
      await transitionBorrow(current, id, decision as BorrowAction, note);
    } else {
      throw new ShedError("That choice isn't available.");
    }
  } catch (error) {
    return catchError(error);
  }
  redirect(next);
}

export async function createAskAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let id = "";
  try {
    await originOk();
    id = await createAsk(await actor(), {
      title: line(formData.get("title"), "What you need", 120),
      details: block(formData.get("details"), "Details", 1000),
      category: categoryValue(formData.get("category"), false),
    });
  } catch (error) {
    return catchError(error);
  }
  redirect(`/asks/${id}`);
}

export async function replyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const askId = optionalId(formData.get("ask_id"));
  try {
    await originOk();
    await replyToAsk(await actor(), {
      askId,
      body: block(formData.get("body"), "Reply", 1000, true),
      offerItemId: optionalId(formData.get("offer_item_id")),
    });
  } catch (error) {
    return catchError(error);
  }
  redirect(`/asks/${askId}`);
}

export async function askStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const askId = optionalId(formData.get("ask_id"));
  try {
    await originOk();
    const status = String(formData.get("status") ?? "");
    if (status !== "open" && status !== "fulfilled" && status !== "closed") {
      throw new ShedError("That choice isn't available.");
    }
    await setAskStatus(await actor(), askId, status);
  } catch (error) {
    return catchError(error);
  }
  redirect(`/asks/${askId}`);
}
