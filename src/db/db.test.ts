// @vitest-environment node
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { STARTER_RECIPES } from "@/domain/recipes";
import { seedAfterConnect } from "./client";
import { createTestDb } from "./test-db";
import { seedStarterRecipes } from "./seed";
import * as schema from "./schema";
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
    expect(globals).toHaveLength(STARTER_RECIPES.length);
    expect(globals[0].ownerId).toBeNull();
    const items = await db.select().from(recipeItems);
    expect(items).toHaveLength(STARTER_RECIPES.reduce((n, r) => n + r.items.length, 0));
  });

  it("seedAfterConnect (postgres-mode init step) seeds a migrated database", async () => {
    const db = await createTestDb();
    await seedAfterConnect(db);
    await seedAfterConnect(db);
    expect(await db.select().from(recipes)).toHaveLength(STARTER_RECIPES.length);
    expect(await db.select().from(recipeItems)).toHaveLength(
      STARTER_RECIPES.reduce((n, r) => n + r.items.length, 0),
    );
  });

  it("updates a starter in place when its definition changes", async () => {
    const db = await createTestDb();
    await seedStarterRecipes(db);
    const starter = STARTER_RECIPES[0];
    const item = starter.items[0];

    await db.update(recipes).set({ name: "Old name" }).where(eq(recipes.id, starter.id));
    await db.update(recipeItems).set({ perServing: 99 }).where(eq(recipeItems.id, item.id));

    await seedStarterRecipes(db);

    const [row] = await db.select().from(recipes).where(eq(recipes.id, starter.id));
    expect(row.name).toBe(starter.name);
    expect(row.ownerId).toBeNull();
    const [itemRow] = await db.select().from(recipeItems).where(eq(recipeItems.id, item.id));
    expect(itemRow.perServing).toBe(item.perServing);
  });

  it("seedAfterConnect tells the operator to run db:migrate when tables are missing", async () => {
    const db = drizzle(new PGlite(), { schema });
    await expect(seedAfterConnect(db)).rejects.toThrow(/npm run db:migrate/);
  });
});
