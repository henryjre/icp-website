interface MasterDatabaseConfig {
  DATABASE_URL?: string;
  MASTER_DB_HOST?: string;
  MASTER_DB_PORT?: string | number;
  MASTER_DB_NAME?: string;
  MASTER_DB_USER?: string;
  MASTER_DB_PASSWORD?: string;
}

function normalizePort(value: string | number): number {
  const port = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("MASTER_DB_PORT must be a positive integer");
  }
  return port;
}

export function resolveDatabaseUrl(input: MasterDatabaseConfig): string {
  if (input.DATABASE_URL && input.DATABASE_URL.trim().length > 0) {
    return input.DATABASE_URL.trim();
  }

  const missing: string[] = [];

  if (!input.MASTER_DB_HOST) missing.push("MASTER_DB_HOST");
  if (!input.MASTER_DB_PORT) missing.push("MASTER_DB_PORT");
  if (!input.MASTER_DB_NAME) missing.push("MASTER_DB_NAME");
  if (!input.MASTER_DB_USER) missing.push("MASTER_DB_USER");
  if (input.MASTER_DB_PASSWORD === undefined || input.MASTER_DB_PASSWORD === null) {
    missing.push("MASTER_DB_PASSWORD");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing database config. Set DATABASE_URL or all MASTER_DB_* vars. Missing: ${missing.join(", ")}`,
    );
  }

  const port = normalizePort(input.MASTER_DB_PORT!);
  const host = input.MASTER_DB_HOST!;
  const name = encodeURIComponent(input.MASTER_DB_NAME!);
  const user = encodeURIComponent(input.MASTER_DB_USER!);
  const password = encodeURIComponent(input.MASTER_DB_PASSWORD!);

  return `postgresql://${user}:${password}@${host}:${port}/${name}?schema=public`;
}

