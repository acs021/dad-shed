import { createHash, randomBytes } from "node:crypto";
import { sql, readyDb, withTransaction } from "@/lib/db";
import { daysBetween, safePath, todayFor } from "@/lib/text";
import { actionsFor, type BorrowAction } from "@/lib/present";
import { ShedError } from "@/server/errors";
import { newId } from "@/server/ids";
import { hashPassword, verifyPassword } from "@/server/passwords";
import type { ItemInput, ProfileInput } from "@/server/validators";

export type Role = "admin" | "member";
export type MemberStatus = "pending" | "approved" | "suspended";

export type Actor = {
  id: string;
  groupId: string;
  email: string;
  name: string;
  household: string;
  phone: string;
  addressLine: string;
  city: string;
  region: string;
  postalCode: string;
  pickupNotes: string;
  bio: string;
  role: Role;
  status: MemberStatus;
};

type Query = <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;

type MemberRow = {
  id: string;
  group_id: string;
  email: string;
  name: string;
  household: string;
  phone: string;
  address_line: string;
  city: string;
  region: string;
  postal_code: string;
  pickup_notes: string;
  bio: string;
  role: Role;
  status: MemberStatus;
};

const MEMBER_COLUMNS = `id, group_id, email, name, household, phone, address_line, city, region, postal_code, pickup_notes, bio, role, status`;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type ShedProfile = ProfileInput & { password: string };

export function mapMember(row: MemberRow): Actor {
  return {
    id: row.id,
    groupId: row.group_id,
    email: row.email,
    name: row.name,
    household: row.household,
    phone: row.phone,
    addressLine: row.address_line,
    city: row.city,
    region: row.region,
    postalCode: row.postal_code,
    pickupNotes: row.pickup_notes,
    bio: row.bio,
    role: row.role,
    status: row.status,
  };
}

function requireApproved(actor: Actor) {
  if (actor.status !== "approved") throw new ShedError("An admin still needs to open the door.");
}

function requireAdmin(actor: Actor) {
  requireApproved(actor);
  if (actor.role !== "admin") throw new ShedError("An admin has to do that.");
}

function num(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function truthy(value: unknown) {
  return value === true || value === "t" || value === "true" || value === 1;
}

function isUnique(error: unknown) {
  if (typeof error === "object" && error && "code" in error && (error as { code?: string }).code === "23505") {
    return true;
  }
  return error instanceof Error && /unique/i.test(error.message);
}

async function notify(query: Query, memberId: string, title: string, body: string, href: string) {
  await query(
    `insert into notifications (id, member_id, title, body, href) values ($1, $2, $3, $4, $5)`,
    [newId(), memberId, title.slice(0, 140), body.slice(0, 300), safePath(href)],
  );
}

async function groupToday(query: Query, groupId: string) {
  const rows = await query<{ timezone: string }>(`select timezone from groups where id = $1`, [groupId]);
  if (!rows[0]) throw new ShedError("That shed isn't here.");
  return todayFor(rows[0].timezone);
}

function makeCode() {
  const bytes = randomBytes(8);
  let code = "";
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return code;
}

async function insertMember(
  query: Query,
  input: ShedProfile & { groupId: string; role: Role; status: MemberStatus },
) {
  const id = newId();
  try {
    await query(
      `insert into members (
        id, group_id, email, name, household, password_hash, phone,
        address_line, city, region, postal_code, pickup_notes, bio,
        role, status, rules_accepted_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, now())`,
      [
        id,
        input.groupId,
        input.email,
        input.name,
        input.household,
        await hashPassword(input.password),
        input.phone,
        input.addressLine,
        input.city,
        input.region,
        input.postalCode,
        input.pickupNotes,
        input.bio,
        input.role,
        input.status,
      ],
    );
  } catch (error) {
    if (isUnique(error)) throw new ShedError("That email already has a shed login. Sign in instead.");
    throw error;
  }
  const rows = await query<MemberRow>(`select ${MEMBER_COLUMNS} from members where id = $1`, [id]);
  return mapMember(rows[0]);
}

export async function createShed(input: ShedProfile & { shedName: string; tagline: string; rules: string; timezone: string }) {
  await readyDb();
  return withTransaction(async (query) => {
    const groupId = newId();
    await query(
      `insert into groups (id, name, tagline, rules, timezone) values ($1, $2, $3, $4, $5)`,
      [groupId, input.shedName, input.tagline, input.rules, input.timezone],
    );
    return insertMember(query, { ...input, groupId, role: "admin", status: "approved" });
  });
}

export async function authenticate(email: string, password: string) {
  await readyDb();
  const rows = await sql<MemberRow & { password_hash: string }>(
    `select ${MEMBER_COLUMNS}, password_hash from members where email = $1`,
    [email],
  );
  const row = rows[0];
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    throw new ShedError("That email or password doesn't match.");
  }
  await sql(`delete from sessions where expires_at < now()`);
  return mapMember(row);
}

