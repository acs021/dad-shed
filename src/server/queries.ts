import { sql, readyDb } from "@/lib/db";
import { categoryLabel } from "@/lib/constants";
import {
  actionsFor,
  availabilityLabel,
  canSeeBorrowerContact,
  canSeePickup,
  isOverdue,
  type BorrowAction,
} from "@/lib/present";
import { formatAddress, likePattern, todayFor } from "@/lib/text";
import type { Actor } from "@/server/domain";
import { markNotificationsRead } from "@/server/domain";
import { ShedError } from "@/server/errors";

function num(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function day(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").slice(0, 10);
}

function requireApproved(actor: Actor) {
  if (actor.status !== "approved") throw new ShedError("An admin still needs to open the door.");
}

export async function shedGate() {
  await readyDb();
  const groups = await sql<{
    id: string;
    name: string;
    tagline: string;
    rules: string;
    timezone: string;
  }>(`select id, name, tagline, rules, timezone from groups order by created_at asc limit 1`);
  const demo = await sql<{ value: string }>(`select value from app_meta where key = 'demo'`);
  const invite = demo[0]?.value === "1"
    ? await sql<{ code: string }>(
        `select code from invites where revoked_at is null order by created_at asc limit 1`,
      )
    : [];
  return {
    group: groups[0] ?? null,
    demo: demo[0]?.value === "1",
    inviteCode: invite[0]?.code ?? "",
  };
}

export async function publicStats(groupId: string) {
  const members = await sql<{ n: number }>(
    `select count(*)::int as n from members where group_id = $1 and status = 'approved'`,
    [groupId],
  );
  const items = await sql<{ n: number }>(
    `select count(*)::int as n from items where group_id = $1 and listing = 'available'`,
    [groupId],
  );
  return { members: num(members[0]?.n), items: num(items[0]?.n) };
}

export async function loadFrame(actor: Actor) {
  const groups = await sql<{ name: string; timezone: string }>(
    `select name, timezone from groups where id = $1`,
    [actor.groupId],
  );
  const unread = await sql<{ n: number }>(
    `select count(*)::int as n from notifications where member_id = $1 and read_at is null`,
    [actor.id],
  );
  const demo = await sql<{ value: string }>(`select value from app_meta where key = 'demo'`);
  const pending = actor.role === "admin"
    ? await sql<{ n: number }>(
        `select count(*)::int as n from members where group_id = $1 and status = 'pending'`,
        [actor.groupId],
      )
    : [{ n: 0 }];
  return {
    groupName: groups[0]?.name ?? "Dad Shed",
    memberName: actor.name,
    role: actor.role,
    unread: num(unread[0]?.n),
    pending: num(pending[0]?.n),
    today: todayFor(groups[0]?.timezone ?? "America/New_York"),
    demo: demo[0]?.value === "1",
  };
}

type HoldRow = {
  item_id: string;
  status: string;
  due_on: string;
  borrower_id: string;
  borrower_name: string;
};

async function activeHolds(groupId: string) {
  return sql<HoldRow>(
    `select b.item_id, b.status, b.due_on::text as due_on, b.borrower_id, m.name as borrower_name
     from borrows b
     join members m on m.id = b.borrower_id
     where b.group_id = $1 and b.status in ('requested', 'approved', 'checked_out', 'return_pending')`,
    [groupId],
  );
}

export async function homeFor(actor: Actor) {
  requireApproved(actor);
  const frame = await loadFrame(actor);
  const holds = await activeHolds(actor.groupId);
  const loans = holds.map((row) => ({
    itemId: row.item_id,
    status: row.status,
    dueOn: day(row.due_on),
    borrowerId: row.borrower_id,
    borrowerName: row.borrower_name,
  }));
  const items = await sql<{ id: string; title: string; owner_id: string; owner_name: string }>(
    `select i.id, i.title, i.owner_id, m.name as owner_name
     from items i join members m on m.id = i.owner_id
     where i.group_id = $1 and i.listing <> 'hidden'`,
    [actor.groupId],
  );
  const byId = new Map(items.map((item) => [item.id, item]));
  const titled = loans
    .map((loan) => {
      const item = byId.get(loan.itemId);
      if (!item) return null;
      return { ...loan, title: item.title, ownerId: item.owner_id, ownerName: item.owner_name };
    })
    .filter((loan): loan is NonNullable<typeof loan> => loan !== null);

  const recent = await sql<{ id: string; title: string; category: string; owner_name: string }>(
    `select i.id, i.title, i.category, m.name as owner_name
     from items i join members m on m.id = i.owner_id
     where i.group_id = $1 and i.listing = 'available'
     order by i.created_at desc limit 6`,
    [actor.groupId],
  );
  const asks = await sql<{ id: string; title: string; author_name: string }>(
    `select a.id, a.title, m.name as author_name
     from asks a join members m on m.id = a.author_id
     where a.group_id = $1 and a.status = 'open'
     order by a.created_at desc limit 4`,
    [actor.groupId],
  );

  const mine = (loan: { ownerId: string; borrowerId: string }) =>
    loan.ownerId === actor.id || loan.borrowerId === actor.id;

  return {
    today: frame.today,
    waitingOnYou: titled.filter((loan) => loan.ownerId === actor.id && loan.status === "requested"),
    borrowing: titled.filter((loan) => loan.borrowerId === actor.id),
    lending: titled.filter((loan) => loan.ownerId === actor.id && loan.status !== "requested"),
    overdue: titled.filter(
      (loan) => isOverdue(loan.status, loan.dueOn, frame.today) && (mine(loan) || actor.role === "admin"),
    ),
    recent: recent.map((item) => ({ ...item, categoryLabel: categoryLabel(item.category) })),
    asks,
  };
}

export async function browseItems(actor: Actor, filters: { q: string; category: string; onlyFree: boolean }) {
  requireApproved(actor);
  const frame = await loadFrame(actor);
  const params: unknown[] = [actor.groupId];
  const clauses = ["i.group_id = $1"];
  if (actor.role !== "admin") {
    params.push(actor.id);
    clauses.push("(i.listing <> 'hidden' or i.owner_id = $2)");
  }
  if (filters.category) {
    params.push(filters.category);
    clauses.push(`i.category = $${params.length}`);
  }
  if (filters.q) {
    params.push(likePattern(filters.q));
    const ref = `$${params.length}`;
    clauses.push(
      `(i.title ilike ${ref} escape '\\' or i.description ilike ${ref} escape '\\' or m.name ilike ${ref} escape '\\')`,
    );
  }
  const rows = await sql<{
    id: string;
    owner_id: string;
    title: string;
    category: string;
    condition: string;
    quantity: number;
    listing: string;
    photo_data: string;
    owner_name: string;
    owner_city: string;
  }>(
    `select i.id, i.owner_id, i.title, i.category, i.condition, i.quantity, i.listing, i.photo_data,
            m.name as owner_name, m.city as owner_city
     from items i join members m on m.id = i.owner_id
     where ${clauses.join(" and ")}
     order by i.title asc
     limit 200`,
    params,
  );
  const holds = await activeHolds(actor.groupId);
  const cards = rows.map((row) => {
    const itemHolds = holds
      .filter((hold) => hold.item_id === row.id)
      .map((hold) => ({
        status: hold.status,
        dueOn: day(hold.due_on),
        borrowerName: hold.borrower_name,
      }));
    const availability = availabilityLabel({
      listing: row.listing,
      quantity: num(row.quantity),
      holds: itemHolds,
      today: frame.today,
    });
    const holding = itemHolds.filter((hold) => hold.status !== "requested");
    return {
      id: row.id,
      title: row.title,
      category: categoryLabel(row.category),
      ownerName: row.owner_name,
      city: row.owner_city,
      photo: row.photo_data,
      youOwn: row.owner_id === actor.id,
      requestCount: itemHolds.filter((hold) => hold.status === "requested").length,
      free: num(row.quantity) - holding.filter((hold) => hold.status !== "requested").length,
      availability,
    };
  });
  const visible = filters.onlyFree
    ? cards.filter((card) => card.availability.label === "On the wall" || card.availability.label.includes(" of "))
    : cards;
  return { today: frame.today, cards: visible };
}

export async function getItemPage(actor: Actor, itemId: string) {
  requireApproved(actor);
  const frame = await loadFrame(actor);
  const rows = await sql<{
    id: string;
    owner_id: string;
    title: string;
    description: string;
    category: string;
    condition: string;
    quantity: number;
    listing: string;
    max_days: number;
    needs_approval: boolean;
    consumable: boolean;
    safety_notes: string;
    replacement_note: string;
    photo_data: string;
    owner_name: string;
    owner_phone: string;
    owner_email: string;
    address_line: string;
    city: string;
    region: string;
    postal_code: string;
    pickup_notes: string;
    household: string;
  }>(
    `select i.id, i.owner_id, i.title, i.description, i.category, i.condition, i.quantity, i.listing,
            i.max_days, i.needs_approval, i.consumable, i.safety_notes, i.replacement_note, i.photo_data,
            m.name as owner_name, m.phone as owner_phone, m.email as owner_email, m.household,
            m.address_line, m.city, m.region, m.postal_code, m.pickup_notes
     from items i join members m on m.id = i.owner_id
     where i.id = $1 and i.group_id = $2`,
    [itemId, actor.groupId],
  );
  const row = rows[0];
  if (!row) throw new ShedError("That item isn't on the wall.");
  if (row.listing === "hidden" && row.owner_id !== actor.id && actor.role !== "admin") {
    throw new ShedError("That item isn't on the wall.");
  }
  const links = await sql<{ label: string; url: string }>(
    `select label, url from item_links where item_id = $1 order by position asc`,
    [itemId],
  );
  const borrows = await sql<{
    id: string;
    status: string;
    start_on: string;
    due_on: string;
    message: string;
    condition_out: string;
    condition_in: string;
    return_note: string;
    borrower_id: string;
    borrower_name: string;
    borrower_phone: string;
    borrower_email: string;
  }>(
    `select b.id, b.status, b.start_on::text as start_on, b.due_on::text as due_on, b.message,
            b.condition_out, b.condition_in, b.return_note, b.borrower_id,
            m.name as borrower_name, m.phone as borrower_phone, m.email as borrower_email
     from borrows b join members m on m.id = b.borrower_id
     where b.item_id = $1
     order by b.requested_at desc
     limit 30`,
    [itemId],
  );
  const slices = borrows.map((borrow) => ({ borrowerId: borrow.borrower_id, status: borrow.status }));
  const showPickup = canSeePickup({ id: actor.id, role: actor.role }, row.owner_id, slices);
  const address = formatAddress({
    addressLine: row.address_line,
    city: row.city,
    region: row.region,
    postalCode: row.postal_code,
  });
  const cards = borrows.map((borrow) => {
    const seeContact = canSeeBorrowerContact(
      { id: actor.id, role: actor.role },
      { borrowerId: borrow.borrower_id, ownerId: row.owner_id, status: borrow.status },
    );
    const seeNote = seeContact || actor.id === row.owner_id;
    const actions: BorrowAction[] = actionsFor(
      { id: actor.id, role: actor.role },
      { status: borrow.status, borrowerId: borrow.borrower_id, ownerId: row.owner_id },
    );
    return {
      id: borrow.id,
      status: borrow.status,
      startOn: day(borrow.start_on),
      dueOn: day(borrow.due_on),
      message: seeNote ? borrow.message : "",
      conditionOut: borrow.condition_out,
      conditionIn: borrow.condition_in,
      returnNote: borrow.return_note,
      borrowerId: borrow.borrower_id,
      borrowerName: borrow.borrower_name,
      borrowerPhone: seeContact ? borrow.borrower_phone : null,
      borrowerEmail: seeContact ? borrow.borrower_email : null,
      overdue: isOverdue(borrow.status, day(borrow.due_on), frame.today),
      actions,
    };
  });
  const open = cards.filter((borrow) =>
    ["requested", "approved", "checked_out", "return_pending"].includes(borrow.status),
  );
  const holds = open
    .filter((borrow) => borrow.status !== "requested")
    .map((borrow) => ({ status: borrow.status, dueOn: borrow.dueOn, borrowerName: borrow.borrowerName }));
  return {
    today: frame.today,
    item: {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category,
      categoryLabel: categoryLabel(row.category),
      condition: row.condition,
      quantity: num(row.quantity),
      listing: row.listing,
      maxDays: num(row.max_days),
      needsApproval: row.needs_approval === true || String(row.needs_approval) === "t",
      consumable: row.consumable === true || String(row.consumable) === "t",
      safetyNotes: row.safety_notes,
      replacementNote: row.replacement_note,
      photo: row.photo_data,
      youOwn: row.owner_id === actor.id,
    },
    owner: {
      id: row.owner_id,
      name: row.owner_name,
      household: row.household,
      city: row.city,
      phone: showPickup ? row.owner_phone : null,
      email: showPickup ? row.owner_email : null,
      address: showPickup ? address : null,
      pickup: showPickup ? row.pickup_notes : null,
    },
    links,
    borrows: cards,
    open,
    availability: availabilityLabel({
      listing: row.listing,
      quantity: num(row.quantity),
      holds,
      today: frame.today,
    }),
    slotsFree: num(row.quantity) - holds.length,
  };
}

export async function getEditableItem(actor: Actor, itemId: string) {
  const page = await getItemPage(actor, itemId);
  if (!page.item.youOwn) throw new ShedError("You can only edit your own gear.");
  const links = page.links;
  return { ...page, links };
}

export async function borrowsFor(actor: Actor) {
  requireApproved(actor);
  const frame = await loadFrame(actor);
  const rows = await sql<{
    id: string;
    status: string;
    start_on: string;
    due_on: string;
    message: string;
    condition_out: string;
    condition_in: string;
    item_id: string;
    title: string;
    owner_id: string;
    owner_name: string;
    borrower_id: string;
    borrower_name: string;
    borrower_phone: string;
    address_line: string;
    city: string;
    region: string;
    postal_code: string;
    pickup_notes: string;
  }>(
    `select b.id, b.status, b.start_on::text as start_on, b.due_on::text as due_on, b.message,
            b.condition_out, b.condition_in, i.id as item_id, i.title, i.owner_id,
            ow.name as owner_name, br.name as borrower_name, br.phone as borrower_phone,
            ow.address_line, ow.city, ow.region, ow.postal_code, ow.pickup_notes
     from borrows b
     join items i on i.id = b.item_id
     join members ow on ow.id = i.owner_id
     join members br on br.id = b.borrower_id
     where b.group_id = $1
       and b.status in ('requested', 'approved', 'checked_out', 'return_pending')
       and (i.owner_id = $2 or b.borrower_id = $2 or $3 = 'admin')
     order by b.due_on asc`,
    [actor.groupId, actor.id, actor.role],
  );
  return {
    today: frame.today,
    loans: rows.map((row) => {
      const showPickup = canSeePickup({ id: actor.id, role: actor.role }, row.owner_id, [
        { borrowerId: row.borrower_id, status: row.status },
      ]);
      const seeBorrower = canSeeBorrowerContact(
        { id: actor.id, role: actor.role },
        { borrowerId: row.borrower_id, ownerId: row.owner_id, status: row.status },
      );
      return {
        id: row.id,
        itemId: row.item_id,
        title: row.title,
        status: row.status,
        startOn: day(row.start_on),
        dueOn: day(row.due_on),
        message: row.message,
        conditionOut: row.condition_out,
        ownerId: row.owner_id,
        ownerName: row.owner_name,
        borrowerId: row.borrower_id,
        borrowerName: row.borrower_name,
        borrowerPhone: seeBorrower ? row.borrower_phone : null,
        address: showPickup
          ? formatAddress({
              addressLine: row.address_line,
              city: row.city,
              region: row.region,
              postalCode: row.postal_code,
            })
          : null,
        pickup: showPickup ? row.pickup_notes : null,
        overdue: isOverdue(row.status, day(row.due_on), frame.today),
        actions: actionsFor(
          { id: actor.id, role: actor.role },
          { status: row.status, borrowerId: row.borrower_id, ownerId: row.owner_id },
        ),
        yours: row.borrower_id === actor.id,
      };
    }),
  };
}

export async function asksFor(actor: Actor) {
  requireApproved(actor);
  const rows = await sql<{
    id: string;
    title: string;
    details: string;
    category: string;
    status: string;
    author_name: string;
    replies: number;
  }>(
    `select a.id, a.title, a.details, a.category, a.status, m.name as author_name,
            (select count(*)::int from ask_replies r where r.ask_id = a.id) as replies
     from asks a join members m on m.id = a.author_id
     where a.group_id = $1
     order by case when a.status = 'open' then 0 else 1 end, a.created_at desc
     limit 100`,
    [actor.groupId],
  );
  return rows.map((row) => ({
    ...row,
    replies: num(row.replies),
    categoryLabel: row.category ? categoryLabel(row.category) : "",
  }));
}

export async function askPage(actor: Actor, askId: string) {
  requireApproved(actor);
  const rows = await sql<{
    id: string;
    title: string;
    details: string;
    category: string;
    status: string;
    author_id: string;
    author_name: string;
  }>(
    `select a.id, a.title, a.details, a.category, a.status, a.author_id, m.name as author_name
     from asks a join members m on m.id = a.author_id
     where a.id = $1 and a.group_id = $2`,
    [askId, actor.groupId],
  );
  const ask = rows[0];
  if (!ask) throw new ShedError("That note isn't here.");
  const replies = await sql<{ id: string; body: string; author_name: string; offer_title: string | null; offer_id: string | null }>(
    `select r.id, r.body, m.name as author_name, i.title as offer_title, r.offer_item_id as offer_id
     from ask_replies r
     join members m on m.id = r.author_id
     left join items i on i.id = r.offer_item_id
     where r.ask_id = $1
     order by r.created_at asc`,
    [askId],
  );
  const mine = await sql<{ id: string; title: string }>(
    `select id, title from items where owner_id = $1 and group_id = $2 and listing <> 'hidden' order by title`,
    [actor.id, actor.groupId],
  );
  return {
    ask: { ...ask, categoryLabel: ask.category ? categoryLabel(ask.category) : "", youWrote: ask.author_id === actor.id },
    replies,
    mine,
  };
}

export async function membersFor(actor: Actor) {
  requireApproved(actor);
  return sql<{ id: string; name: string; household: string; city: string; bio: string; role: string }>(
    `select id, name, household, city, bio, role
     from members
     where group_id = $1 and status = 'approved'
     order by name asc`,
    [actor.groupId],
  );
}

export async function memberPage(actor: Actor, memberId: string) {
  requireApproved(actor);
  const rows = await sql<{
    id: string;
    name: string;
    household: string;
    city: string;
    bio: string;
    role: string;
    phone: string;
    email: string;
    address_line: string;
    region: string;
    postal_code: string;
    status: string;
  }>(
    `select id, name, household, city, bio, role, phone, email, address_line, region, postal_code, status
     from members where id = $1 and group_id = $2`,
    [memberId, actor.groupId],
  );
  const member = rows[0];
  if (!member || (member.status !== "approved" && actor.role !== "admin" && actor.id !== member.id)) {
    throw new ShedError("That neighbor isn't in the shed.");
  }
  const showContact = actor.role === "admin" || actor.id === member.id;
  const items = await sql<{ id: string; title: string; category: string; listing: string }>(
    `select id, title, category, listing from items
     where owner_id = $1 and group_id = $2 and (listing <> 'hidden' or owner_id = $3 or $4 = 'admin')
     order by title`,
    [member.id, actor.groupId, actor.id, actor.role],
  );
  return {
    member: {
      id: member.id,
      name: member.name,
      household: member.household,
      city: member.city,
      bio: member.bio,
      role: member.role,
      phone: showContact ? member.phone : null,
      email: showContact ? member.email : null,
      address: showContact
        ? formatAddress({
            addressLine: member.address_line,
            city: member.city,
            region: member.region,
            postalCode: member.postal_code,
          })
        : null,
    },
    items: items.map((item) => ({ ...item, categoryLabel: categoryLabel(item.category) })),
  };
}

export async function adminFor(actor: Actor) {
  if (actor.role !== "admin" || actor.status !== "approved") throw new ShedError("An admin has to do that.");
  const group = await sql<{ name: string; tagline: string; rules: string; timezone: string }>(
    `select name, tagline, rules, timezone from groups where id = $1`,
    [actor.groupId],
  );
  const members = await sql<{
    id: string;
    name: string;
    email: string;
    phone: string;
    city: string;
    address_line: string;
    household: string;
    status: string;
    role: string;
  }>(
    `select id, name, email, phone, city, address_line, household, status, role
     from members where group_id = $1 order by created_at asc`,
    [actor.groupId],
  );
  const invites = await sql<{
    id: string;
    code: string;
    email: string;
    max_uses: number;
    use_count: number;
    note: string;
    revoked_at: string | null;
  }>(
    `select id, code, email, max_uses, use_count, note, revoked_at::text
     from invites where group_id = $1 order by created_at desc limit 30`,
    [actor.groupId],
  );
  return { group: group[0], members, invites };
}

export async function inboxFor(actor: Actor) {
  const rows = await sql<{ id: string; title: string; body: string; href: string; read_at: string | null }>(
    `select id, title, body, href, read_at::text from notifications
     where member_id = $1 order by created_at desc limit 50`,
    [actor.id],
  );
  await markNotificationsRead(actor);
  return rows;
}
