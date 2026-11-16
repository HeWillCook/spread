// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { computeHeadcount } from "@/domain/headcount";
import { buildTodayPlan, type TodayShoppingLine } from "./today-plan";
import { zonedLocalToDate } from "./zoned-time";

const startsAt = zonedLocalToDate("2026-11-14T19:00", "America/Chicago");

const prepSheet = {
  when: "Sat, Nov 14 · 7pm · Backyard",
  headcount: computeHeadcount([
    { status: "yes", plusOnes: 1 },
    { status: "maybe", plusOnes: 1 },
  ]),
  headcountLine: "2 confirmed + ~1 from maybes · range 2–4",
  dishes: [
    {
      dishId: "dish-1",
      name: "Burgers",
      emoji: "🍔",
      servings: 12,
      servingsPerPerson: 1.5,
      servingsLabel: "12 burgers",
      ingredients: [],
    },
    {
      dishId: "dish-2",
      name: "Slaw",
      emoji: "🥗",
      servings: 6,
      servingsPerPerson: 0.75,
      servingsLabel: "6 bowls",
      ingredients: [],
    },
  ],
};

const shopping: TodayShoppingLine[] = [
  { itemId: "i1", name: "Ground beef", buyQty: 4, buyUnit: "lb", checked: false, needsReview: false },
  { itemId: "i2", name: "Buns", buyQty: 2, buyUnit: "pack", checked: true, needsReview: false },
  { itemId: "i3", name: "Cheese", buyQty: 1, buyUnit: "pack", checked: false, needsReview: true },
  { itemId: "i4", name: "Ice", buyQty: 0, buyUnit: "bag", checked: false, needsReview: false },
];

const build = () =>
  buildTodayPlan({
    event: { id: "evt-1", title: "Party", startsAt, timezone: "America/Chicago" },
    shopping,
    prepSheet,
  });

describe("buildTodayPlan", () => {
  const originalTz = process.env.TZ;

  // Restore the process time zone so other tests are unaffected.
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it("shows milestone times on the event's own clock", () => {
    const plan = build();
    expect(plan.milestones).toEqual([
      { id: "shopping-done", label: "Shopping done", timeLabel: "9:00 AM" },
      { id: "start-prep", label: "Start prep", timeLabel: "4:00 PM" },
      { id: "set-up", label: "Set up", timeLabel: "6:00 PM" },
      { id: "guests-arrive", label: "Guests arrive", timeLabel: "7:00 PM" },
    ]);
  });

  it("keeps the same labels whatever the server's own time zone", () => {
    for (const tz of ["UTC", "Asia/Tokyo", "America/Los_Angeles"]) {
      process.env.TZ = tz;
      expect(build().milestones.map((m) => m.timeLabel)).toEqual([
        "9:00 AM",
        "4:00 PM",
        "6:00 PM",
        "7:00 PM",
      ]);
    }
  });

  it("pulls shopping earlier for an event that starts before 1pm", () => {
    const morning = zonedLocalToDate("2026-11-14T11:00", "America/Chicago");
    const plan = buildTodayPlan({
      event: { id: "evt-1", title: "Brunch", startsAt: morning, timezone: "America/Chicago" },
      shopping,
      prepSheet,
    });
    expect(plan.milestones.map((m) => m.timeLabel)).toEqual([
      "7:00 AM",
      "8:00 AM",
      "10:00 AM",
      "11:00 AM",
    ]);
  });

  it("lists only unticked shopping that needs buying", () => {
    const plan = build();
    expect(plan.shopping.map((item) => item.id)).toEqual(["shop:i1", "shop:i3"]);
    expect(plan.shopping[0]).toEqual({
      id: "shop:i1",
      label: "Ground beef",
      detail: "4 lb to buy",
    });
    expect(plan.shopping[1].detail).toContain("recheck the amount");
  });

  it("makes one prep row per dish with the servings to make", () => {
    const plan = build();
    expect(plan.prep).toEqual([
      { id: "prep:dish-1", label: "Burgers", detail: "make 12 burgers" },
      { id: "prep:dish-2", label: "Slaw", detail: "make 6 bowls" },
    ]);
  });

  it("carries the event identity, when line and planning headcount", () => {
    expect(build()).toMatchObject({
      eventId: "evt-1",
      title: "Party",
      when: "Sat, Nov 14 · 7pm · Backyard",
      planFor: 3,
      headcountLine: "2 confirmed + ~1 from maybes · range 2–4",
    });
  });
});
