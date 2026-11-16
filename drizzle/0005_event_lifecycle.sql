ALTER TABLE "events" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "details_changed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "cover_emoji" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "cover_color" text;