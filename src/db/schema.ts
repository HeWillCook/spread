import {
  boolean,
  doublePrecision,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

export const guestStatus = pgEnum("guest_status", ["yes", "maybe", "no"]);

export const events = pgTable("events", {
  id: id(),
  // Plain text, no FK: the user table arrives with Better Auth (Task 9).
  hostId: text("host_id").notNull(),
  // Denormalized so public event reads need no user join.
  hostName: text("host_name").notNull(),
  title: text("title").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  location: text("location").notNull(),
  shareCode: text("share_code").notNull().unique(),
  maybePercent: integer("maybe_percent").notNull().default(50),
  venmoUsername: text("venmo_username"),
  hostCoverCents: integer("host_cover_cents").notNull().default(0),
});

export const recipes = pgTable("recipes", {
  id: id(),
  // null = global starter recipe
  ownerId: text("owner_id"),
  name: text("name").notNull(),
  emoji: text("emoji").notNull(),
  defaultServingsPerPerson: doublePrecision("default_servings_per_person").notNull(),
});

export const recipeItems = pgTable("recipe_items", {
  id: id(),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  emoji: text("emoji").notNull(),
  perServing: doublePrecision("per_serving").notNull(),
  unit: text("unit").notNull(),
  buyUnit: text("buy_unit").notNull(),
  unitsPerBuy: doublePrecision("units_per_buy").notNull(),
  priceCents: integer("price_cents").notNull(),
  position: integer("position").notNull().default(0),
});

export const eventDishes = pgTable("event_dishes", {
  id: id(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id),
  servingsPerPerson: doublePrecision("servings_per_person").notNull(),
});

export const guests = pgTable("guests", {
  id: id(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: guestStatus("status").notNull(),
  foodNotes: text("food_notes"),
  editToken: text("edit_token")
    .notNull()
    .unique()
    .$defaultFn(() => crypto.randomUUID()),
  attended: boolean("attended").notNull().default(false),
  excluded: boolean("excluded").notNull().default(false),
  paid: boolean("paid").notNull().default(false),
  linkSentAt: timestamp("link_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const plusOnes = pgTable("plus_ones", {
  id: id(),
  guestId: text("guest_id")
    .notNull()
    .references(() => guests.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const invitees = pgTable("invitees", {
  id: id(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const shoppingState = pgTable(
  "shopping_state",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    recipeItemId: text("recipe_item_id")
      .notNull()
      .references(() => recipeItems.id, { onDelete: "cascade" }),
    checked: boolean("checked").notNull().default(false),
    actualCents: integer("actual_cents"),
  },
  (t) => [unique("shopping_state_event_item_unique").on(t.eventId, t.recipeItemId)],
);

export const extraCosts = pgTable("extra_costs", {
  id: id(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  amountCents: integer("amount_cents").notNull(),
});
