-- Add trend columns to weekly_metrics
-- FLY-99: Weekly metrics rollup job

ALTER TABLE "weekly_metrics" ADD COLUMN "taps_trend" varchar(20);
--> statement-breakpoint
ALTER TABLE "weekly_metrics" ADD COLUMN "vocabulary_trend" varchar(20);
--> statement-breakpoint
ALTER TABLE "weekly_metrics" ADD COLUMN "overall_trend" varchar(20);
