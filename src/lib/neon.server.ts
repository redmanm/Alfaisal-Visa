import postgres from "postgres";

const connStr =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_5qrz6cOCUsPI@ep-odd-wind-b4g8lja9-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require";

// Global singleton across hot reloads in dev
const globalForNeon = globalThis as unknown as {
  neonSql: ReturnType<typeof postgres> | undefined;
};

export const sql =
  globalForNeon.neonSql ??
  postgres(connStr, {
    ssl: "require",
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForNeon.neonSql = sql;
}
