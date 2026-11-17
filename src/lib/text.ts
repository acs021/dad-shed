export function todayFor(timeZone: string) {
  const zone = safeZone(timeZone);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(day: string, amount: number) {
  const [year, month, date] = day.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, date + amount));
  return next.toISOString().slice(0, 10);
}

export function daysBetween(start: string, due: string) {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [dy, dm, dd] = due.split("-").map(Number);
  const from = Date.UTC(sy, sm - 1, sd);
  const to = Date.UTC(dy, dm - 1, dd);
  return Math.round((to - from) / 86_400_000);
}

export function humanDate(day: string, today: string) {
  if (day === today) return "today";
  if (day === addDays(today, 1)) return "tomorrow";
  if (day === addDays(today, -1)) return "yesterday";
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function safeHttpUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 500) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  return url.toString();
}

export function safePath(href: string) {
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\")) return "/";
  return href;
}

export function mapsDirections(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

export function researchLinks(title: string) {
  const query = encodeURIComponent(title);
  return [
    { label: "Web", href: `https://www.google.com/search?q=${query}` },
    { label: "Home Depot", href: `https://www.homedepot.com/s/${query}` },
    { label: "REI", href: `https://www.rei.com/search?q=${query}` },
    { label: "Amazon", href: `https://www.amazon.com/s?k=${query}` },
  ];
}

export function telHref(phone: string) {
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.replace(/\D/g, "").length < 7) return null;
  return `tel:${cleaned}`;
}

export function formatAddress(parts: {
  addressLine: string;
  city: string;
  region: string;
  postalCode: string;
}) {
  const street = parts.addressLine.trim();
  const locality = [parts.city.trim(), parts.region.trim()].filter(Boolean).join(", ");
  const tail = [locality, parts.postalCode.trim()].filter(Boolean).join(" ");
  return [street, tail].filter(Boolean).join(", ");
}

export function likePattern(query: string) {
  return `%${query.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

function safeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return "UTC";
  }
}
