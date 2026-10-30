import postgres from "postgres";

const connStr =
  "postgresql://neondb_owner:npg_5qrz6cOCUsPI@ep-odd-wind-b4g8lja9-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require";

const sql = postgres(connStr, { ssl: "require" });

async function verify() {
  const users =
    await sql`SELECT id, email, full_name, role FROM public.users ORDER BY role, email;`;
  console.log("USERS:", users);

  const countries = await sql`
    SELECT c.id, c.name, c.country_code, count(a.id)::int as agency_count
    FROM public.countries c
    LEFT JOIN public.agencies a ON a.country_id = c.id
    GROUP BY c.id, c.name, c.country_code
    ORDER BY c.country_code;
  `;
  console.log("COUNTRIES & AGENCY COUNTS:", countries);

  const adminCountries = await sql`
    SELECT u.email, u.role, c.name as country_name, c.country_code
    FROM public.admin_countries ac
    JOIN public.users u ON u.id = ac.user_id
    JOIN public.countries c ON c.id = ac.country_id
    ORDER BY u.email;
  `;
  console.log("ADMIN COUNTRY ASSIGNMENTS:", adminCountries);

  const recordStats = await sql`
    SELECT c.name as country_name, count(r.id)::int as records_count
    FROM public.records r
    LEFT JOIN public.countries c ON c.id = r.country_id
    GROUP BY c.name;
  `;
  console.log("RECORD COUNTS PER COUNTRY:", recordStats);

  await sql.end();
}

verify().catch((e) => {
  console.error(e);
  process.exit(1);
});
