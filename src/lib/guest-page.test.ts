import { describe, expect, it } from "vitest";
import { eventPreview, wantsBlankForm } from "./guest-page";

describe("wantsBlankForm", () => {
  it("is true only for ?new=1", () => {
    expect(wantsBlankForm({ new: "1" })).toBe(true);
    expect(wantsBlankForm({})).toBe(false);
    expect(wantsBlankForm({ new: "0" })).toBe(false);
    expect(wantsBlankForm({ new: "" })).toBe(false);
    expect(wantsBlankForm({ new: ["1", "2"] })).toBe(false);
    expect(wantsBlankForm({ other: "1" })).toBe(false);
  });
});

describe("eventPreview", () => {
  it("builds the link-preview title and description from public event fields", () => {
    expect(
      eventPreview({
        title: "Burger Night",
        startsAt: new Date("2026-11-15T01:00:00Z"),
        timezone: "America/Chicago",
        hostName: "Will",
      }),
    ).toEqual({
      title: "Burger Night · Sat, Nov 14 · 7pm",
      description: "RSVP to Will's get-together",
    });
  });

  it("falls back to a generic preview when there is no event", () => {
    expect(eventPreview(null)).toEqual({
      title: "Spread",
      description: "RSVP to a get-together",
    });
  });
});
