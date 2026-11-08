CREATE TYPE "public"."guest_status" AS ENUM('yes', 'maybe', 'no');--> statement-breakpoint
CREATE TABLE "event_dishes" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"recipe_id" text NOT NULL,
	"servings_per_person" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"host_id" text NOT NULL,
	"host_name" text NOT NULL,
	"title" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"location" text NOT NULL,
	"share_code" text NOT NULL,
	"maybe_percent" integer DEFAULT 50 NOT NULL,
	"venmo_username" text,
	"host_cover_cents" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "events_share_code_unique" UNIQUE("share_code")
);
--> statement-breakpoint
CREATE TABLE "extra_costs" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"label" text NOT NULL,
	"amount_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guests" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"name" text NOT NULL,
	"status" "guest_status" NOT NULL,
	"food_notes" text,
	"edit_token" text NOT NULL,
	"attended" boolean DEFAULT false NOT NULL,
	"excluded" boolean DEFAULT false NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"link_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guests_edit_token_unique" UNIQUE("edit_token")
);
--> statement-breakpoint
CREATE TABLE "invitees" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plus_ones" (
	"id" text PRIMARY KEY NOT NULL,
	"guest_id" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_items" (
	"id" text PRIMARY KEY NOT NULL,
	"recipe_id" text NOT NULL,
	"name" text NOT NULL,
	"emoji" text NOT NULL,
	"per_serving" double precision NOT NULL,
	"unit" text NOT NULL,
	"buy_unit" text NOT NULL,
	"units_per_buy" double precision NOT NULL,
	"price_cents" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text,
	"name" text NOT NULL,
	"emoji" text NOT NULL,
	"default_servings_per_person" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_state" (
	"event_id" text NOT NULL,
	"recipe_item_id" text NOT NULL,
	"checked" boolean DEFAULT false NOT NULL,
	"actual_cents" integer,
	CONSTRAINT "shopping_state_event_item_unique" UNIQUE("event_id","recipe_item_id")
);
--> statement-breakpoint
ALTER TABLE "event_dishes" ADD CONSTRAINT "event_dishes_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_dishes" ADD CONSTRAINT "event_dishes_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extra_costs" ADD CONSTRAINT "extra_costs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitees" ADD CONSTRAINT "invitees_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plus_ones" ADD CONSTRAINT "plus_ones_guest_id_guests_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."guests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_state" ADD CONSTRAINT "shopping_state_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_state" ADD CONSTRAINT "shopping_state_recipe_item_id_recipe_items_id_fk" FOREIGN KEY ("recipe_item_id") REFERENCES "public"."recipe_items"("id") ON DELETE cascade ON UPDATE no action;