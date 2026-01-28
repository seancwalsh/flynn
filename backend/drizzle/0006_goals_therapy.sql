-- Goals and therapy tracking for cross-therapy coordination
-- FLY-103: Cross-therapy goal linking

-- Goals table
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

-- Goal links for cross-therapy relationships
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

-- Therapy sessions
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

-- Goal progress entries
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

-- Foreign keys
ALTER TABLE "goals" ADD CONSTRAINT "goals_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_therapist_id_therapists_id_fk" FOREIGN KEY ("therapist_id") REFERENCES "public"."therapists"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goal_links" ADD CONSTRAINT "goal_links_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goal_links" ADD CONSTRAINT "goal_links_linked_goal_id_goals_id_fk" FOREIGN KEY ("linked_goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goal_links" ADD CONSTRAINT "goal_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "therapy_sessions" ADD CONSTRAINT "therapy_sessions_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "therapy_sessions" ADD CONSTRAINT "therapy_sessions_therapist_id_therapists_id_fk" FOREIGN KEY ("therapist_id") REFERENCES "public"."therapists"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goal_progress" ADD CONSTRAINT "goal_progress_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goal_progress" ADD CONSTRAINT "goal_progress_session_id_therapy_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."therapy_sessions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "goal_progress" ADD CONSTRAINT "goal_progress_logged_by_users_id_fk" FOREIGN KEY ("logged_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Indexes
CREATE INDEX "goals_child_idx" ON "goals" USING btree ("child_id");
--> statement-breakpoint
CREATE INDEX "goals_status_idx" ON "goals" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "goals_therapy_type_idx" ON "goals" USING btree ("therapy_type");
--> statement-breakpoint
CREATE INDEX "goal_links_goal_idx" ON "goal_links" USING btree ("goal_id");
--> statement-breakpoint
CREATE INDEX "goal_links_linked_idx" ON "goal_links" USING btree ("linked_goal_id");
--> statement-breakpoint
CREATE INDEX "therapy_sessions_child_idx" ON "therapy_sessions" USING btree ("child_id");
--> statement-breakpoint
CREATE INDEX "therapy_sessions_date_idx" ON "therapy_sessions" USING btree ("session_date");
--> statement-breakpoint
CREATE INDEX "goal_progress_goal_idx" ON "goal_progress" USING btree ("goal_id");
--> statement-breakpoint
CREATE INDEX "goal_progress_date_idx" ON "goal_progress" USING btree ("date");