export async function startSession(memberId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await sql(`insert into sessions (token_hash, member_id, expires_at) values ($1, $2, $3)`, [
    tokenHash,
    memberId,
    expires,
  ]);
  return token;
}

export async function actorFromToken(token: string) {
  await readyDb();
  if (!token) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const rows = await sql<MemberRow>(
    `select ${MEMBER_COLUMNS}
     from sessions s
     join members m on m.id = s.member_id
     where s.token_hash = $1 and s.expires_at > now()`,
    [tokenHash],
  );
  return rows[0] ? mapMember(rows[0]) : null;
}

export async function endSession(token: string) {
  if (!token) return;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await sql(`delete from sessions where token_hash = $1`, [tokenHash]);
}

export async function createInvite(
  actor: Actor,
  input: { email: string; maxUses: number; note: string; days: number },
) {
  await readyDb();
  requireAdmin(actor);
  const id = newId();
  const code = makeCode();
  const expires = new Date(Date.now() + input.days * 86_400_000).toISOString();
  await sql(
    `insert into invites (id, group_id, code, email, max_uses, note, created_by, expires_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, actor.groupId, code, input.email, input.maxUses, input.note, actor.id, expires],
  );
  return { id, code };
}

export async function revokeInvite(actor: Actor, inviteId: string) {
  await readyDb();
  requireAdmin(actor);
  const rows = await sql<{ id: string }>(
    `update invites set revoked_at = now()
     where id = $1 and group_id = $2 and revoked_at is null
     returning id`,
    [inviteId, actor.groupId],
  );
  if (!rows[0]) throw new ShedError("That invite isn't active.");
}

export async function joinWithInvite(input: ShedProfile & { code: string }) {
  await readyDb();
  return withTransaction(async (query) => {
    const invites = await query<{
      id: string;
      group_id: string;
      email: string;
      max_uses: number;
      use_count: number;
      expires_at: string | null;
      revoked_at: string | null;
    }>(`select id, group_id, email, max_uses, use_count, expires_at::text, revoked_at::text from invites where code = $1 for update`, [
      input.code,
    ]);
    const invite = invites[0];
    if (!invite || invite.revoked_at) throw new ShedError("That invite code doesn't work.");
    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      throw new ShedError("That invite code has expired.");
    }
    if (num(invite.use_count) >= num(invite.max_uses)) throw new ShedError("That invite code has been used up.");
    if (invite.email && invite.email !== input.email) {
      throw new ShedError("That invite is for a different email.");
    }
    const actor = await insertMember(query, {
      ...input,
      groupId: invite.group_id,
      role: "member",
      status: "pending",
    });
    await query(`update invites set use_count = use_count + 1 where id = $1`, [invite.id]);
    const admins = await query<{ id: string }>(
      `select id from members where group_id = $1 and role = 'admin' and status = 'approved'`,
      [invite.group_id],
    );
    for (const admin of admins) {
      await notify(query, admin.id, `${actor.name} wants in`, actor.city || "New neighbor", "/admin");
    }
    return actor;
  });
}

export async function reviewMember(actor: Actor, memberId: string, decision: "approve" | "suspend" | "reinstate") {
  await readyDb();
  requireAdmin(actor);
  if (memberId === actor.id) throw new ShedError("You can't change your own membership that way.");
  await withTransaction(async (query) => {
    const rows = await query<MemberRow>(
      `select ${MEMBER_COLUMNS} from members where id = $1 and group_id = $2 for update`,
      [memberId, actor.groupId],
    );
    const member = rows[0];
    if (!member) throw new ShedError("That person isn't in this shed.");
    const status: MemberStatus = decision === "suspend" ? "suspended" : "approved";
    await query(`update members set status = $1 where id = $2`, [status, memberId]);
    if (status === "suspended") await query(`delete from sessions where member_id = $1`, [memberId]);
    await notify(
      query,
      memberId,
      status === "approved" ? "You're in the shed" : "Your membership is paused",
      status === "approved" ? "You can list gear and borrow from the block." : "An admin paused your membership.",
      status === "approved" ? "/" : "/suspended",
    );
  });
}

export async function updateProfile(actor: Actor, input: ProfileInput) {
  await readyDb();
  const clash = await sql<{ id: string }>(`select id from members where email = $1 and id <> $2`, [
    input.email,
    actor.id,
  ]);
  if (clash[0]) throw new ShedError("That email is already used.");
  await sql(
    `update members set
      name = $1, household = $2, email = $3, phone = $4, address_line = $5,
      city = $6, region = $7, postal_code = $8, pickup_notes = $9, bio = $10
     where id = $11`,
    [
      input.name,
      input.household,
      input.email,
      input.phone,
      input.addressLine,
      input.city,
      input.region,
      input.postalCode,
      input.pickupNotes,
      input.bio,
      actor.id,
    ],
  );
}

export async function updateGroup(
  actor: Actor,
  input: { name: string; tagline: string; rules: string; timezone: string },
) {
  await readyDb();
  requireAdmin(actor);
  await sql(
    `update groups set name = $1, tagline = $2, rules = $3, timezone = $4 where id = $5`,
    [input.name, input.tagline, input.rules, input.timezone, actor.groupId],
  );
}

async function replaceLinks(query: Query, itemId: string, links: { label: string; url: string }[]) {
  await query(`delete from item_links where item_id = $1`, [itemId]);
  for (const [index, link] of links.entries()) {
    await query(
      `insert into item_links (id, item_id, label, url, position) values ($1, $2, $3, $4, $5)`,
      [newId(), itemId, link.label, link.url, index],
    );
  }
}

export async function createItem(actor: Actor, input: ItemInput) {
  await readyDb();
  requireApproved(actor);
  const id = newId();
  await withTransaction(async (query) => {
    await query(
      `insert into items (
        id, group_id, owner_id, title, description, category, condition, quantity,
        listing, max_days, needs_approval, consumable, safety_notes, replacement_note, photo_data
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,'available',$9,$10,$11,$12,$13,$14)`,
      [
        id,
        actor.groupId,
        actor.id,
        input.title,
        input.description,
        input.category,
        input.condition,
        input.quantity,
        input.maxDays,
        input.needsApproval,
        input.consumable,
        input.safetyNotes,
        input.replacementNote,
        input.photo,
      ],
    );
    await replaceLinks(query, id, input.links);
  });
  return id;
}

export async function updateItem(actor: Actor, itemId: string, input: ItemInput) {
  await readyDb();
  requireApproved(actor);
  await withTransaction(async (query) => {
    const rows = await query<{ owner_id: string; group_id: string }>(
      `select owner_id, group_id from items where id = $1 for update`,
      [itemId],
    );
    const item = rows[0];
    if (!item || item.group_id !== actor.groupId) throw new ShedError("That item isn't on the wall.");
    if (item.owner_id !== actor.id) throw new ShedError("You can only edit your own gear.");
    await query(
      `update items set
        title = $1, description = $2, category = $3, condition = $4, quantity = $5,
        listing = $6, max_days = $7, needs_approval = $8, consumable = $9,
        safety_notes = $10, replacement_note = $11, photo_data = $12, updated_at = now()
       where id = $13`,
      [
        input.title,
        input.description,
        input.category,
        input.condition,
        input.quantity,
        input.listing,
        input.maxDays,
        input.needsApproval,
        input.consumable,
        input.safetyNotes,
        input.replacementNote,
        input.photo,
        itemId,
      ],
    );
    await replaceLinks(query, itemId, input.links);
  });
}

export async function setListing(actor: Actor, itemId: string, listing: "available" | "maintenance" | "hidden") {
  await readyDb();
  requireApproved(actor);
  const rows = await sql<{ owner_id: string; group_id: string }>(
    `select owner_id, group_id from items where id = $1`,
    [itemId],
  );
  const item = rows[0];
  if (!item || item.group_id !== actor.groupId) throw new ShedError("That item isn't on the wall.");
  if (item.owner_id !== actor.id && actor.role !== "admin") {
    throw new ShedError("You can only change your own gear.");
  }
  await sql(`update items set listing = $1, updated_at = now() where id = $2`, [listing, itemId]);
}

export async function requestBorrow(
  actor: Actor,
  input: { itemId: string; startOn: string; dueOn: string; message: string },
) {
  await readyDb();
  requireApproved(actor);
  return withTransaction(async (query) => {
    const items = await query<{
      id: string;
      group_id: string;
      owner_id: string;
      title: string;
      listing: string;
      quantity: number;
      max_days: number;
      needs_approval: boolean;
    }>(
      `select id, group_id, owner_id, title, listing, quantity, max_days, needs_approval
       from items where id = $1 for update`,
      [input.itemId],
    );
    const item = items[0];
    if (!item || item.group_id !== actor.groupId || item.listing === "hidden") {
      throw new ShedError("That item isn't on the wall.");
    }
    if (item.owner_id === actor.id) throw new ShedError("That's already yours.");
    if (item.listing !== "available") throw new ShedError("That one is in the shop right now.");
    const today = await groupToday(query, actor.groupId);
    if (input.startOn < today) throw new ShedError("Pick today or a later start.");
    if (input.dueOn < input.startOn) throw new ShedError("The return date has to be on or after the start.");
    if (daysBetween(input.startOn, input.dueOn) > num(item.max_days)) {
      throw new ShedError(`The owner lends this for ${item.max_days} days at a time.`);
    }
    const open = await query<{ id: string }>(
      `select id from borrows
       where item_id = $1 and borrower_id = $2
         and status in ('requested', 'approved', 'checked_out', 'return_pending')`,
      [item.id, actor.id],
    );
    if (open[0]) throw new ShedError("You already have a loan open for this.");
    const status = truthy(item.needs_approval) ? "requested" : "approved";
    if (status === "approved") await assertSlot(query, item.id, num(item.quantity));
    const borrowId = newId();
    await query(
      `insert into borrows (
        id, group_id, item_id, borrower_id, status, start_on, due_on, message, approved_at
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        borrowId,
        actor.groupId,
        item.id,
        actor.id,
        status,
        input.startOn,
        input.dueOn,
        input.message,
        status === "approved" ? new Date().toISOString() : null,
      ],
    );
    await notify(
      query,
      item.owner_id,
      status === "approved" ? `${actor.name} reserved ${item.title}` : `${actor.name} wants ${item.title}`,
      input.message || "No note.",
      `/inventory/${item.id}`,
    );
    return { id: borrowId, status };
  });
}

