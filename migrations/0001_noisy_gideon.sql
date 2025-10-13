ALTER TABLE "users" ADD COLUMN "phone_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tier" varchar(50) DEFAULT 'free';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "firebase_uid" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_firebase_uid_unique" UNIQUE("firebase_uid");