import { describe, expect, it } from "vitest";
import { duplicateGuestIds } from "./guest-names";

describe("duplicateGuestIds", () => {
  it("flags every guest whose trimmed, lower-cased name matches another", () => {
    const ids = duplicateGuestIds([
      { id: "1", name: "Alex" },
      { id: "2", name: "  alex " },
      { id: "3", name: "Bea" },
      { id: "4", name: "ALEX" },
    ]);
    expect([...ids].sort()).toEqual(["1", "2", "4"]);
  });

  it("flags nobody when every name is different", () => {
    expect(duplicateGuestIds([{ id: "1", name: "Alex" }, { id: "2", name: "Alexa" }]).size).toBe(0);
  });
});
