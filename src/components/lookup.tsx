"use client";

import { researchLinks } from "@/lib/text";

const LABELS = ["Web", "Home Depot", "REI", "Amazon"];

export function LookupButtons() {
  function open(label: string) {
    const title = document.querySelector<HTMLInputElement>('input[name="title"]')?.value.trim() ?? "";
    if (!title) return;
    const link = researchLinks(title).find((entry) => entry.label === label);
    if (link) window.open(link.href, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="stack tight">
      <p className="muted">Look it up, then paste a link worth keeping.</p>
      <div className="actions">
        {LABELS.map((label) => (
          <button key={label} type="button" className="button quiet" onClick={() => open(label)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
