-- Enhance insights table for in-app feed
-- FLY-98: Insights table and in-app feed

-- Add new columns to insights table
ALTER TABLE "insights" ADD COLUMN "severity" varchar(20);
--> statement-breakpoint
ALTER TABLE "insights" ADD COLUMN "title" varchar(255);
--> statement-breakpoint
ALTER TABLE "insights" ADD COLUMN "body" text;
--> statement-breakpoint
ALTER TABLE "insights" ADD COLUMN "read_at" timestamp;
--> statement-breakpoint
ALTER TABLE "insights" ADD COLUMN "dismissed_at" timestamp;
--> statement-breakpoint

-- Add indexes for querying
CREATE INDEX "insights_child_unread_idx" ON "insights" USING btree ("child_id", "read_at");
--> statement-breakpoint
CREATE INDEX "insights_generated_idx" ON "insights" USING btree ("generated_at");
