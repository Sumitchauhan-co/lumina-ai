CREATE TYPE "public"."pass_status" AS ENUM('inactive', 'active', 'expired');--> statement-breakpoint
CREATE TYPE "public"."plan_type" AS ENUM('free', 'pro');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'guest');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_id" varchar(255),
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255),
	"email" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"password" varchar(255),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"refresh_token" text,
	"verification_token" text,
	"reset_token" text,
	"reset_token_expiry" timestamp with time zone,
	"last_order_id" varchar(255),
	"plan_type" "plan_type" DEFAULT 'free' NOT NULL,
	"pass_status" "pass_status" DEFAULT 'inactive' NOT NULL,
	"pass_expiry_date" timestamp with time zone,
	"monthly_token_allowance" integer DEFAULT 1000000 NOT NULL,
	"tokens_used_this_month" integer DEFAULT 0 NOT NULL,
	"tokens_used_today" integer DEFAULT 0 NOT NULL,
	"last_monthly_reset" timestamp with time zone DEFAULT now() NOT NULL,
	"last_daily_reset" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "users_auth_id_unique" UNIQUE("auth_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
