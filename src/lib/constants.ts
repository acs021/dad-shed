export const CATEGORIES = [
  { id: "tools", label: "Tools" },
  { id: "yard", label: "Yard & garden" },
  { id: "sports", label: "Sports" },
  { id: "camping", label: "Camping" },
  { id: "party", label: "Party" },
  { id: "kids", label: "Kids" },
  { id: "auto", label: "Auto" },
  { id: "kitchen", label: "Kitchen" },
  { id: "home", label: "Home" },
  { id: "electronics", label: "Electronics" },
  { id: "other", label: "Other" },
] as const;

export const CONDITIONS = [
  { id: "excellent", label: "Excellent" },
  { id: "good", label: "Good" },
  { id: "fair", label: "Fair" },
  { id: "worn", label: "Worn" },
] as const;

export const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
] as const;

export const DEFAULT_RULES = `Dad Shed is a favor between neighbors, not a rental shop.

• Borrow only what you can return on time, clean, and in the same shape.
• If something breaks, you repair it or replace it, and you say so the same day.
• Don't hand a borrowed item to someone who isn't in the shed.
• Blades, fuel, filters, and other consumables get replaced by the borrower.
• Pick up and drop off at the time you agreed. Gate codes stay between the two of you.
• No weapons. If a tool can hurt someone, read the note and use it like the owner would.
• Admins can pause a membership that breaks that trust.`;

export const DEFAULT_TAGLINE = "Borrow it from someone on the block.";

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type ConditionId = (typeof CONDITIONS)[number]["id"];

export function categoryLabel(id: string) {
  return CATEGORIES.find((category) => category.id === id)?.label ?? id;
}

export function conditionLabel(id: string) {
  return CONDITIONS.find((condition) => condition.id === id)?.label ?? id;
}
