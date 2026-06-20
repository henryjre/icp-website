import assert from "node:assert/strict";
import test from "node:test";
import { validateMigrationSql } from "./check-zero-downtime-migrations.mjs";

const file = "apps/server/prisma/migrations/test/migration.sql";

test("allows additive nullable columns and required columns with defaults", () => {
  const sql = `
    ALTER TABLE "Project" ADD COLUMN "notes" TEXT;
    ALTER TABLE "Project" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
  `;
  assert.deepEqual(validateMigrationSql(file, sql), []);
});

test("rejects destructive schema and data operations", () => {
  const sql = `
    ALTER TABLE "Project" DROP COLUMN "notes";
    DELETE FROM "Project";
  `;
  assert.equal(validateMigrationSql(file, sql).length, 2);
});

test("checks every column in a multi-column ALTER TABLE statement", () => {
  const sql = `
    ALTER TABLE "Project"
      ADD COLUMN "safe" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN "unsafe" TEXT NOT NULL;
  `;
  assert.deepEqual(validateMigrationSql(file, sql), [
    `${file}: add a required column without a default`,
  ]);
});
