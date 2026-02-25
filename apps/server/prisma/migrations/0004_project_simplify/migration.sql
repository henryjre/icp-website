ALTER TABLE "public"."Project"
  DROP COLUMN "category",
  DROP COLUMN "contractValue",
  ALTER COLUMN "description" DROP NOT NULL;