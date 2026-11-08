import { describe, expect, it } from "vitest";
import { buildVenmoMessage, firstName } from "./venmo-message";

describe("firstName", () => {
  it("takes the first word of a trimmed name", () => {
    expect(firstName("  Pat   Guest ")).toBe("Pat");
    expect(firstName("Madonna")).toBe("Madonna");
  });
  it("falls back to 'there' for a blank name", () => {
    expect(firstName("   ")).toBe("there");
  });
});

describe("buildVenmoMessage", () => {
  it("greets by first name, names the event and amount, and ends with the link", () => {
    expect(
      buildVenmoMessage({
        name: "Pat Guest",
        eventTitle: "Burger Night",
        owedCents: 3775,
        url: "https://venmo.com/willcook?txn=pay&amount=37.75",
      }),
    ).toBe(
      "Hi Pat, your share of Burger Night is $37.75: https://venmo.com/willcook?txn=pay&amount=37.75",
    );
  });
  it("formats cents with two decimals", () => {
    expect(
      buildVenmoMessage({ name: "Bo", eventTitle: "BBQ", owedCents: 500, url: "https://venmo.com/x" }),
    ).toContain("$5.00");
  });
});
