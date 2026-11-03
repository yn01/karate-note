CREATE TABLE "exam_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"exam_month" date NOT NULL,
	"target_belt_id" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exam_plans_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
ALTER TABLE "exam_plans" ADD CONSTRAINT "exam_plans_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_plans" ADD CONSTRAINT "exam_plans_target_belt_id_belts_id_fk" FOREIGN KEY ("target_belt_id") REFERENCES "public"."belts"("id") ON DELETE no action ON UPDATE no action;