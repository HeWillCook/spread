// @vitest-environment node
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { events, guests } from "@/db/schema";
import { seedStarterRecipes } from "@/db/seed";
import { createTestDb } from "@/db/test-db";
import { venmoPayLink } from "@/domain/venmo";
import { NotFoundError, ValidationError } from "./errors";
import { createEvent } from "./events";
import { addDishToEvent } from "./menu";
import { submitRsvp } from "./rsvp";
import { addExtraCost, setChecked } from "./shopping";
import {
  getSplitView,
  markLinkSent,
  setAttended,
  setExcluded,
  setHostCover,
  setPaid,
  setVenmoUsername,
} from "./split";

let db: Db;
let eventId: string;
let shareCode: string;

beforeEach(async () => {
  db = await createTestDb();
  await seedStarterRecipes(db);
  ({ id: eventId, shareCode } = await createEvent(db, "host-1", {
    title: "Cookout",
    startsAt: new Date("2026-07-04T18:00:00Z"),
    location: "Backyard",
    hostName: "Will",
  }));
});

async function rsvp(
  name: string,
  status: "yes" | "maybe" | "no" = "yes",
  plusOneNames: string[] = [],
): Promise<string> {
  return (await submitRsvp(db, { shareCode, name, status, plusOneNames })).guestId;
}

/** A $90.00 shopping total made only of an extra cost, so shares are easy to read. */
async function ninetyDollars() {
  await addExtraCost(db, "host-1", eventId, "Everything", 9000);
}

function row(view: Awaited<ReturnType<typeof getSplitView>>, guestId: string) {
  const found = view.rows.find((r) => r.guestId === guestId);
  if (!found) throw new Error(`no row ${guestId}`);
  return found;
}