async function assertSlot(query: Query, itemId: string, quantity: number) {
  const held = await query<{ n: number }>(
    `select count(*)::int as n from borrows
     where item_id = $1 and status in ('approved', 'checked_out', 'return_pending')`,
    [itemId],
  );
  if (num(held[0]?.n) >= quantity) throw new ShedError("All of those are spoken for.");
}

export async function decideBorrow(actor: Actor, borrowId: string, decision: "approve" | "decline") {
  await readyDb();
  requireApproved(actor);
  await withTransaction(async (query) => {
    const locked = await lockBorrow(query, actor.groupId, borrowId);
    if (locked.borrow.status !== "requested") throw new ShedError("That request is already settled.");
    if (locked.item.owner_id !== actor.id && actor.role !== "admin") {
      throw new ShedError("Only the owner can answer that.");
    }
    if (decision === "decline") {
      await query(`update borrows set status = 'declined' where id = $1`, [borrowId]);
      await notify(
        query,
        locked.borrow.borrower_id,
        `No on ${locked.item.title}`,
        "The owner declined this one.",
        `/inventory/${locked.item.id}`,
      );
      return;
    }
    await assertSlot(query, locked.item.id, num(locked.item.quantity));
    await query(`update borrows set status = 'approved', approved_at = now() where id = $1`, [borrowId]);
    await notify(
      query,
      locked.borrow.borrower_id,
      `${locked.item.title} is a yes`,
      "Directions and pickup notes are on the item now.",
      `/inventory/${locked.item.id}`,
    );
  });
}

