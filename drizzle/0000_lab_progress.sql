CREATE TYPE "public"."difficulty" AS ENUM('recruit', 'operator', 'specialist', 'ghost');--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"hook" text NOT NULL,
	"difficulty" "difficulty" DEFAULT 'recruit' NOT NULL,
	"estimated_minutes" integer DEFAULT 60 NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cases_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "lab_progress" (
	"user_id" text NOT NULL,
	"lab_id" text NOT NULL,
	"session" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lab_progress_user_id_lab_id_pk" PRIMARY KEY("user_id","lab_id")
);
