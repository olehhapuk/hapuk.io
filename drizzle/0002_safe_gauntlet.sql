CREATE TYPE "public"."locale" AS ENUM('en', 'uk');--> statement-breakpoint
CREATE TABLE "organization_locale" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"locale" "locale" NOT NULL,
	"receiver_name" text,
	"receiver_address" text,
	"signature_label" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoice" ADD COLUMN "locale" "locale" DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "locale" "locale" DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_locale" ADD CONSTRAINT "organization_locale_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_locale_org_locale_unique" ON "organization_locale" USING btree ("organization_id","locale");