export async function transitionBorrow(actor: Actor, borrowId: string, action: BorrowAction, note: string) {
  await readyDb();
  requireApproved(actor);
  if (action === "approve" || action === "decline") throw new ShedError("You can't do that with this loan.");
  await withTransaction(async (query) => {
    const locked = await lockBorrow(query, actor.groupId, borrowId);
    const allowed = actionsFor(
      { id: actor.id, role: actor.role },
      {
        status: locked.borrow.status,
        borrowerId: locked.borrow.borrower_id,
        ownerId: locked.item.owner_id,
      },
    );
    if (!allowed.includes(action)) throw new ShedError("You can't do that with this loan.");
    const itemPath = `/inventory/${locked.item.id}`;
    if (action === "cancel") {
      await query(`update borrows set status = 'cancelled' where id = $1`, [borrowId]);
      await tellOthers(query, actor.id, locked, `${locked.item.title} was cancelled`, "The loan was called off.", itemPath);
      return;
    }
    if (action === "checkout") {
      await query(
        `update borrows set status = 'checked_out', checked_out_at = now(), condition_out = $2 where id = $1`,
        [borrowId, note],
      );
      await tellOthers(query, actor.id, locked, `${locked.item.title} was picked up`, note || "Checked out.", itemPath);
      return;
    }
    if (action === "checkin") {
      await query(
        `update borrows set status = 'return_pending', return_requested_at = now(), return_note = $2 where id = $1`,
        [borrowId, note],
      );
      await tellOthers(
        query,
        actor.id,
        locked,
        `${actor.name} brought ${locked.item.title} back`,
        "Confirm the condition when you've looked at it.",
        itemPath,
      );
      return;
    }
    await query(
      `update borrows set status = 'returned', returned_at = now(), condition_in = $2 where id = $1`,
      [borrowId, note],
    );
    await tellOthers(query, actor.id, locked, `${locked.item.title} is back`, note || "Marked returned.", itemPath);
  });
}