describe("getSplitView", () => {
  it("carries unresolved shopping quantity reviews into the split", async () => {
    await rsvp("Ann");
    await addDishToEvent(db, "host-1", eventId, "starter-burgers");
    await setChecked(db, "host-1", eventId, "starter-burgers-beef", true);
    expect((await getSplitView(db, "host-1", eventId)).totalIsProvisional).toBe(false);
    await rsvp("Late family", "yes", ["Guest one", "Guest two"]);
    expect((await getSplitView(db, "host-1", eventId)).totalIsProvisional).toBe(true);
  });
  it("only attended guests owe, and the shares sum to the shopping total", async () => {
    await rsvp("Seed 1", "yes", ["P1"]);
    await rsvp("Seed 2", "maybe", ["P2", "P3"]);
    await addDishToEvent(db, "host-1", eventId, "starter-burgers");
    const a = await rsvp("Ann");
    const b = await rsvp("Bo");
    const c = await rsvp("Cy");
    await setAttended(db, "host-1", eventId, a, true);
    await setAttended(db, "host-1", eventId, b, true);

    const view = await getSplitView(db, "host-1", eventId);
    expect(view.totalCents).toBeGreaterThan(0);
    expect(row(view, c).owedCents).toBe(0);
    expect(row(view, c).attended).toBe(false);
    expect(row(view, a).owedCents + row(view, b).owedCents).toBe(view.totalCents);
    expect(view.rows.reduce((sum, r) => sum + r.owedCents, 0)).toBe(view.totalCents);
    expect(view.unassignedCents).toBe(0);
    expect(view.hostCoveredCents).toBe(0);
  });

  it("a guest with 2 plus-ones owes 3 shares", async () => {
    await ninetyDollars();
    const big = await rsvp("Big family", "yes", ["Kid 1", "Kid 2"]);
    const solo = await rsvp("Solo");
    await setAttended(db, "host-1", eventId, big, true);
    await setAttended(db, "host-1", eventId, solo, true);

    const view = await getSplitView(db, "host-1", eventId);
    expect(row(view, big).heads).toBe(3);
    expect(row(view, solo).heads).toBe(1);
    expect(row(view, big).owedCents).toBe(6750);
    expect(row(view, solo).owedCents).toBe(2250);
  });

  it("excluding a guest redistributes their share to the others, without touching their status", async () => {
    await ninetyDollars();
    const a = await rsvp("Ann");
    const b = await rsvp("Bo");
    const kid = await rsvp("Kid", "maybe");
    for (const id of [a, b, kid]) await setAttended(db, "host-1", eventId, id, true);
    expect(row(await getSplitView(db, "host-1", eventId), a).owedCents).toBe(3000);

    await setExcluded(db, "host-1", eventId, kid, true);
    const view = await getSplitView(db, "host-1", eventId);
    expect(row(view, kid)).toMatchObject({ excluded: true, attended: true, owedCents: 0 });
    expect(row(view, a).owedCents).toBe(4500);
    expect(row(view, b).owedCents).toBe(4500);

    await setExcluded(db, "host-1", eventId, kid, false);
    expect(row(await getSplitView(db, "host-1", eventId), a).owedCents).toBe(3000);
  });

  it("never changes a guest's yes/maybe/no status (ruling 5)", async () => {
    const yes = await rsvp("Yes", "yes");
    const maybe = await rsvp("Maybe", "maybe");
    const no = await rsvp("No", "no");
    await setAttended(db, "host-1", eventId, yes, true);
    await setAttended(db, "host-1", eventId, maybe, true);
    await setAttended(db, "host-1", eventId, no, true);
    await setExcluded(db, "host-1", eventId, yes, true);
    await setExcluded(db, "host-1", eventId, maybe, true);
    await setAttended(db, "host-1", eventId, yes, false);
    await setPaid(db, "host-1", eventId, no, true);
    await markLinkSent(db, "host-1", eventId, no, 1000);

    const rows = await db.select({ id: guests.id, status: guests.status }).from(guests);
    const byId = Object.fromEntries(rows.map((r) => [r.id, r.status]));
    expect(byId).toEqual({ [yes]: "yes", [maybe]: "maybe", [no]: "no" });
  });

  it("lists everyone except 'no' guests who did not attend; a 'no' guest who came is listed", async () => {
    const yes = await rsvp("Yes");
    const maybe = await rsvp("Maybe", "maybe");
    const no = await rsvp("No", "no");
    const view = await getSplitView(db, "host-1", eventId);
    // These writes can share a timestamp; the service breaks ties by name.
    // This test covers membership, not insertion order.
    expect(view.rows.map((r) => r.guestId).sort()).toEqual([yes, maybe].sort());

    await setAttended(db, "host-1", eventId, no, true);
    const after = await getSplitView(db, "host-1", eventId);
    expect(after.rows.map((r) => r.guestId).sort()).toEqual([yes, maybe, no].sort());
    expect(row(after, no).attended).toBe(true);
  });

  it("exposes 'no' guests who did not come in saidNo; ticking moves them into the split, unticking moves them back", async () => {
    await ninetyDollars();
    const yes = await rsvp("Yes");
    const no = await rsvp("Nope", "no", ["Their Friend"]);
    await setAttended(db, "host-1", eventId, yes, true);

    const before = await getSplitView(db, "host-1", eventId);
    expect(before.rows.map((r) => r.guestId)).toEqual([yes]);
    expect(before.saidNo).toHaveLength(1);
    expect(before.saidNo[0]).toMatchObject({
      guestId: no,
      name: "Nope",
      attended: false,
      heads: 2,
      owedCents: 0,
      venmoUrl: null,
    });
    expect(row(before, yes).owedCents).toBe(9000);

    await setAttended(db, "host-1", eventId, no, true);
    const came = await getSplitView(db, "host-1", eventId);
    expect(came.saidNo).toEqual([]);
    expect(row(came, no)).toMatchObject({ attended: true, heads: 2, owedCents: 6000 });
    expect(row(came, yes).owedCents).toBe(3000);

    await setAttended(db, "host-1", eventId, no, false);
    const back = await getSplitView(db, "host-1", eventId);
    expect(back.saidNo.map((r) => r.guestId)).toEqual([no]);
    expect(back.rows.map((r) => r.guestId)).toEqual([yes]);
    expect(row(back, yes).owedCents).toBe(9000);
  });

  it("saidNo is empty when nobody said no, and never holds yes or maybe guests", async () => {
    await rsvp("Yes");
    await rsvp("Maybe", "maybe");
    expect((await getSplitView(db, "host-1", eventId)).saidNo).toEqual([]);
  });

  it("venmoUrl is null until a username is set, then matches venmoPayLink", async () => {
    await ninetyDollars();
    const a = await rsvp("Ann");
    const b = await rsvp("Bo");
    const c = await rsvp("Cy");
    await setAttended(db, "host-1", eventId, a, true);
    await setAttended(db, "host-1", eventId, b, true);

    let view = await getSplitView(db, "host-1", eventId);
    expect(view.venmoUsername).toBeNull();
    expect(view.rows.every((r) => r.venmoUrl === null)).toBe(true);

    await setVenmoUsername(db, "host-1", eventId, "@Will-Cook");
    view = await getSplitView(db, "host-1", eventId);
    expect(view.venmoUsername).toBe("Will-Cook");
    expect(row(view, a).venmoUrl).toBe(
      venmoPayLink({ username: "Will-Cook", amountCents: 4500, note: "Cookout: your share" }),
    );
    // Not attended -> nothing to pay.
    expect(row(view, c).venmoUrl).toBeNull();
  });

  it("venmoUrl is null for an owed amount of 0 (excluded or fully covered)", async () => {
    await ninetyDollars();
    const a = await rsvp("Ann");
    const kid = await rsvp("Kid");
    await setAttended(db, "host-1", eventId, a, true);
    await setAttended(db, "host-1", eventId, kid, true);
    await setExcluded(db, "host-1", eventId, kid, true);
    await setVenmoUsername(db, "host-1", eventId, "willcook");
    let view = await getSplitView(db, "host-1", eventId);
    expect(row(view, kid).venmoUrl).toBeNull();
    expect(row(view, a).venmoUrl).not.toBeNull();

    await setHostCover(db, "host-1", eventId, 9000);
    view = await getSplitView(db, "host-1", eventId);
    expect(row(view, a).owedCents).toBe(0);
    expect(row(view, a).venmoUrl).toBeNull();
  });

  it("with nobody attending nobody owes and unassignedCents equals the charge", async () => {
    await ninetyDollars();
    await rsvp("Ann");
    await setHostCover(db, "host-1", eventId, 2000);
    const view = await getSplitView(db, "host-1", eventId);
    expect(view.rows.every((r) => r.owedCents === 0)).toBe(true);
    expect(view.totalCents).toBe(9000);
    expect(view.hostCoveredCents).toBe(2000);
    expect(view.unassignedCents).toBe(7000);
  });

  it("the host cover comes off the charge before it is split", async () => {
    await ninetyDollars();
    const a = await rsvp("Ann");
    const b = await rsvp("Bo");
    await setAttended(db, "host-1", eventId, a, true);
    await setAttended(db, "host-1", eventId, b, true);
    await setHostCover(db, "host-1", eventId, 3000);
    const view = await getSplitView(db, "host-1", eventId);
    expect(view.hostCoveredCents).toBe(3000);
    expect(row(view, a).owedCents).toBe(3000);
    expect(row(view, b).owedCents).toBe(3000);
  });

  it("a host cover larger than the total is clamped by the split math", async () => {
    await ninetyDollars();
    const a = await rsvp("Ann");
    await setAttended(db, "host-1", eventId, a, true);
    await setHostCover(db, "host-1", eventId, 50_000);
    const view = await getSplitView(db, "host-1", eventId);
    expect(view.hostCoveredCents).toBe(9000);
    expect(row(view, a).owedCents).toBe(0);
    expect(view.unassignedCents).toBe(0);
  });

  it("paid and linkSentAt persist and show up in the rows", async () => {
    const a = await rsvp("Ann");
    let view = await getSplitView(db, "host-1", eventId);
    expect(row(view, a)).toMatchObject({
      paid: false,
      linkSentAt: null,
      linkSentAmountCents: null,
      linkAmountChanged: false,
    });

    await setPaid(db, "host-1", eventId, a, true);
    await markLinkSent(db, "host-1", eventId, a, 1000);
    view = await getSplitView(db, "host-1", eventId);
    expect(row(view, a).paid).toBe(true);
    expect(row(view, a).linkSentAt).toBeInstanceOf(Date);
    expect(row(view, a).linkSentAmountCents).toBe(1000);

    await setPaid(db, "host-1", eventId, a, false);
    expect(row(await getSplitView(db, "host-1", eventId), a).paid).toBe(false);
  });

  it("records the amount actually sent, and flags the link once the owed amount changes", async () => {
    await ninetyDollars();
    const a = await rsvp("Ann");
    const b = await rsvp("Bo");
    await setAttended(db, "host-1", eventId, a, true);
    await setAttended(db, "host-1", eventId, b, true);
    await markLinkSent(db, "host-1", eventId, a, 4500);

    let view = await getSplitView(db, "host-1", eventId);
    expect(row(view, a)).toMatchObject({
      owedCents: 4500,
      linkSentAmountCents: 4500,
      linkAmountChanged: false,
    });

    // A bigger shopping total: the sent link is now for the wrong amount.
    await addExtraCost(db, "host-1", eventId, "Ice", 3000);
    view = await getSplitView(db, "host-1", eventId);
    expect(row(view, a)).toMatchObject({
      owedCents: 6000,
      linkSentAmountCents: 4500,
      linkAmountChanged: true,
      paid: false,
    });
    expect(row(view, a).linkSentAt).toBeInstanceOf(Date);
  });

  it("flags the link when another guest joins and changes the share", async () => {
    await ninetyDollars();
    const a = await rsvp("Ann");
    const b = await rsvp("Bo");
    await setAttended(db, "host-1", eventId, a, true);
    await markLinkSent(db, "host-1", eventId, a, 9000);
    expect(row(await getSplitView(db, "host-1", eventId), a).linkAmountChanged).toBe(false);

    await setAttended(db, "host-1", eventId, b, true);
    expect(row(await getSplitView(db, "host-1", eventId), a)).toMatchObject({
      owedCents: 4500,
      linkSentAmountCents: 9000,
      linkAmountChanged: true,
    });
  });

  it("keeps a host-entered paid flag when the link amount goes stale", async () => {
    await ninetyDollars();
    const a = await rsvp("Ann");
    await setAttended(db, "host-1", eventId, a, true);
    await markLinkSent(db, "host-1", eventId, a, 9000);
    await setPaid(db, "host-1", eventId, a, true);

    await addExtraCost(db, "host-1", eventId, "Ice", 1000);
    const view = await getSplitView(db, "host-1", eventId);
    expect(row(view, a)).toMatchObject({ paid: true, linkAmountChanged: true });
  });

  it("treats a link sent before amounts were recorded as needing a fresh link", async () => {
    await ninetyDollars();
    const a = await rsvp("Ann");
    await setAttended(db, "host-1", eventId, a, true);
    // A legacy row: the old code stamped the time but never the amount.
    await db.update(guests).set({ linkSentAt: new Date() }).where(eq(guests.id, a));

    const view = await getSplitView(db, "host-1", eventId);
    expect(row(view, a)).toMatchObject({
      linkSentAmountCents: null,
      linkAmountChanged: true,
      owedCents: 9000,
    });
  });
});

