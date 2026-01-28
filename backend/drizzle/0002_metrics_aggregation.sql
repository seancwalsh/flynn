-- Phase 2: Metrics Aggregation Tables for Proactive Insights
-- FLY-95: Metrics aggregation database schema

-- Pre-computed daily metrics for fast querying and anomaly detection
CREATE TABLE "daily_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"date" date NOT NULL,
	"total_taps" integer DEFAULT 0 NOT NULL,
	"unique_symbols" integer DEFAULT 0 NOT NULL,
	"unique_categories" integer DEFAULT 0 NOT NULL,
	"session_count" integer DEFAULT 0 NOT NULL,
	"avg_session_length_seconds" integer,
	"total_session_seconds" integer DEFAULT 0,
	"phrases_built" integer DEFAULT 0 NOT NULL,
	"avg_phrase_length" numeric(4, 2),
	"max_phrase_length" integer,
	"bulgarian_taps" integer DEFAULT 0 NOT NULL,
	"english_taps" integer DEFAULT 0 NOT NULL,
	"category_breakdown" jsonb,
	"hourly_distribution" jsonb,
	"top_symbols" jsonb,
	"new_symbols_used" jsonb,
	"computed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_metrics_child_date_unique" UNIQUE("child_id","date")
);
--> statement-breakpoint

-- Weekly rollups for trend analysis
CREATE TABLE "weekly_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"total_taps" integer DEFAULT 0 NOT NULL,
	"avg_daily_taps" numeric(6, 2),
	"active_days" integer DEFAULT 0 NOT NULL,
	"total_unique_symbols" integer DEFAULT 0 NOT NULL,
	"new_symbols_this_week" integer DEFAULT 0 NOT NULL,
	"vocabulary_growth_rate" numeric(5, 4),
	"avg_sessions_per_day" numeric(4, 2),
	"total_sessions" integer DEFAULT 0 NOT NULL,
	"peak_usage_hour" integer,
	"weekend_weekday_ratio" numeric(4, 3),
	"tap_change_percent" numeric(5, 2),
	"vocabulary_change_percent" numeric(5, 2),
	"computed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_metrics_child_week_unique" UNIQUE("child_id","week_start")
);
--> statement-breakpoint

-- Rolling baselines for anomaly detection
CREATE TABLE "metric_baselines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"metric_name" varchar(50) NOT NULL,
	"mean" numeric(10, 4) NOT NULL,
	"median" numeric(10, 4) NOT NULL,
	"std_dev" numeric(10, 4) NOT NULL,
	"min_value" numeric(10, 4),
	"max_value" numeric(10, 4),
	"day_of_week_factors" jsonb,
	"sample_days" integer NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "metric_baselines_child_metric_unique" UNIQUE("child_id","metric_name")
);
--> statement-breakpoint

-- Detected anomalies for review and alerting
CREATE TABLE "anomalies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"severity" varchar(20) NOT NULL,
	"metric_name" varchar(50) NOT NULL,
	"expected_value" numeric(10, 4) NOT NULL,
	"actual_value" numeric(10, 4) NOT NULL,
	"deviation_score" numeric(6, 4) NOT NULL,
	"context" jsonb,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"detected_for_date" date NOT NULL,
	"acknowledged" boolean DEFAULT false,
	"acknowledged_at" timestamp,
	"acknowledged_by" uuid,
	"resolved_at" timestamp,
	"resolution" varchar(255)
);
--> statement-breakpoint

-- Foreign keys
ALTER TABLE "daily_metrics" ADD CONSTRAINT "daily_metrics_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "weekly_metrics" ADD CONSTRAINT "weekly_metrics_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "metric_baselines" ADD CONSTRAINT "metric_baselines_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Indexes for performance
CREATE INDEX "daily_metrics_child_date_idx" ON "daily_metrics" USING btree ("child_id","date");
--> statement-breakpoint
CREATE INDEX "daily_metrics_date_idx" ON "daily_metrics" USING btree ("date");
--> statement-breakpoint
CREATE INDEX "weekly_metrics_child_week_idx" ON "weekly_metrics" USING btree ("child_id","week_start");
--> statement-breakpoint
CREATE INDEX "metric_baselines_child_idx" ON "metric_baselines" USING btree ("child_id");
--> statement-breakpoint
CREATE INDEX "anomalies_child_date_idx" ON "anomalies" USING btree ("child_id","detected_for_date");
--> statement-breakpoint
CREATE INDEX "anomalies_severity_idx" ON "anomalies" USING btree ("severity");
--> statement-breakpoint
CREATE INDEX "anomalies_unacknowledged_idx" ON "anomalies" USING btree ("child_id","acknowledged");