async function tellOthers(
  query: Query,
  actorId: string,
  locked: { item: { owner_id: string }; borrow: { borrower_id: string } },
  title: string,
  body: string,
  href: string,
) {
  const people = new Set([locked.item.owner_id, locked.borrow.borrower_id]);
  for (const memberId of people) {
    if (memberId === actorId) continue;
    await notify(query, memberId, title, body, href);
  }
}

async function lockBorrow(query: Query, groupId: string, borrowId: string) {
  const peek = await query<{ item_id: string }>(`select item_id from borrows where id = $1`, [borrowId]);
  if (!peek[0]) throw new ShedError("That loan isn't here.");
  const items = await query<{ id: string; title: string; owner_id: string; group_id: string; quantity: number }>(
    `select id, title, owner_id, group_id, quantity from items where id = $1 for update`,
    [peek[0].item_id],
  );
  const item = items[0];
  if (!item || item.group_id !== groupId) throw new ShedError("That loan isn't here.");
  const borrows = await query<{ id: string; status: string; borrower_id: string }>(
    `select id, status, borrower_id from borrows where id = $1 for update`,
    [borrowId],
  );
  const borrow = borrows[0];
  if (!borrow) throw new ShedError("That loan isn't here.");
  return { item, borrow };
}

export async function createAsk(actor: Actor, input: { title: string; details: string; category: string }) {
  await readyDb();
  requireApproved(actor);
  const id = newId();
  await withTransaction(async (query) => {
    await query(
      `insert into asks (id, group_id, author_id, title, details, category) values ($1, $2, $3, $4, $5, $6)`,
      [id, actor.groupId, actor.id, input.title, input.details, input.category],
    );
    const members = await query<{ id: string }>(
      `select id from members where group_id = $1 and status = 'approved' and id <> $2`,
      [actor.groupId, actor.id],
    );
    for (const member of members) {
      await notify(query, member.id, `${actor.name} is looking for ${input.title}`, input.details || "Nothing listed matched.", `/asks/${id}`);
    }
  });
  return id;
}

