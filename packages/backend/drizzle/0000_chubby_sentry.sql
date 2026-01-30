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
CREATE TABLE "caregivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "caregivers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "children" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"birth_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"tool_name" varchar(100),
	"tool_call_id" varchar(100),
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_id" uuid NOT NULL,
	"child_id" uuid,
	"title" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_token" varchar(255) NOT NULL,
	"platform" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"linked_goal_id" uuid NOT NULL,
	"relationship_type" varchar(30) NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"date" date NOT NULL,
	"progress_percent" integer NOT NULL,
	"notes" text,
	"session_id" uuid,
	"logged_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"therapy_type" varchar(20) NOT NULL,
	"category" varchar(50),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"target_date" date,
	"progress_percent" integer DEFAULT 0,
	"created_by" uuid,
	"therapist_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"severity" varchar(20),
	"title" varchar(255),
	"body" text,
	"content" jsonb NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp,
	"dismissed_at" timestamp
);
--> statement-breakpoint
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
CREATE TABLE "notification_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text,
	"success" boolean NOT NULL,
	"error" text,
	"message_id" varchar(255),
	"insight_id" uuid,
	"child_id" uuid,
	"sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"type_settings" jsonb,
	"quiet_hours_enabled" boolean DEFAULT true,
	"quiet_hours_start" varchar(5) DEFAULT '22:00',
	"quiet_hours_end" varchar(5) DEFAULT '07:00',
	"timezone" varchar(50) DEFAULT 'UTC',
	"max_per_hour" integer DEFAULT 5,
	"max_per_day" integer DEFAULT 20,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "therapist_clients" (
	"therapist_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "therapist_clients_therapist_id_child_id_pk" PRIMARY KEY("therapist_id","child_id")
);
--> statement-breakpoint
CREATE TABLE "therapists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "therapists_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "therapy_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"therapist_id" uuid,
	"therapy_type" varchar(20) NOT NULL,
	"session_date" date NOT NULL,
	"duration_minutes" integer,
	"notes" text,
	"goals_worked_on" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"symbol_id" varchar(255) NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"session_id" uuid
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" varchar(255),
	"email" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'caregiver' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
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
	"taps_trend" varchar(20),
	"vocabulary_trend" varchar(20),
	"overall_trend" varchar(20),
	"computed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_metrics_child_week_unique" UNIQUE("child_id","week_start")
);
--> statement-breakpoint
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_acknowledged_by_users_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregivers" ADD CONSTRAINT "caregivers_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "children_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_metrics" ADD CONSTRAINT "daily_metrics_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_links" ADD CONSTRAINT "goal_links_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_links" ADD CONSTRAINT "goal_links_linked_goal_id_goals_id_fk" FOREIGN KEY ("linked_goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_links" ADD CONSTRAINT "goal_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_progress" ADD CONSTRAINT "goal_progress_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_progress" ADD CONSTRAINT "goal_progress_session_id_therapy_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."therapy_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_progress" ADD CONSTRAINT "goal_progress_logged_by_users_id_fk" FOREIGN KEY ("logged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_therapist_id_therapists_id_fk" FOREIGN KEY ("therapist_id") REFERENCES "public"."therapists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_baselines" ADD CONSTRAINT "metric_baselines_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_insight_id_insights_id_fk" FOREIGN KEY ("insight_id") REFERENCES "public"."insights"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "therapist_clients" ADD CONSTRAINT "therapist_clients_therapist_id_therapists_id_fk" FOREIGN KEY ("therapist_id") REFERENCES "public"."therapists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "therapist_clients" ADD CONSTRAINT "therapist_clients_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "therapy_sessions" ADD CONSTRAINT "therapy_sessions_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "therapy_sessions" ADD CONSTRAINT "therapy_sessions_therapist_id_therapists_id_fk" FOREIGN KEY ("therapist_id") REFERENCES "public"."therapists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_metrics" ADD CONSTRAINT "weekly_metrics_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "anomalies_child_date_idx" ON "anomalies" USING btree ("child_id","detected_for_date");--> statement-breakpoint
CREATE INDEX "anomalies_severity_idx" ON "anomalies" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "anomalies_unacknowledged_idx" ON "anomalies" USING btree ("child_id","acknowledged");--> statement-breakpoint
CREATE INDEX "daily_metrics_child_date_idx" ON "daily_metrics" USING btree ("child_id","date");--> statement-breakpoint
CREATE INDEX "daily_metrics_date_idx" ON "daily_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "goal_links_goal_idx" ON "goal_links" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goal_links_linked_idx" ON "goal_links" USING btree ("linked_goal_id");--> statement-breakpoint
CREATE INDEX "goal_progress_goal_idx" ON "goal_progress" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goal_progress_date_idx" ON "goal_progress" USING btree ("date");--> statement-breakpoint
CREATE INDEX "goals_child_idx" ON "goals" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "goals_status_idx" ON "goals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "goals_therapy_type_idx" ON "goals" USING btree ("therapy_type");--> statement-breakpoint
CREATE INDEX "insights_child_unread_idx" ON "insights" USING btree ("child_id","read_at");--> statement-breakpoint
CREATE INDEX "insights_generated_idx" ON "insights" USING btree ("generated_at");--> statement-breakpoint
CREATE INDEX "metric_baselines_child_idx" ON "metric_baselines" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "notification_logs_user_idx" ON "notification_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_logs_sent_idx" ON "notification_logs" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "therapy_sessions_child_idx" ON "therapy_sessions" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "therapy_sessions_date_idx" ON "therapy_sessions" USING btree ("session_date");--> statement-breakpoint
CREATE INDEX "weekly_metrics_child_week_idx" ON "weekly_metrics" USING btree ("child_id","week_start");