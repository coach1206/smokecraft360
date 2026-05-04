CREATE TYPE "public"."user_level" AS ENUM('standard', 'elite');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'venue_owner', 'manager', 'staff', 'brand_partner', 'customer');--> statement-breakpoint
CREATE TYPE "public"."venue_plan" AS ENUM('basic', 'mid', 'premium');--> statement-breakpoint
CREATE TYPE "public"."venue_type" AS ENUM('cigar_lounge', 'whiskey_bar', 'wine_bar', 'coffee_house', 'scent_shop');--> statement-breakpoint
CREATE TYPE "public"."product_category" AS ENUM('cigar', 'alcohol', 'beer', 'wine', 'cocktail', 'food', 'coffee', 'tea', 'scent', 'candle');--> statement-breakpoint
CREATE TYPE "public"."product_submission_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."product_tier" AS ENUM('standard', 'mid', 'premium');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('view', 'swipe_right', 'swipe_left', 'recommendation', 'save', 'order', 'boost_click', 'sponsored_view', 'recommendation_view', 'product_selected', 'pairing_selected', 'food_selected', 'order_created', 'brand_view', 'brand_selected', 'campaign_triggered', 'campaign_conversion', 'campaign_reward_applied', 'campaign_budget_warning', 'campaign_budget_exhausted', 'campaign_abuse_flagged', 'nda_viewed', 'nda_signed', 'nda_synced');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'active', 'paused', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."placement_status" AS ENUM('pending_payment', 'active', 'expired', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."placement_type" AS ENUM('featured', 'premium', 'sponsored');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('starter', 'pro', 'premium');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid');--> statement-breakpoint
CREATE TYPE "public"."dunning_event_type" AS ENUM('reminder', 'failed', 'retry', 'recovered', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_priority" AS ENUM('low', 'normal', 'high');--> statement-breakpoint
CREATE TYPE "public"."support_ticket_status" AS ENUM('open', 'in_progress', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."partner_tier" AS ENUM('LOCAL', 'REGIONAL', 'NATIONAL');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"venue_id" uuid,
	"score" integer DEFAULT 0 NOT NULL,
	"level" "user_level" DEFAULT 'standard' NOT NULL,
	"nda_signed_at" timestamp with time zone,
	"nda_signature_name" text,
	"nda_signature_ip" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "venue_type" NOT NULL,
	"plan" "venue_plan" DEFAULT 'basic' NOT NULL,
	"theme_profile" text,
	"active" boolean DEFAULT true NOT NULL,
	"tagline" text,
	"logo_url" text,
	"primary_color" text,
	"stripe_customer_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"venue_id" uuid,
	"name" text NOT NULL,
	"category" "product_category" NOT NULL,
	"flavor_notes" json DEFAULT '[]'::json NOT NULL,
	"strength" integer DEFAULT 3 NOT NULL,
	"mood_tags" json DEFAULT '[]'::json NOT NULL,
	"pairing_tags" json DEFAULT '[]'::json NOT NULL,
	"tier" "product_tier" DEFAULT 'standard' NOT NULL,
	"boost_level" integer DEFAULT 0 NOT NULL,
	"sponsored" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"brand_id" uuid,
	"distributor_id" uuid,
	"campaign_id" text,
	"image_url" text,
	"cost_cents" integer,
	"submission_status" "product_submission_status" DEFAULT 'approved' NOT NULL,
	"submitted_by" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"venue_id" uuid,
	"selected_product_id" text NOT NULL,
	"pairing_product_id" text,
	"food_pairing_id" text,
	"score" integer DEFAULT 0 NOT NULL,
	"saved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"distributor_id" uuid,
	"logo_url" text,
	"website" text,
	"contact_email" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid,
	"user_id" uuid,
	"product_id" text,
	"event_type" "event_type" NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"venue_id" uuid,
	"cigar_id" text,
	"cigar_name" text,
	"drink_id" text,
	"drink_name" text,
	"food_id" text,
	"food_name" text,
	"order_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"table_number" text,
	"expected_amount_cents" integer,
	"stripe_payment_intent_id" text,
	"funds_status" text DEFAULT 'held' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp,
	"verification_method" text,
	"verified_by" uuid,
	"xp_awarded" boolean DEFAULT false NOT NULL,
	"brand_id" uuid,
	"brand_name" text,
	"campaign_id" uuid,
	"sponsored" boolean DEFAULT false NOT NULL,
	"campaign_type" text,
	"attribution_source" text,
	"campaign_discount_cents" integer,
	"campaign_xp_multiplier" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_stripe_payment_intent_id_unique" UNIQUE("stripe_payment_intent_id")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"venue_id" uuid,
	"session_id" text,
	"category" "product_category" NOT NULL,
	"flavor_preferences" json DEFAULT '[]'::json NOT NULL,
	"strength" integer DEFAULT 3 NOT NULL,
	"mood" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venue_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"price_cents" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "distributors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"state" text,
	"contact_email" text,
	"website" text,
	"region" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'GENERAL' NOT NULL,
	"brand_id" uuid,
	"distributor_id" uuid,
	"venue_id" uuid,
	"craft_type" text,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"boost_multiplier" double precision DEFAULT 1 NOT NULL,
	"xp_multiplier" double precision DEFAULT 1 NOT NULL,
	"reward_bonus" integer DEFAULT 0 NOT NULL,
	"budget_cents" integer,
	"budget_limit" integer,
	"impression_goal" integer,
	"max_redemptions" integer,
	"current_spend_cents" integer DEFAULT 0 NOT NULL,
	"current_redemptions" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demand_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid,
	"product_id" text NOT NULL,
	"product_name" text,
	"category" text,
	"user_id" uuid,
	"session_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demand_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid,
	"product_id" text NOT NULL,
	"product_name" text,
	"category" text,
	"flavor_notes" text,
	"event_type" text NOT NULL,
	"user_id" uuid,
	"session_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "missing_demand" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid,
	"product_id" text NOT NULL,
	"product_name" text,
	"category" text,
	"request_count" integer DEFAULT 1 NOT NULL,
	"last_requested_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "missing_demand_venue_product_unique" UNIQUE("venue_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "user_progression" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"total_verified_orders" integer DEFAULT 0 NOT NULL,
	"total_cigars_smoked" integer DEFAULT 0 NOT NULL,
	"total_drinks_tried" integer DEFAULT 0 NOT NULL,
	"total_food_orders" integer DEFAULT 0 NOT NULL,
	"blends_created" integer DEFAULT 0 NOT NULL,
	"unique_products_tried" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_progression_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_humidor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text,
	"category" text,
	"quantity_purchased" integer DEFAULT 1 NOT NULL,
	"last_purchased_at" timestamp DEFAULT now() NOT NULL,
	"first_purchased_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "humidor_user_product_unique" UNIQUE("user_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "manufacturers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"country" text DEFAULT 'US',
	"specialty" text DEFAULT 'premium',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signature_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"brand_name" text NOT NULL,
	"band_design" text NOT NULL,
	"cigar_spec" text NOT NULL,
	"box_design" text,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"production_stage" text,
	"manufacturer_id" uuid,
	"admin_notes" text,
	"rejected_reason" text,
	"stripe_payment_intent_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_loyalty_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"points_redeemed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_loyalty_points_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'discount' NOT NULL,
	"points_cost" integer DEFAULT 100 NOT NULL,
	"level_required" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"reward_id" uuid NOT NULL,
	"reward_name" text NOT NULL,
	"points_spent" integer NOT NULL,
	"venue_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lounge_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lounge_id" uuid NOT NULL,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"total_verified_orders" integer DEFAULT 0 NOT NULL,
	"weekly_orders" integer DEFAULT 0 NOT NULL,
	"total_users" integer DEFAULT 0 NOT NULL,
	"repeat_customers" integer DEFAULT 0 NOT NULL,
	"average_experience_score" real DEFAULT 0 NOT NULL,
	"trending_score" integer DEFAULT 0 NOT NULL,
	"weekly_rank" integer,
	"monthly_rank" integer,
	"badges" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lounge_stats_lounge_id_unique" UNIQUE("lounge_id")
);
--> statement-breakpoint
CREATE TABLE "device_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"table_number" text,
	"user_id" uuid,
	"order_placed" boolean DEFAULT false NOT NULL,
	"reset_reason" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"type" text NOT NULL,
	"nickname" text NOT NULL,
	"table_number" text,
	"status" text DEFAULT 'active' NOT NULL,
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"venue_id" uuid,
	"gross_amount_cents" integer NOT NULL,
	"rate_pct_bps" integer DEFAULT 1000 NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"stripe_session_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "network_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_type" text NOT NULL,
	"value" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"avg_score" real,
	"timeframe" text NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "network_metrics_type_value_timeframe_unique" UNIQUE("metric_type","value","timeframe")
);
--> statement-breakpoint
CREATE TABLE "venue_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"metric_type" text NOT NULL,
	"value" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"avg_score" real,
	"timeframe" text NOT NULL,
	"computed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "venue_metrics_venue_type_value_timeframe_unique" UNIQUE("venue_id","metric_type","value","timeframe")
);
--> statement-breakpoint
CREATE TABLE "payout_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"stripe_transfer_id" text,
	"requested_by" uuid,
	"approved_by" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp,
	"paid_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "vendor_placements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"placement_type" "placement_type" NOT NULL,
	"duration_days" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"status" "placement_status" DEFAULT 'pending_payment' NOT NULL,
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"campaign_id" uuid,
	"start_date" timestamp,
	"end_date" timestamp,
	"purchased_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"activated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"status" "subscription_status" DEFAULT 'incomplete' NOT NULL,
	"plan" "subscription_plan" DEFAULT 'starter' NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"current_period_end" timestamp,
	"last_payment_date" timestamp,
	"grace_period_ends_at" timestamp,
	"admin_override" boolean DEFAULT false NOT NULL,
	"admin_override_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_venue_id_unique" UNIQUE("venue_id"),
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "dunning_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"type" "dunning_event_type" NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_retry_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"channel" "notification_channel" DEFAULT 'in_app' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"status" "notification_status" DEFAULT 'sent' NOT NULL,
	"category" text,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_role" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"before_state" jsonb,
	"after_state" jsonb,
	"venue_id" uuid,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"venue_id" uuid NOT NULL,
	"product_id" text,
	"product_name" text,
	"guest_name" text,
	"guest_phone" text,
	"party_size" integer DEFAULT 2 NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"payment_mode" text DEFAULT 'none' NOT NULL,
	"deposit_cents" integer,
	"deposit_payment_intent_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_conflicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"venue_id" uuid,
	"field_name" text NOT NULL,
	"source_a" text NOT NULL,
	"value_a" text NOT NULL,
	"source_b" text NOT NULL,
	"value_b" text NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"detected_by" uuid,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolved_value" text,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ip_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"kind" text NOT NULL,
	"description" text,
	"file_url" text,
	"file_hash" text,
	"authorship" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"registered_at" timestamp with time zone,
	"registered_by" uuid,
	"notes" text,
	"retired_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "theme_profiles" (
	"slug" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"product_type" text NOT NULL,
	"primary_color" text NOT NULL,
	"visual_style" text NOT NULL,
	"sound_profile" text NOT NULL,
	"steps" jsonb NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"theme_slug" text,
	"venue_id" uuid,
	"name" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_reversals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commission_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"venue_id" uuid,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"reason" text NOT NULL,
	"stripe_refund_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "commission_reversals_stripe_refund_id_unique" UNIQUE("stripe_refund_id")
);
--> statement-breakpoint
CREATE TABLE "fraud_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"order_id" uuid,
	"venue_id" uuid,
	"user_id" uuid,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"resolved" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'kitchen' NOT NULL,
	"tags" json DEFAULT '[]'::json NOT NULL,
	"price_cents" integer NOT NULL,
	"cost_cents" integer,
	"reorder_threshold" integer DEFAULT 5 NOT NULL,
	"image_url" text,
	"available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "export_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requested_by" uuid NOT NULL,
	"scope" text NOT NULL,
	"format" text NOT NULL,
	"venue_id" uuid,
	"filters" json DEFAULT '{}'::json NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"byte_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nda_signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"initials" text NOT NULL,
	"signature_data" text NOT NULL,
	"agreed" boolean NOT NULL,
	"ip_address" text,
	"device_type" text,
	"session_id" text,
	"device_id" uuid,
	"venue_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offline_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"device_id" text,
	"venue_id" uuid,
	"kind" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"result_id" text,
	"client_created_at" timestamp,
	"synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid,
	"host_user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "session_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'guest' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	CONSTRAINT "session_members_session_user_unique" UNIQUE("session_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "user_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"venue_id" uuid,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"confidence" double precision DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	CONSTRAINT "user_memories_user_key_unique" UNIQUE("user_id","key")
);
--> statement-breakpoint
CREATE TABLE "voice_commands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"venue_id" uuid,
	"transcript" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"claimed_by" uuid,
	"result" jsonb,
	"error_message" text,
	"retries" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"claimed_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"opened_by" uuid NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"status" "support_ticket_status" DEFAULT 'open' NOT NULL,
	"priority" "support_ticket_priority" DEFAULT 'normal' NOT NULL,
	"assigned_to" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "support_ticket_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_hardware" (
	"device_id" uuid PRIMARY KEY NOT NULL,
	"serial_number" text,
	"manufacturer" text,
	"model" text,
	"mac_address" text,
	"supplier" text,
	"purchase_date" date,
	"purchase_price_cents" integer,
	"warranty_expires_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_venue_visits" (
	"user_id" uuid NOT NULL,
	"venue_id" uuid NOT NULL,
	"first_visit_at" timestamp DEFAULT now() NOT NULL,
	"last_visit_at" timestamp DEFAULT now() NOT NULL,
	"visit_count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "user_venue_visits_user_id_venue_id_pk" PRIMARY KEY("user_id","venue_id")
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"tier" "partner_tier" DEFAULT 'LOCAL' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"placement_priority" integer DEFAULT 0 NOT NULL,
	"allowed_craft_types" text,
	"monthly_budget_cents" integer,
	"current_month_spend_cents" integer DEFAULT 0 NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"venue_id" uuid,
	"boost_weight" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"campaign_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "touchscreen_flow_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flow_id" text NOT NULL,
	"role" text NOT NULL,
	"user_id" uuid,
	"venue_id" uuid,
	"vendor_id" uuid,
	"device_id" text,
	"session_id" text,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"current_step" text DEFAULT '0' NOT NULL,
	"progress" jsonb DEFAULT '{}'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"venue_id" uuid,
	"style" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"answers" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_audit_log_venue_created" ON "audit_log" USING btree ("venue_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "idx_audit_log_action_created" ON "audit_log" USING btree ("action","created_at" DESC);--> statement-breakpoint
CREATE INDEX "idx_audit_log_actor_created" ON "audit_log" USING btree ("actor_id","created_at" DESC);--> statement-breakpoint
CREATE INDEX "conflicts_venue_idx" ON "data_conflicts" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "conflicts_status_idx" ON "data_conflicts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "conflicts_venue_status_idx" ON "data_conflicts" USING btree ("venue_id","status");--> statement-breakpoint
CREATE INDEX "ip_assets_status_idx" ON "ip_assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ip_assets_kind_idx" ON "ip_assets" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_flags_scope_name_uniq" ON "feature_flags" USING btree (COALESCE("theme_slug", ''),COALESCE("venue_id"::text, ''),"name");--> statement-breakpoint
CREATE INDEX "nda_signatures_created_at_idx" ON "nda_signatures" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "offline_queue_idempotency_idx" ON "offline_queue" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "offline_queue_status_idx" ON "offline_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "offline_queue_venue_idx" ON "offline_queue" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "sessions_code_idx" ON "sessions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "sessions_venue_idx" ON "sessions" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "sessions_host_idx" ON "sessions" USING btree ("host_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_code_active_unique" ON "sessions" USING btree ("code") WHERE status = 'active';--> statement-breakpoint
CREATE INDEX "session_members_session_idx" ON "session_members" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_members_user_idx" ON "session_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_memories_user_idx" ON "user_memories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "voice_commands_venue_status_created_idx" ON "voice_commands" USING btree ("venue_id","status","created_at");--> statement-breakpoint
CREATE INDEX "support_tickets_venue_status_created_idx" ON "support_tickets" USING btree ("venue_id","status","created_at" DESC);--> statement-breakpoint
CREATE INDEX "support_tickets_status_created_idx" ON "support_tickets" USING btree ("status","created_at" DESC);--> statement-breakpoint
CREATE INDEX "support_ticket_messages_ticket_created_idx" ON "support_ticket_messages" USING btree ("ticket_id","created_at" ASC);--> statement-breakpoint
CREATE INDEX "device_hardware_warranty_expires_idx" ON "device_hardware" USING btree ("warranty_expires_at");--> statement-breakpoint
CREATE INDEX "user_venue_visits_user_recent_idx" ON "user_venue_visits" USING btree ("user_id","last_visit_at");--> statement-breakpoint
CREATE INDEX "user_venue_visits_venue_idx" ON "user_venue_visits" USING btree ("venue_id");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_products_brand_product_idx" ON "brand_products" USING btree ("brand_id","product_id");--> statement-breakpoint
CREATE INDEX "tfs_user_idx" ON "touchscreen_flow_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tfs_venue_idx" ON "touchscreen_flow_sessions" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "tfs_device_idx" ON "touchscreen_flow_sessions" USING btree ("device_id");--> statement-breakpoint
CREATE INDEX "tfs_status_idx" ON "touchscreen_flow_sessions" USING btree ("status");