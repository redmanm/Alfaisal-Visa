import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Read .env
const envFile = fs.readFileSync(".env", "utf-8");
const env = {};
for (const line of envFile.split(/\r?\n/)) {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}

const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;

console.log("Checking Supabase at:", url);

const supabase = createClient(url, key);

async function check() {
  try {
    const { count, error, data } = await supabase
      .from("records")
      .select("serial_no, sponsor_name, worker_name, amount", { count: "exact" })
      .limit(3);

    if (error) {
      console.log("❌ Table check error:", error.message);
      if (error.code === "PGRST205") {
        console.log(
          "👉 The database schema has not been executed yet. Run supabase/complete_setup.sql in your Supabase SQL editor.",
        );
      }
    } else {
      console.log(`✅ Success! Table 'records' is populated with ${count} total cases.`);
      console.log("Sample rows:", data);
    }
  } catch (err) {
    console.error("Execution error:", err);
  }
}

check();
