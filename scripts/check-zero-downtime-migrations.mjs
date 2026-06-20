#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const forbidden = [
  ["drop table", /\bDROP\s+TABLE\b/i],
  ["drop column", /\bDROP\s+COLUMN\b/i],
  ["rename table or column", /\bRENAME\s+(?:TABLE|COLUMN|TO)\b/i],
  ["truncate data", /\bTRUNCATE\b/i],
  ["delete existing data", /\bDELETE\s+FROM\b/i],
  ["drop an enum/type", /\bDROP\s+TYPE\b/i],
  ["change a column type", /\bALTER\s+COLUMN\b[\s\S]*?\b(?:TYPE|SET\s+DATA\s+TYPE)\b/i],
  ["make an existing column required", /\bALTER\s+COLUMN\b[\s\S]*?\bSET\s+NOT\s+NULL\b/i],
];

export function validateMigrationSql(file, sql) {
  const violations = [];
  const statements = sql.split(";").map((statement) => statement.replace(/--.*$/gm, "").trim());

  for (const statement of statements) {
    if (!statement) continue;
    for (const [description, pattern] of forbidden) {
      if (pattern.test(statement)) violations.push(`${file}: ${description}`);
    }

    const addedColumns = statement.matchAll(
      /\bADD\s+COLUMN\b([\s\S]*?)(?=,\s*ADD\s+COLUMN\b|$)/gi,
    );
    for (const [, definition] of addedColumns) {
      if (/\bNOT\s+NULL\b/i.test(definition) && !/\bDEFAULT\b/i.test(definition)) {
        violations.push(`${file}: add a required column without a default`);
      }
    }
  }
  return [...new Set(violations)];
}

function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.log("No new or modified Prisma migrations to validate.");
    return;
  }

  const violations = files.flatMap((file) => (
    validateMigrationSql(file, readFileSync(file, "utf8"))
  ));

  if (violations.length > 0) {
    console.error("Unsafe migration operations are blocked from zero-downtime deployment:");
    for (const violation of [...new Set(violations)]) console.error(`- ${violation}`);
    console.error("Use an expand/contract migration and deploy destructive cleanup separately.");
    process.exitCode = 1;
    return;
  }

  console.log(`Validated ${files.length} migration file(s).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
