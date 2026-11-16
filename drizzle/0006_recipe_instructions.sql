ALTER TABLE "recipes" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "prep_minutes" integer;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "cook_minutes" integer;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "steps" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "tips" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "equipment" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "origin_recipe_id" text;