describe("setHostCover", () => {
  it("stores integer cents and rejects negatives and non-integers", async () => {
    await setHostCover(db, "host-1", eventId, 1250);
    expect((await getSplitView(db, "host-1", eventId)).hostCoveredCents).toBe(0); // total is 0
    const [e] = await db.select().from(events).where(eq(events.id, eventId));
    expect(e.hostCoverCents).toBe(1250);

    for (const bad of [-1, 12.5, Number.NaN, Number.POSITIVE_INFINITY, 1e12]) {
      await expect(setHostCover(db, "host-1", eventId, bad)).rejects.toBeInstanceOf(ValidationError);
    }
    const [after] = await db.select().from(events).where(eq(events.id, eventId));
    expect(after.hostCoverCents).toBe(1250);
  });
});

describe("markLinkSent", () => {
  it("rejects an invalid amount and writes nothing", async () => {
    const a = await rsvp("Ann");
    for (const bad of [-1, 12.5, Number.NaN, Number.POSITIVE_INFINITY, 1_000_001]) {
      await expect(markLinkSent(db, "host-1", eventId, a, bad)).rejects.toBeInstanceOf(
        ValidationError,
      );
    }
    const [g] = await db.select().from(guests).where(eq(guests.id, a));
    expect(g).toMatchObject({ linkSentAt: null, linkSentAmountCents: null });
  });

  it("updates the stored amount when a fresh link is sent", async () => {
    const a = await rsvp("Ann");
    await markLinkSent(db, "host-1", eventId, a, 1000);
    await markLinkSent(db, "host-1", eventId, a, 2500);
    const [g] = await db.select().from(guests).where(eq(guests.id, a));
    expect(g.linkSentAmountCents).toBe(2500);
  });
});

