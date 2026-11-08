// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { NotFoundError, ValidationError } from "./errors";
import { addInvitees, createEvent, getHostEvent } from "./events";
import { getGuestsOverview, setMaybePercent } from "./guestsOverview";
import { submitRsvp } from "./rsvp";

let db: Db;
let eventId: string;
let shareCode: string;

beforeEach(async () => {
  db = await createTestDb();
  ({ id: eventId, shareCode } = await createEvent(db, "host-1", {
    title: "Cookout",
    startsAt: new Date("2026-07-04T18:00:00Z"),
    location: "Backyard",
    hostName: "Will",
  }));
});

/** 12 yes heads (8 guests + 4 plus-ones) and 5 maybe heads (3 guests + 2 plus-ones). */
async function seedTwelveYesFiveMaybe() {
  for (let i = 1; i <= 8; i++) {
    await submitRsvp(db, {
      shareCode,
      name: `Yes ${i}`,
      status: "yes",
      plusOneNames: i <= 4 ? [`Friend ${i}`] : [],
      foodNotes: i === 1 ? "no peanuts" : undefined,
    });
  }
  await submitRsvp(db, { shareCode, name: "Maybe 1", status: "maybe", plusOneNames: ["Mf1", "Mf2"] });
  await submitRsvp(db, { shareCode, name: "Maybe 2", status: "maybe", plusOneNames: [] });
  await submitRsvp(db, { shareCode, name: "Maybe 3", status: "maybe", plusOneNames: [] });
  await submitRsvp(db, { shareCode, name: "Nope", status: "no", plusOneNames: [] });
}

describe("getGuestsOverview", () => {
  it("12 yes + 5 maybe at 50% plans for 15 with a 12-17 range", async () => {
    await seedTwelveYesFiveMaybe();
    const { headcount, counts } = await getGuestsOverview(db, "host-1", eventId);
    expect(headcount).toMatchObject({ confirmed: 12, maybeHeads: 5, planFor: 15, low: 12, high: 17 });
    expect(counts).toEqual({ yes: 8, maybe: 3, no: 1 });
  });

  it("lists guests with plus-ones and food notes", async () => {
    await seedTwelveYesFiveMaybe();
    const { guests } = await getGuestsOverview(db, "host-1", eventId);
    expect(guests).toHaveLength(12);
    const first = guests.find((g) => g.name === "Yes 1");
    expect(first).toMatchObject({
      status: "yes",
      plusOneNames: ["Friend 1"],
      foodNotes: "no peanuts",
    });
    expect(guests.find((g) => g.name === "Nope")).toMatchObject({
      status: "no",
      plusOneNames: [],
      foodNotes: null,
    });
  });

  it("returns an empty overview for an event with no guests", async () => {
    const o = await getGuestsOverview(db, "host-1", eventId);
    expect(o.guests).toEqual([]);
    expect(o.counts).toEqual({ yes: 0, maybe: 0, no: 0 });
    expect(o.headcount.planFor).toBe(0);
  });

  it("noReply is null when the event has no invitee list", async () => {
    await seedTwelveYesFiveMaybe();
    expect((await getGuestsOverview(db, "host-1", eventId)).noReply).toBeNull();
  });

  it("noReply lists invitees who have not answered once an invitee list exists", async () => {
    await addInvitees(db, "host-1", eventId, ["Alex", "Sam"]);
    await submitRsvp(db, { shareCode, name: "alex", status: "yes", plusOneNames: [] });
    expect((await getGuestsOverview(db, "host-1", eventId)).noReply).toEqual(["Sam"]);
  });

  it("noReply is an empty list (not null) when every invitee has answered", async () => {
    await addInvitees(db, "host-1", eventId, ["Alex"]);
    await submitRsvp(db, { shareCode, name: "Alex", status: "no", plusOneNames: [] });
    expect((await getGuestsOverview(db, "host-1", eventId)).noReply).toEqual([]);
  });

  it("throws NotFoundError for another host's event", async () => {
    await expect(getGuestsOverview(db, "host-2", eventId)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("setMaybePercent", () => {
  it("0% makes planFor equal the confirmed count", async () => {
    await seedTwelveYesFiveMaybe();
    await setMaybePercent(db, "host-1", eventId, 0);
    const { headcount } = await getGuestsOverview(db, "host-1", eventId);
    expect(headcount.planFor).toBe(12);
    expect((await getHostEvent(db, "host-1", eventId)).maybePercent).toBe(0);
  });

  it("100% plans for every maybe", async () => {
    await seedTwelveYesFiveMaybe();
    await setMaybePercent(db, "host-1", eventId, 100);
    expect((await getGuestsOverview(db, "host-1", eventId)).headcount.planFor).toBe(17);
  });

  it("rejects values outside 0..100 and non-integers, leaving the percent unchanged", async () => {
    for (const bad of [101, -1, 50.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(setMaybePercent(db, "host-1", eventId, bad)).rejects.toBeInstanceOf(
        ValidationError,
      );
    }
    expect((await getHostEvent(db, "host-1", eventId)).maybePercent).toBe(50);
  });

  it("does not change any guest's status", async () => {
    await seedTwelveYesFiveMaybe();
    const before = (await getGuestsOverview(db, "host-1", eventId)).counts;
    await setMaybePercent(db, "host-1", eventId, 10);
    expect((await getGuestsOverview(db, "host-1", eventId)).counts).toEqual(before);
  });

  it("throws NotFoundError for another host's event and changes nothing", async () => {
    await expect(setMaybePercent(db, "host-2", eventId, 10)).rejects.toBeInstanceOf(NotFoundError);
    expect((await getHostEvent(db, "host-1", eventId)).maybePercent).toBe(50);
  });
});
