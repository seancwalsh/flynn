-- Notification preferences and logs
-- FLY-101: Push notification integration

-- User notification preferences
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL UNIQUE,
	"enabled" boolean DEFAULT true NOT NULL,
	"type_settings" jsonb,
	"quiet_hours_enabled" boolean DEFAULT true,
	"quiet_hours_start" varchar(5) DEFAULT '22:00',
	"quiet_hours_end" varchar(5) DEFAULT '07:00',
	"timezone" varchar(50) DEFAULT 'UTC',
	"max_per_hour" integer DEFAULT 5,
	"max_per_day" integer DEFAULT 20,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Notification delivery log
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

-- Foreign keys
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_insight_id_insights_id_fk" FOREIGN KEY ("insight_id") REFERENCES "public"."insights"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

-- Indexes
CREATE INDEX "notification_logs_user_idx" ON "notification_logs" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "notification_logs_sent_idx" ON "notification_logs" USING btree ("sent_at");
