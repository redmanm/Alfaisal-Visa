import postgres from "postgres";
import fs from "fs";

const envFile = fs.readFileSync(".env", "utf-8");
const env = {};
for (const line of envFile.split(/\r?\n/)) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}

const connStr = env.DATABASE_URL;
console.log("Connecting with DATABASE_URL:", connStr ? "Found" : "Missing");

const sql = postgres(connStr, { ssl: "require" });

async function run() {
  const recs =
    await sql`SELECT serial_no, sponsor_name, worker_name, amount, payment_state, visa_status FROM public.records ORDER BY serial_no LIMIT 5;`;
  console.log("Sample records from Neon:", recs);

  const users = await sql`SELECT email, role, full_name FROM public.users;`;
  console.log("Users from Neon:", users);

  await sql.end();
}

run();
