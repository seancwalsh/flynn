CREATE TABLE "custom_symbols" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_bulgarian" varchar(100),
	"category_id" uuid,
	"image_source" varchar(20) NOT NULL,
	"image_url" varchar(500),
	"image_prompt" varchar(500),
	"image_key" varchar(500),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_by" uuid NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp,
	"rejected_by" uuid,
	"rejected_at" timestamp,
	"rejection_reason" text,
	"grid_position" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"author_id" uuid,
	"type" varchar(20) DEFAULT 'general' NOT NULL,
	"content" text NOT NULL,
	"attachment_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "symbol_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"symbol_id" uuid NOT NULL,
	"reviewer_id" uuid NOT NULL,
	"action" varchar(20) NOT NULL,
	"comment" text,
	"previous_status" varchar(20) NOT NULL,
	"new_status" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "symbol_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_bulgarian" varchar(100),
	"color_name" varchar(50) NOT NULL,
	"color_hex" varchar(7) NOT NULL,
	"icon" varchar(50),
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_system" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN "category_id" varchar(255);--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "custom_symbols" ADD CONSTRAINT "custom_symbols_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_symbols" ADD CONSTRAINT "custom_symbols_category_id_symbol_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."symbol_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_symbols" ADD CONSTRAINT "custom_symbols_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_symbols" ADD CONSTRAINT "custom_symbols_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_symbols" ADD CONSTRAINT "custom_symbols_rejected_by_users_id_fk" FOREIGN KEY ("rejected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symbol_approvals" ADD CONSTRAINT "symbol_approvals_symbol_id_custom_symbols_id_fk" FOREIGN KEY ("symbol_id") REFERENCES "public"."custom_symbols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "symbol_approvals" ADD CONSTRAINT "symbol_approvals_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "custom_symbols_child_idx" ON "custom_symbols" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "custom_symbols_status_idx" ON "custom_symbols" USING btree ("status");--> statement-breakpoint
CREATE INDEX "custom_symbols_child_status_idx" ON "custom_symbols" USING btree ("child_id","status");--> statement-breakpoint
CREATE INDEX "custom_symbols_created_idx" ON "custom_symbols" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notes_child_idx" ON "notes" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "notes_type_idx" ON "notes" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notes_created_idx" ON "notes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "symbol_approvals_symbol_idx" ON "symbol_approvals" USING btree ("symbol_id");--> statement-breakpoint
CREATE INDEX "symbol_approvals_reviewer_idx" ON "symbol_approvals" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "symbol_approvals_created_idx" ON "symbol_approvals" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "symbol_categories_order_idx" ON "symbol_categories" USING btree ("display_order");