CREATE TYPE "public"."criteria_status" AS ENUM('not_yet', 'sometimes', 'stable');--> statement-breakpoint
CREATE TYPE "public"."note_source" AS ENUM('photo', 'sample', 'text');--> statement-breakpoint
CREATE TYPE "public"."rank_type" AS ENUM('start', 'kyu', 'dan');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('draft', 'approved');--> statement-breakpoint
CREATE TABLE "belts" (
	"id" serial PRIMARY KEY NOT NULL,
	"order" integer NOT NULL,
	"rank_type" "rank_type" NOT NULL,
	"kyu" integer,
	"color" text,
	"name" text NOT NULL,
	"kata" text,
	"kata_file" text,
	"kumite" text,
	"kihon" text,
	"eligibility" text,
	"note" text,
	CONSTRAINT "belts_order_unique" UNIQUE("order")
);
--> statement-breakpoint
CREATE TABLE "coach_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"note_id" integer NOT NULL,
	"draft" jsonb,
	"check_result" jsonb,
	"final" jsonb,
	"status" "review_status" DEFAULT 'draft' NOT NULL,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coach_reviews_note_id_unique" UNIQUE("note_id"),
	CONSTRAINT "coach_reviews_approved_has_final" CHECK ("coach_reviews"."status" <> 'approved' OR ("coach_reviews"."final" IS NOT NULL AND "coach_reviews"."approved_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "criteria_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"kata" text NOT NULL,
	"point_key" text NOT NULL,
	"point_label" text NOT NULL,
	"status" "criteria_status" NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "development_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"self_goals" jsonb NOT NULL,
	"guardian_wish" text,
	"focus" text,
	"strengths" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "development_plans_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"order" integer NOT NULL,
	"due_label" text NOT NULL,
	"due_date" date NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"date" date NOT NULL,
	"theme" text,
	"good" text,
	"improve" text,
	"raw_text" text,
	"source" "note_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "one_on_ones" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"date" date NOT NULL,
	"transcript" text NOT NULL,
	"organized" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"note_id" integer NOT NULL,
	"turns" jsonb NOT NULL,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"grade" text NOT NULL,
	"belt_id" integer NOT NULL,
	"honorific" text DEFAULT 'さん' NOT NULL,
	"guardian_name" text,
	CONSTRAINT "students_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "theme_selections" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"review_id" integer,
	"text" text NOT NULL,
	"is_rewritten" boolean DEFAULT false NOT NULL,
	"for_date" date NOT NULL,
	"selected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coach_reviews" ADD CONSTRAINT "coach_reviews_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criteria_checks" ADD CONSTRAINT "criteria_checks_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development_plans" ADD CONSTRAINT "development_plans_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_plan_id_development_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."development_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "one_on_ones" ADD CONSTRAINT "one_on_ones_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_sessions" ADD CONSTRAINT "question_sessions_note_id_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_belt_id_belts_id_fk" FOREIGN KEY ("belt_id") REFERENCES "public"."belts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theme_selections" ADD CONSTRAINT "theme_selections_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theme_selections" ADD CONSTRAINT "theme_selections_review_id_coach_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."coach_reviews"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "criteria_checks_student_kata_point" ON "criteria_checks" USING btree ("student_id","kata","point_key");--> statement-breakpoint
CREATE UNIQUE INDEX "milestones_plan_order" ON "milestones" USING btree ("plan_id","order");