import postgres from "postgres";

const connStr =
  "postgresql://neondb_owner:npg_5qrz6cOCUsPI@ep-odd-wind-b4g8lja9-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require";

async function testNeon() {
  console.log("Connecting to Neon database...");
  const sql = postgres(connStr, { ssl: "require" });
  try {
    const result = await sql`SELECT version(), current_database(), current_user;`;
    console.log("Connected successfully to Neon!", result);

    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
    console.log("Existing tables in public schema:", tables);
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await sql.end();
  }
}

testNeon();
