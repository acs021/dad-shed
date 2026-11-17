import { sql, withTransaction } from "@/lib/db";
import { addDays, todayFor } from "@/lib/text";
import { newId } from "@/server/ids";
import { hashPassword } from "@/server/passwords";

export const DEMO_PASSWORD = "shed-sample";

export async function seedDemo() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const today = todayFor("America/New_York");
  const groupId = "10000000-0000-4000-8000-000000000001";
  const sam = "10000000-0000-4000-8000-000000000011";
  const maria = "10000000-0000-4000-8000-000000000012";
  const chris = "10000000-0000-4000-8000-000000000013";
  const priya = "10000000-0000-4000-8000-000000000014";
  const ben = "10000000-0000-4000-8000-000000000015";
  const jordan = "10000000-0000-4000-8000-000000000016";

  const ladder = "20000000-0000-4000-8000-000000000021";
  const washer = "20000000-0000-4000-8000-000000000022";
  const saw = "20000000-0000-4000-8000-000000000023";
  const tent = "20000000-0000-4000-8000-000000000024";
  const chairs = "20000000-0000-4000-8000-000000000025";
  const jackets = "20000000-0000-4000-8000-000000000026";
  const blower = "20000000-0000-4000-8000-000000000027";
  const goals = "20000000-0000-4000-8000-000000000028";
  const askId = "30000000-0000-4000-8000-000000000031";

  const people = [
    [sam, "sam@cedar.example", "Sam Okonkwo", "The Okonkwos", "(555) 010-1401", "14 Cedar Lane", "Side door of the garage, off the alley.", "I keep the saws and the bike rack.", "admin", "approved"],
    [maria, "maria@cedar.example", "Maria Alvarez", "The Alvarezes", "(555) 010-2202", "22 Cedar Lane", "Side gate, green latch. Skip the bell between 1 and 3.", "Yard tools and the tall ladder.", "member", "approved"],
    [chris, "chris@cedar.example", "Chris Dalton", "", "(555) 010-0903", "9 Birch Court", "Porch bin on the left. Text when you're out front.", "Camping gear.", "member", "approved"],
    [priya, "priya@cedar.example", "Priya Shah", "The Shahs", "(555) 010-3104", "31 Cedar Lane", "Come to the kitchen door.", "Party stuff and the cooker.", "member", "approved"],
    [ben, "ben@cedar.example", "Ben Carter", "", "(555) 010-4005", "40 Cedar Lane", "Driveway, blue bin.", "Sports gear.", "member", "approved"],
    [jordan, "jordan@cedar.example", "Jordan Lee", "", "(555) 010-1806", "18 Birch Court", "", "Chris said I should join.", "member", "pending"],
  ] as const;

  await withTransaction(async (query) => {
    await query(
      `insert into groups (id, name, tagline, rules, timezone) values ($1, $2, $3, $4, 'America/New_York')`,
      [
        groupId,
        "Cedar Lane Shed",
        "Borrow it from someone on the block.",
        `Dad Shed is a favor between neighbors, not a rental shop.

• Borrow only what you can return on time, clean, and in the same shape.
• If something breaks, you repair it or replace it, and you say so the same day.
• Don't hand a borrowed item to someone who isn't in the shed.
• Blades, fuel, filters, and other consumables get replaced by the borrower.
• Pick up and drop off at the time you agreed. Gate codes stay between the two of you.
• No weapons. If a tool can hurt someone, read the note and use it like the owner would.
• Admins can pause a membership that breaks that trust.`,
      ],
    );

    for (const person of people) {
      await query(
        `insert into members (
          id, group_id, email, name, household, password_hash, phone,
          address_line, city, region, postal_code, pickup_notes, bio,
          role, status, rules_accepted_at
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,'Sampletown','NY','00000',$9,$10,$11,$12, now())`,
        [person[0], groupId, person[1], person[2], person[3], passwordHash, person[4], person[5], person[6], person[7], person[8], person[9]],
      );
    }

    const items: unknown[][] = [
      [washer, maria, "Pressure washer", "Electric, 1800 psi. Bring it back empty of soap.", "yard", "good", 1, "available", 3, true, false, "Keep the cord away from the water.", "Replace it if the motor is cooked."],
      [ladder, maria, "10-foot ladder", "Fiberglass. Fine indoors or out.", "tools", "good", 1, "available", 4, true, false, "Two people to carry it. Don't stand on the top two rungs.", ""],
      [saw, sam, "Circular saw", "Corded. I have a spare blade if you ask.", "tools", "good", 1, "available", 3, true, true, "Blade is sharp. Unplug it to change blades.", "Replace the blade if you chew it up."],
      [tent, chris, "6-person tent", "Stakes and footprint are in the same bag.", "camping", "good", 1, "available", 7, true, false, "Dry it before you pack it.", ""],
      [chairs, priya, "Folding chairs", "White resin. They stack.", "party", "fair", 8, "available", 3, false, false, "", ""],
      [jackets, maria, "Kids life jackets", "Two in the 30–50 lb range, two in 50–90.", "kids", "good", 4, "available", 7, true, false, "Check the weight label before you take one.", ""],
      [blower, chris, "Snow blower", "Waiting on a shear pin.", "yard", "worn", 1, "maintenance", 2, true, true, "", ""],
      [goals, ben, "Pop-up soccer goals", "Pair of them. The stakes are in the bag.", "sports", "good", 1, "available", 7, true, false, "", ""],
    ];

    for (const item of items) {
      await query(
        `insert into items (
          id, group_id, owner_id, title, description, category, condition, quantity,
          listing, max_days, needs_approval, consumable, safety_notes, replacement_note
        ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [item[0], groupId, item[1], item[2], item[3], item[4], item[5], item[6], item[7], item[8], item[9], item[10], item[11], item[12]],
      );
    }

    await query(
      `insert into item_links (id, item_id, label, url, position) values ($1,$2,$3,$4,0)`,
      [newId(), washer, "Pressure washers at Home Depot", "https://www.homedepot.com/b/Outdoors-Outdoor-Power-Equipment-Pressure-Washers/N-5yc1vZbxb8"],
    );

    await query(
      `insert into borrows (
        id, group_id, item_id, borrower_id, status, start_on, due_on, message,
        condition_out, checked_out_at, approved_at
      ) values ($1,$2,$3,$4,'checked_out',$5,$6,$7,'Clean, both feet intact.', now() - interval '6 days', now() - interval '6 days')`,
      [newId(), groupId, ladder, chris, addDays(today, -6), addDays(today, -2), "Gutter cleaning."],
    );

    await query(
      `insert into borrows (
        id, group_id, item_id, borrower_id, status, start_on, due_on, message
      ) values ($1,$2,$3,$4,'requested',$5,$6,$7)`,
      [newId(), groupId, saw, priya, addDays(today, 1), addDays(today, 3), "Building a bookshelf Saturday. I have blades."],
    );

    await query(
      `insert into asks (id, group_id, author_id, title, details, category) values ($1,$2,$3,$4,$5,'home')`,
      [askId, groupId, ben, "Carpet cleaner", "Kids spilled glitter slime. Need one before Saturday if it isn't already listed."],
    );
    await query(
      `insert into ask_replies (id, ask_id, author_id, body) values ($1,$2,$3,$4)`,
      [newId(), askId, maria, "I have a small one in the closet. I'll add it tonight."],
    );

    await query(
      `insert into invites (id, group_id, code, max_uses, note, created_by, expires_at)
       values ($1,$2,'CEDARLANE',20,'Block invite',$3, now() + interval '90 days')`,
      [newId(), groupId, sam],
    );

    await query(
      `insert into notifications (id, member_id, title, body, href) values
       ($1,$2,'Priya Shah wants Circular saw','Building a bookshelf Saturday.','/inventory/${saw}'),
       ($3,$2,'Ben Carter is looking for Carpet cleaner','Kids spilled glitter slime.','/asks/${askId}'),
       ($4,$2,'Jordan Lee wants in','18 Birch Court','/admin')`,
      [newId(), sam, newId(), newId()],
    );

    await query(`insert into app_meta (key, value) values ('demo', '1')`);
  });

  await sql(`select 1`);
}
