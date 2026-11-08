// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { createTestDb } from "@/db/test-db";
import { events, guests, plusOnes } from "@/db/schema";
import { NotFoundError, ValidationError } from "./errors";
import { getGuestByToken, getPublicEvent, submitRsvp, updateRsvp } from "./rsvp";

let db: Db;

async function seedEvent(shareCode: string, id = `event-${shareCode}`) {
  await db.insert(events).values({
    id,
    hostId: "host-1",
    hostName: "Will",
    title: "Cookout",
    startsAt: new Date("2026-07-04T18:00:00Z"),
    location: "Backyard",
    shareCode,
  });
}

beforeEach(async () => {
  db = await createTestDb();
  await seedEvent("abc123");
});

const base = { shareCode: "abc123", name: "Alex", status: "yes" as const, plusOneNames: [] };

describe("submitRsvp", () => {
  it("stores the guest and plus-ones", async () => {
    const { guestId, editToken } = await submitRsvp(db, {
      ...base,
      plusOneNames: ["Sam", "Jo"],
      foodNotes: "no peanuts",
    });
    const [guest] = await db.select().from(guests).where(eq(guests.id, guestId));
    expect(guest.name).toBe("Alex");
    expect(guest.status).toBe("yes");
    expect(guest.foodNotes).toBe("no peanuts");
    expect(guest.eventId).toBe("event-abc123");
    expect(guest.editToken).toBe(editToken);
    const pos = await db.select().from(plusOnes).where(eq(plusOnes.guestId, guestId));
    expect(pos.map((p) => p.name).sort()).toEqual(["Jo", "Sam"]);
  });

  it("issues an unguessable URL-safe edit token, different on every call", async () => {
    const a = await submitRsvp(db, base);
    const b = await submitRsvp(db, base);
    expect(a.editToken).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    expect(b.editToken).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    expect(a.editToken).not.toBe(b.editToken);
  });

  it("trims the name", async () => {
    const { guestId } = await submitRsvp(db, { ...base, name: "  Alex  " });
    const [guest] = await db.select().from(guests).where(eq(guests.id, guestId));
    expect(guest.name).toBe("Alex");
  });

  it("rejects blank or whitespace-only names", async () => {
    await expect(submitRsvp(db, { ...base, name: "" })).rejects.toBeInstanceOf(ValidationError);
    await expect(submitRsvp(db, { ...base, name: "   " })).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects names over 80 chars but accepts exactly 80", async () => {
    await expect(submitRsvp(db, { ...base, name: "a".repeat(81) })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(submitRsvp(db, { ...base, name: "a".repeat(80) })).resolves.toBeDefined();
  });

  it("rejects more than 10 plus-ones but accepts exactly 10", async () => {
    const names = (n: number) => Array.from({ length: n }, (_, i) => `P${i}`);
    await expect(submitRsvp(db, { ...base, plusOneNames: names(11) })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(submitRsvp(db, { ...base, plusOneNames: names(10) })).resolves.toBeDefined();
  });

  it("drops blank plus-one names and trims the rest", async () => {
    const { guestId } = await submitRsvp(db, {
      ...base,
      plusOneNames: ["  Sam ", "", "   "],
    });
    const pos = await db.select().from(plusOnes).where(eq(plusOnes.guestId, guestId));
    expect(pos.map((p) => p.name)).toEqual(["Sam"]);
  });

  it("rejects plus-one names over 80 chars", async () => {
    await expect(
      submitRsvp(db, { ...base, plusOneNames: ["a".repeat(81)] }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects over-long food notes and invalid status", async () => {
    await expect(submitRsvp(db, { ...base, foodNotes: "x".repeat(501) })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(
      submitRsvp(db, { ...base, status: "perhaps" as unknown as "yes" }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("stores blank food notes as null", async () => {
    const { guestId } = await submitRsvp(db, { ...base, foodNotes: "   " });
    const [guest] = await db.select().from(guests).where(eq(guests.id, guestId));
    expect(guest.foodNotes).toBeNull();
  });

  it("allows two guests with the same name", async () => {
    await submitRsvp(db, { ...base, name: "Alex" });
    await submitRsvp(db, { ...base, name: "Alex" });
    const rows = await db.select().from(guests);
    expect(rows.filter((g) => g.name === "Alex")).toHaveLength(2);
  });

  it("throws NotFoundError for an unknown share code", async () => {
    await expect(submitRsvp(db, { ...base, shareCode: "nope" })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});

describe("updateRsvp", () => {
  it("changes maybe to yes and replaces plus-ones", async () => {
    const { guestId, editToken } = await submitRsvp(db, {
      ...base,
      status: "maybe",
      plusOneNames: ["Sam", "Jo"],
    });
    await updateRsvp(db, {
      ...base,
      editToken,
      name: " Alexander ",
      status: "yes",
      plusOneNames: ["Pat"],
      foodNotes: "vegan",
    });
    const [guest] = await db.select().from(guests).where(eq(guests.id, guestId));
    expect(guest.status).toBe("yes");
    expect(guest.name).toBe("Alexander");
    expect(guest.foodNotes).toBe("vegan");
    const pos = await db.select().from(plusOnes).where(eq(plusOnes.guestId, guestId));
    expect(pos.map((p) => p.name)).toEqual(["Pat"]);
  });

  it("throws NotFoundError for a wrong token", async () => {
    await submitRsvp(db, base);
    await expect(
      updateRsvp(db, { ...base, editToken: "wrong-token" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError for a token that belongs to a different event", async () => {
    await seedEvent("other99");
    const { editToken } = await submitRsvp(db, base);
    await expect(
      updateRsvp(db, { ...base, shareCode: "other99", editToken }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(getGuestByToken(db, "other99", editToken)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("validates input and leaves the existing RSVP untouched on failure", async () => {
    const { guestId, editToken } = await submitRsvp(db, { ...base, plusOneNames: ["Sam"] });
    await expect(updateRsvp(db, { ...base, editToken, name: " " })).rejects.toBeInstanceOf(
      ValidationError,
    );
    const pos = await db.select().from(plusOnes).where(eq(plusOnes.guestId, guestId));
    expect(pos.map((p) => p.name)).toEqual(["Sam"]);
  });
});

describe("getGuestByToken", () => {
  it("returns the guest view", async () => {
    const { guestId, editToken } = await submitRsvp(db, {
      ...base,
      plusOneNames: ["Sam"],
      foodNotes: "no nuts",
    });
    expect(await getGuestByToken(db, "abc123", editToken)).toEqual({
      id: guestId,
      name: "Alex",
      status: "yes",
      plusOneNames: ["Sam"],
      foodNotes: "no nuts",
    });
  });

  it("throws NotFoundError for a wrong token", async () => {
    await expect(getGuestByToken(db, "abc123", "nope")).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("getPublicEvent", () => {
  it("counts yes heads including plus-ones and exposes nothing private", async () => {
    await submitRsvp(db, { ...base, name: "Alex", status: "yes", plusOneNames: ["Sam", "Jo"] });
    await submitRsvp(db, { ...base, name: "Bea", status: "yes", foodNotes: "secret allergy" });
    await submitRsvp(db, { ...base, name: "Cy", status: "maybe", plusOneNames: ["Dee"] });
    await submitRsvp(db, { ...base, name: "Di", status: "no", plusOneNames: ["Ed"] });

    const result = await getPublicEvent(db, "abc123");
    expect(result).toEqual({
      title: "Cookout",
      startsAt: new Date("2026-07-04T18:00:00Z"),
      location: "Backyard",
      timezone: "UTC",
      hostName: "Will",
      goingCount: 4,
    });
    const json = JSON.stringify(result);
    for (const secret of ["Alex", "Sam", "Jo", "Bea", "secret allergy", "Cy", "Dee"]) {
      expect(json).not.toContain(secret);
    }
  });

  it("reports zero when nobody is going", async () => {
    expect((await getPublicEvent(db, "abc123")).goingCount).toBe(0);
  });

  it("throws NotFoundError for an unknown share code", async () => {
    await expect(getPublicEvent(db, "nope")).rejects.toBeInstanceOf(NotFoundError);
  });
});
