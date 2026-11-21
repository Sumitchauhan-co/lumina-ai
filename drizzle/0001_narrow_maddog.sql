CREATE TYPE "public"."message_role" AS ENUM('system', 'user', 'assistant', 'tool');--> statement-breakpoint
CREATE TYPE "public"."payment_order_status" AS ENUM('created', 'paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('created', 'authenticated', 'active', 'pending', 'halted', 'cancelled', 'completed', 'paused', 'expired');--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) DEFAULT 'New Chat' NOT NULL,
	"default_model" varchar(120) DEFAULT 'openai/gpt-4o-mini' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" text NOT NULL,
	"model" varchar(120),
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subscription_id" uuid,
	"razorpay_order_id" varchar(255) NOT NULL,
	"razorpay_payment_id" varchar(255),
	"razorpay_signature" varchar(512),
	"amount_paise" integer NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"status" "payment_order_status" DEFAULT 'created' NOT NULL,
	"raw_webhook_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_orders_razorpay_order_id_unique" UNIQUE("razorpay_order_id"),
	CONSTRAINT "payment_orders_razorpay_payment_id_unique" UNIQUE("razorpay_payment_id")
);
--> statement-breakpoint
CREATE TABLE "razorpay_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar(255) NOT NULL,
	"event" varchar(120) NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "razorpay_webhook_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"razorpay_subscription_id" varchar(255),
	"razorpay_payment_id" varchar(255),
	"razorpay_signature" varchar(512),
	"razorpay_plan_id" varchar(255) NOT NULL,
	"plan_type" varchar(32) DEFAULT 'pro' NOT NULL,
	"status" "subscription_status" DEFAULT 'created' NOT NULL,
	"monthly_token_allowance" integer DEFAULT 1000000 NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_cycle_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_razorpay_subscription_id_unique" UNIQUE("razorpay_subscription_id"),
	CONSTRAINT "subscriptions_razorpay_payment_id_unique" UNIQUE("razorpay_payment_id")
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversations_user_updated_idx" ON "conversations" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "messages_conversation_created_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_user_created_idx" ON "messages" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "payment_orders_user_created_idx" ON "payment_orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "razorpay_webhook_events_received_idx" ON "razorpay_webhook_events" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "subscriptions_user_status_idx" ON "subscriptions" USING btree ("user_id","status");