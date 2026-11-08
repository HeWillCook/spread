// @vitest-environment node
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "./test-db";
import { seedStarterRecipes } from "./seed";
import { events, recipeItems, recipes } from "./schema";

describe("database", () => {
  it("inserts an event and reads it back", async () => {
    const db = await createTestDb();
    await db.insert(events).values({
      id: "e1",
      hostId: "host-1",
      hostName: "Will",
      title: "Cookout",
      startsAt: new Date("2026-07-04T18:00:00Z"),
      location: "Backyard",
      shareCode: "abc123",
    });
    const [row] = await db.select().from(events).where(eq(events.id, "e1"));
    expect(row.title).toBe("Cookout");
    expect(row.hostName).toBe("Will");
    expect(row.maybePercent).toBe(50);
    expect(row.hostCoverCents).toBe(0);
    expect(row.venmoUsername).toBeNull();
  });

  it("seeds starter recipes idempotently", async () => {
    const db = await createTestDb();
    await seedStarterRecipes(db);
    await seedStarterRecipes(db);
    const globals = await db.select().from(recipes);
    expect(globals).toHaveLength(1);
    expect(globals[0].ownerId).toBeNull();
    const items = await db.select().from(recipeItems);
    expect(items).toHaveLength(5);
  });
});
