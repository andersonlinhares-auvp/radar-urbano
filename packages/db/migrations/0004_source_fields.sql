ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "source_name" text;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN IF NOT EXISTS "source_url" text;--> statement-breakpoint
INSERT INTO "sources" ("kind", "name")
SELECT 'PARTNER', 'Fogo Cruzado'
WHERE NOT EXISTS (SELECT 1 FROM "sources" WHERE "kind" = 'PARTNER');
