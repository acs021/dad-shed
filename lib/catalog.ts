export type Gear = {
  id: string;
  name: string;
  category: string;
  detail: string;
};

export type Ask = {
  id: string;
  text: string;
};

export const shelf: Gear[] = [
  {
    id: "drill",
    name: "Cordless drill",
    category: "Tools",
    detail: "Battery and charger stay with the drill.",
  },
  {
    id: "ladder",
    name: "6-foot ladder",
    category: "Tools",
    detail: "Bring it back the same day if you can.",
  },
  {
    id: "ball",
    name: "Soccer ball",
    category: "Sports",
    detail: "The pump is in the garage bin.",
  },
];

const asks: Ask[] = [];

export function listAsks(): Ask[] {
  return asks.map((ask) => ({ ...ask }));
}

export function addAsk(text: string): Ask {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Say what you need.");
  }
  if (trimmed.length > 140) {
    throw new Error("Keep it to 140 characters.");
  }
  const ask = { id: String(asks.length + 1), text: trimmed };
  asks.push(ask);
  return { ...ask };
}