describe("setVenmoUsername", () => {
  async function stored() {
    const [e] = await db.select().from(events).where(eq(events.id, eventId));
    return e.venmoUsername;
  }

  it("trims and strips a leading @", async () => {
    await setVenmoUsername(db, "host-1", eventId, "  @will_cook-1  ");
    expect(await stored()).toBe("will_cook-1");
  });

  it("blank or null clears it", async () => {
    await setVenmoUsername(db, "host-1", eventId, "willcook");
    await setVenmoUsername(db, "host-1", eventId, "   ");
    expect(await stored()).toBeNull();
    await setVenmoUsername(db, "host-1", eventId, "willcook");
    await setVenmoUsername(db, "host-1", eventId, null);
    expect(await stored()).toBeNull();
    await setVenmoUsername(db, "host-1", eventId, "willcook");
    await setVenmoUsername(db, "host-1", eventId, "@");
    expect(await stored()).toBeNull();
  });

  it("rejects characters Venmo does not allow and bad lengths", async () => {
    for (const bad of ["will cook", "will/cook", "will.cook", "a?b=cde", "abcd", "x".repeat(31), "@@willcook"]) {
      await expect(setVenmoUsername(db, "host-1", eventId, bad)).rejects.toBeInstanceOf(ValidationError);
    }
    expect(await stored()).toBeNull();
  });
});

