CREATE TYPE "public"."claude_call_outcome" AS ENUM('ok', 'demo_mode', 'demo_nokey', 'demo_limit', 'demo_error', 'demo_refusal', 'demo_invalid');--> statement-breakpoint
CREATE TABLE "claude_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"scene" text NOT NULL,
	"model" text NOT NULL,
	"day" date NOT NULL,
	"outcome" "claude_call_outcome" NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "claude_calls_day_outcome" ON "claude_calls" USING btree ("day","outcome");