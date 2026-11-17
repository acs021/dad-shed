import { CATEGORIES, CONDITIONS, TIMEZONES } from "@/lib/constants";
import { safeHttpUrl } from "@/lib/text";
import { ShedError } from "@/server/errors";

export function line(value: unknown, label: string, max: number, required = true) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text && required) throw new ShedError(`${label} is required.`);
  if (text.length > max) throw new ShedError(`${label} needs to be under ${max} characters.`);
  return text;
}

export function block(value: unknown, label: string, max: number, required = false) {
  const text = String(value ?? "").replace(/\r\n/g, "\n").trim();
  if (!text && required) throw new ShedError(`${label} is required.`);
  if (text.length > max) throw new ShedError(`${label} needs to be under ${max} characters.`);
  return text;
}

export function emailAddress(value: unknown) {
  const email = String(value ?? "").trim().toLowerCase();
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ShedError("Enter a valid email.");
  }
  return email;
}

export function passwordValue(value: unknown) {
  const password = String(value ?? "");
  if (password.length < 10) throw new ShedError("Use at least 10 characters for the password.");
  if (password.length > 200) throw new ShedError("That password is too long.");
  return password;
}

export function inviteCode(value: unknown) {
  const code = String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (code.length < 4 || code.length > 20) throw new ShedError("Enter the invite code.");
  return code;
}

export function dayValue(value: unknown, label: string) {
  const day = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new ShedError(`${label} needs a date.`);
  const [year, month, date] = day.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, date));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== date
  ) {
    throw new ShedError(`${label} isn't a real date.`);
  }
  return day;
}

export function integer(value: unknown, label: string, min: number, max: number) {
  const raw = String(value ?? "").trim();
  if (!/^\d+$/.test(raw)) throw new ShedError(`${label} needs a whole number.`);
  const number = Number(raw);
  if (number < min || number > max) {
    throw new ShedError(`${label} needs to be between ${min} and ${max}.`);
  }
  return number;
}

export function optionalId(value: unknown) {
  const id = String(value ?? "").trim();
  if (!id) return "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new ShedError("That choice isn't available.");
  }
  return id;
}

const PHOTO = /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=\s]+$/i;

export function photoValue(value: unknown) {
  const photo = String(value ?? "").trim();
  if (!photo) return "";
  if (photo.length > 160_000 || !PHOTO.test(photo)) {
    throw new ShedError("Use a smaller JPEG, PNG, or WebP.");
  }
  return photo;
}

export function linksFrom(formData: FormData) {
  const links: { label: string; url: string }[] = [];
  for (let index = 0; index < 4; index += 1) {
    const label = String(formData.get(`link_label_${index}`) ?? "").trim();
    const url = String(formData.get(`link_url_${index}`) ?? "").trim();
    if (!label && !url) continue;
    if (!label || !url) throw new ShedError("Each research link needs a label and a URL.");
    const safe = safeHttpUrl(url);
    if (!safe) throw new ShedError("Research links have to start with http:// or https://.");
    links.push({ label: line(label, "Link label", 80), url: safe });
  }
  return links;
}

export function categoryValue(value: unknown, required = true) {
  const category = String(value ?? "").trim();
  if (!category && !required) return "";
  if (!CATEGORIES.some((entry) => entry.id === category)) throw new ShedError("Pick a category.");
  return category;
}

export function profileInput(formData: FormData) {
  return {
    name: line(formData.get("name"), "Name", 80),
    household: line(formData.get("household"), "Household", 80, false),
    email: emailAddress(formData.get("email")),
    phone: line(formData.get("phone"), "Phone", 40),
    addressLine: line(formData.get("address_line"), "Street address", 120),
    city: line(formData.get("city"), "City", 80),
    region: line(formData.get("region"), "State", 40),
    postalCode: line(formData.get("postal_code"), "Postal code", 20),
    pickupNotes: block(formData.get("pickup_notes"), "Pickup notes", 500),
    bio: block(formData.get("bio"), "About you", 400),
  };
}

export type ProfileInput = ReturnType<typeof profileInput>;

export function itemInput(formData: FormData) {
  const listingRaw = String(formData.get("listing") ?? "available");
  const listing = listingRaw === "maintenance" || listingRaw === "hidden" ? listingRaw : "available";
  const condition = String(formData.get("condition") ?? "good");
  if (!CONDITIONS.some((entry) => entry.id === condition)) throw new ShedError("Pick a condition.");
  return {
    title: line(formData.get("title"), "Name", 120),
    description: block(formData.get("description"), "Description", 2000),
    category: categoryValue(formData.get("category")),
    condition,
    listing,
    quantity: integer(formData.get("quantity") || "1", "Quantity", 1, 100),
    maxDays: integer(formData.get("max_days") || "7", "Lending window", 1, 90),
    needsApproval: formData.has("needs_approval"),
    consumable: formData.has("consumable"),
    safetyNotes: block(formData.get("safety_notes"), "Safety notes", 500),
    replacementNote: block(formData.get("replacement_note"), "If it breaks", 300),
    photo: photoValue(formData.get("photo")),
    links: linksFrom(formData),
  };
}

export type ItemInput = ReturnType<typeof itemInput>;

export function groupInput(formData: FormData) {
  const timezone = String(formData.get("timezone") ?? "");
  if (!(TIMEZONES as readonly string[]).includes(timezone)) throw new ShedError("Pick a timezone.");
  return {
    name: line(formData.get("shed_name") ?? formData.get("name"), "Shed name", 80),
    tagline: line(formData.get("tagline"), "Tagline", 140, false),
    rules: block(formData.get("rules"), "Rules", 4000, true),
    timezone,
  };
}

export function rejectHoneypot(formData: FormData) {
  if (String(formData.get("company") ?? "").trim()) {
    throw new ShedError("That didn't go through.");
  }
}