describe("host and event scoping", () => {
  it("every function throws NotFoundError for another host, and writes nothing", async () => {
    const a = await rsvp("Ann");
    await expect(getSplitView(db, "host-2", eventId)).rejects.toBeInstanceOf(NotFoundError);
    await expect(setAttended(db, "host-2", eventId, a, true)).rejects.toBeInstanceOf(NotFoundError);
    await expect(setExcluded(db, "host-2", eventId, a, true)).rejects.toBeInstanceOf(NotFoundError);
    await expect(setPaid(db, "host-2", eventId, a, true)).rejects.toBeInstanceOf(NotFoundError);
    await expect(markLinkSent(db, "host-2", eventId, a, 1000)).rejects.toBeInstanceOf(NotFoundError);
    await expect(setHostCover(db, "host-2", eventId, 100)).rejects.toBeInstanceOf(NotFoundError);
    await expect(setVenmoUsername(db, "host-2", eventId, "willcook")).rejects.toBeInstanceOf(
      NotFoundError,
    );

    const [g] = await db.select().from(guests).where(eq(guests.id, a));
    expect(g).toMatchObject({ attended: false, excluded: false, paid: false, linkSentAt: null });
    const [e] = await db.select().from(events).where(eq(events.id, eventId));
    expect(e).toMatchObject({ hostCoverCents: 0, venmoUsername: null });
  });

  it("a guest id from another event is a NotFoundError and that guest is untouched", async () => {
    const { id: otherEventId, shareCode: otherCode } = await createEvent(db, "host-1", {
      title: "Other",
      startsAt: new Date("2026-08-01T18:00:00Z"),
      location: "Park",
      hostName: "Will",
    });
    const { guestId: foreign } = await submitRsvp(db, {
      shareCode: otherCode,
      name: "Elsewhere",
      status: "yes",
      plusOneNames: [],
    });

    await expect(setAttended(db, "host-1", eventId, foreign, true)).rejects.toBeInstanceOf(NotFoundError);
    await expect(setExcluded(db, "host-1", eventId, foreign, true)).rejects.toBeInstanceOf(NotFoundError);
    await expect(setPaid(db, "host-1", eventId, foreign, true)).rejects.toBeInstanceOf(NotFoundError);
    await expect(markLinkSent(db, "host-1", eventId, foreign, 1000)).rejects.toBeInstanceOf(NotFoundError);
    await expect(setAttended(db, "host-1", eventId, "no-such-guest", true)).rejects.toBeInstanceOf(
      NotFoundError,
    );

    const [g] = await db.select().from(guests).where(eq(guests.id, foreign));
    expect(g).toMatchObject({ attended: false, excluded: false, paid: false, linkSentAt: null });
    expect((await getSplitView(db, "host-1", otherEventId)).rows.map((r) => r.guestId)).toEqual([
      foreign,
    ]);
  });
});
