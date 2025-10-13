CREATE TABLE "front_end_errors" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_id" text,
	"message" text NOT NULL,
	"stack" text,
	"component_stack" text,
	"url" text NOT NULL,
	"user_agent" text NOT NULL,
	"error_type" text NOT NULL,
	"metadata" jsonb,
	"timestamp" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "front_end_monitoring" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" text NOT NULL,
	"hour" integer,
	"error_count" integer DEFAULT 0,
	"unique_sessions" integer DEFAULT 0,
	"unique_users" integer DEFAULT 0,
	"avg_lcp" real,
	"avg_fid" real,
	"avg_cls" real,
	"avg_ttfb" real,
	"total_interactions" integer DEFAULT 0,
	"total_network_requests" integer DEFAULT 0,
	"failed_requests" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "network_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_id" text,
	"url" text NOT NULL,
	"method" text NOT NULL,
	"status" integer,
	"duration" real NOT NULL,
	"error" text,
	"timestamp" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"value" real NOT NULL,
	"url" text NOT NULL,
	"metadata" jsonb,
	"timestamp" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_interactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_id" text,
	"type" text NOT NULL,
	"target" text,
	"url" text NOT NULL,
	"metadata" jsonb,
	"timestamp" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "title" varchar;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "personal_forward_email" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "trial_status" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "signup_ip_address" varchar(45);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "device_fingerprint" text;--> statement-breakpoint
CREATE INDEX "fe_session_idx" ON "front_end_errors" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "fe_user_idx" ON "front_end_errors" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fe_timestamp_idx" ON "front_end_errors" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "fe_error_type_idx" ON "front_end_errors" USING btree ("error_type");--> statement-breakpoint
CREATE INDEX "fem_date_idx" ON "front_end_monitoring" USING btree ("date");--> statement-breakpoint
CREATE INDEX "fem_date_hour_idx" ON "front_end_monitoring" USING btree ("date","hour");--> statement-breakpoint
CREATE INDEX "nr_session_idx" ON "network_requests" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "nr_status_idx" ON "network_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "nr_duration_idx" ON "network_requests" USING btree ("duration");--> statement-breakpoint
CREATE INDEX "nr_timestamp_idx" ON "network_requests" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "pm_session_idx" ON "performance_metrics" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "pm_name_idx" ON "performance_metrics" USING btree ("name");--> statement-breakpoint
CREATE INDEX "pm_timestamp_idx" ON "performance_metrics" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "ui_session_idx" ON "user_interactions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "ui_user_idx" ON "user_interactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ui_type_idx" ON "user_interactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "ui_timestamp_idx" ON "user_interactions" USING btree ("timestamp");