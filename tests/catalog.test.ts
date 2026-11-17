import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addAsk, listAsks, shelf } from "../lib/catalog.ts";

describe("shed catalog", () => {
  it("starts with three things on the shelf", () => {
    assert.equal(shelf.length, 3);
    assert.deepEqual(
      shelf.map((item) => item.name),
      ["Cordless drill", "6-foot ladder", "Soccer ball"],
    );
  });

  it("saves a trimmed ask and lists it", () => {
    const before = listAsks().length;
    const ask = addAsk("  hedge trimmer  ");
    assert.equal(ask.text, "hedge trimmer");
    const saved = listAsks();
    assert.equal(saved.length, before + 1);
    assert.equal(saved.at(-1)?.text, "hedge trimmer");
  });

  it("rejects an empty ask", () => {
    assert.throws(() => addAsk("   "), /Say what you need/);
  });
});