export async function replyToAsk(actor: Actor, input: { askId: string; body: string; offerItemId: string }) {
  await readyDb();
  requireApproved(actor);
  await withTransaction(async (query) => {
    const asks = await query<{ id: string; title: string; status: string; author_id: string }>(
      `select id, title, status, author_id from asks where id = $1 and group_id = $2`,
      [input.askId, actor.groupId],
    );
    const ask = asks[0];
    if (!ask) throw new ShedError("That note isn't here.");
    if (ask.status !== "open") throw new ShedError("That note is closed.");
    let offer: string | null = null;
    if (input.offerItemId) {
      const items = await query<{ id: string }>(
        `select id from items where id = $1 and group_id = $2 and owner_id = $3 and listing <> 'hidden'`,
        [input.offerItemId, actor.groupId, actor.id],
      );
      if (!items[0]) throw new ShedError("Offer something from your own wall.");
      offer = input.offerItemId;
    }
    await query(
      `insert into ask_replies (id, ask_id, author_id, body, offer_item_id) values ($1, $2, $3, $4, $5)`,
      [newId(), ask.id, actor.id, input.body, offer],
    );
    const people = await query<{ id: string }>(
      `select author_id as id from asks where id = $1
       union
       select author_id as id from ask_replies where ask_id = $1`,
      [ask.id],
    );
    for (const person of people) {
      if (person.id === actor.id) continue;
      await notify(query, person.id, `Reply about ${ask.title}`, input.body, `/asks/${ask.id}`);
    }
  });
}

export async function setAskStatus(actor: Actor, askId: string, status: "open" | "fulfilled" | "closed") {
  await readyDb();
  requireApproved(actor);
  const rows = await sql<{ author_id: string }>(
    `select author_id from asks where id = $1 and group_id = $2`,
    [askId, actor.groupId],
  );
  const ask = rows[0];
  if (!ask) throw new ShedError("That note isn't here.");
  if (ask.author_id !== actor.id && actor.role !== "admin") throw new ShedError("Only the author can close that.");
  await sql(`update asks set status = $1 where id = $2`, [status, askId]);
}

export async function markNotificationsRead(actor: Actor) {
  await readyDb();
  await sql(`update notifications set read_at = now() where member_id = $1 and read_at is null`, [actor.id]);
}
