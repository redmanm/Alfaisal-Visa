import postgres from "postgres";

const connStr =
  "postgresql://neondb_owner:npg_5qrz6cOCUsPI@ep-odd-wind-b4g8lja9-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require";

const sql = postgres(connStr, { ssl: "require" });

async function runMigration() {
  console.log("Starting RBAC and Multi-Tenant Architecture Migration on Neon...");

  // 1. Update users table role constraint to support SUPER_ADMIN, ADMIN, STAFF
  console.log("1. Updating public.users role constraints...");
  await sql.unsafe(`
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE public.users ADD CONSTRAINT users_role_check 
      CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'STAFF', 'admin', 'staff'));
    
    -- Normalize existing roles
    UPDATE public.users SET role = 'SUPER_ADMIN' WHERE role IN ('admin', 'ADMIN');
    UPDATE public.users SET role = 'STAFF' WHERE role IN ('staff', 'STAFF');
  `);

  // 2. Update user_roles table
  console.log("2. Updating public.user_roles constraints...");
  await sql.unsafe(`
    ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check 
      CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'STAFF', 'admin', 'staff'));
    
    UPDATE public.user_roles SET role = 'SUPER_ADMIN' WHERE role IN ('admin', 'ADMIN');
    UPDATE public.user_roles SET role = 'STAFF' WHERE role IN ('staff', 'STAFF');
  `);

  // 3. Create Countries table
  console.log("3. Creating public.countries table...");
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS public.countries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      country_code VARCHAR(10) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // 4. Create Agencies table
  console.log("4. Creating public.agencies table...");
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS public.agencies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
      license_no TEXT,
      phone TEXT,
      email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // 5. Create AdminCountry junction table
  console.log("5. Creating public.admin_countries junction table...");
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS public.admin_countries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (user_id, country_id)
    );
  `);

  // 6. Update records table to add country_id and agency_id
  console.log("6. Adding country_id and agency_id to public.records...");
  await sql.unsafe(`
    ALTER TABLE public.records 
      ADD COLUMN IF NOT EXISTS country_id UUID REFERENCES public.countries(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL;
  `);

  // 7. Seed Countries
  console.log("7. Seeding recruitment countries...");
  const countries = [
    { name: "إثيوبيا (Ethiopia)", code: "ET" },
    { name: "أوغندا (Uganda)", code: "UG" },
    { name: "كينيا (Kenya)", code: "KE" },
    { name: "الفلبين (Philippines)", code: "PH" },
    { name: "الهند (India)", code: "IN" },
  ];

  for (const c of countries) {
    await sql`
      INSERT INTO public.countries (name, country_code)
      VALUES (${c.name}, ${c.code})
      ON CONFLICT (country_code) DO UPDATE SET name = EXCLUDED.name;
    `;
  }

  // Retrieve country IDs
  const allCountries = await sql`SELECT id, name, country_code FROM public.countries;`;
  const countryMap = new Map();
  for (const c of allCountries) {
    countryMap.set(c.country_code, c.id);
  }

  // 8. Seed Agencies (ensure EVERY country has at least 1 agency)
  console.log("8. Seeding agencies for all countries...");
  const agencies = [
    {
      country_code: "ET",
      name: "وكالة أديس أبابا للتوظيف الدولي (Addis International Agency)",
      license_no: "ET-REC-2023-01",
      phone: "+251 11 551 2345",
      email: "ops@addisagency.et",
    },
    {
      country_code: "ET",
      name: "وكالة الهضبة للاستقدام (Ethiopian Highland Recruitment)",
      license_no: "ET-REC-2023-02",
      phone: "+251 11 552 8765",
      email: "info@highlandrec.et",
    },
    {
      country_code: "UG",
      name: "وكالة كمبالا للعمالة الخارجية (Kampala Manpower Agency)",
      license_no: "UG-REC-2024-11",
      phone: "+256 41 434 1122",
      email: "kampala@ugmanpower.ug",
    },
    {
      country_code: "UG",
      name: "وكالة النيل للاستقدام (Nile Overseas Agency)",
      license_no: "UG-REC-2024-12",
      phone: "+256 41 434 3344",
      email: "contact@nileoverseas.ug",
    },
    {
      country_code: "KE",
      name: "وكالة نيروبي للتوظيف الفني (Nairobi Placement Services)",
      license_no: "KE-REC-2023-88",
      phone: "+254 20 271 9900",
      email: "nairobi@placement.ke",
    },
    {
      country_code: "PH",
      name: "وكالة مانيلا للخدمات والعمالة (Manila Overseas Employment)",
      license_no: "PH-POEA-2022-771",
      phone: "+63 2 8524 6601",
      email: "info@manilaemployment.ph",
    },
    {
      country_code: "IN",
      name: "وكالة مومباي للتوظيف المهني (Mumbai Placement Services)",
      license_no: "IN-MEA-2021-450",
      phone: "+91 22 2654 3210",
      email: "delhi@mumbaiplacement.in",
    },
  ];

  for (const a of agencies) {
    const cid = countryMap.get(a.country_code);
    if (!cid) continue;
    const [existing] = await sql`
      SELECT id FROM public.agencies WHERE name = ${a.name} AND country_id = ${cid}::uuid;
    `;
    if (!existing) {
      await sql`
        INSERT INTO public.agencies (name, country_id, license_no, phone, email)
        VALUES (${a.name}, ${cid}::uuid, ${a.license_no}, ${a.phone}, ${a.email});
      `;
    }
  }

  // 9. Link existing 54 records to Ethiopia & first agency
  console.log("9. Linking existing records to Ethiopia and Addis agency...");
  const ethiopiaId = countryMap.get("ET");
  const [firstAgency] = await sql`
    SELECT id FROM public.agencies WHERE country_id = ${ethiopiaId}::uuid LIMIT 1;
  `;

  if (ethiopiaId && firstAgency) {
    await sql`
      UPDATE public.records
      SET country_id = ${ethiopiaId}::uuid,
          agency_id = ${firstAgency.id}::uuid
      WHERE country_id IS NULL;
    `;
  }

  // 10. Seed Demo Accounts for All 3 Roles
  console.log("10. Setting up Demo Accounts for SUPER_ADMIN, ADMIN, and STAFF...");

  // Super Admin 1: admin@falfaisal.com
  await sql`
    INSERT INTO public.users (email, password_hash, full_name, role)
    VALUES (
      'admin@falfaisal.com',
      crypt('Faisal@Admin#9841&Secure', gen_salt('bf')),
      'المدير العام (Super Admin)',
      'SUPER_ADMIN'
    )
    ON CONFLICT (email) DO UPDATE SET
      role = 'SUPER_ADMIN',
      full_name = 'المدير العام (Super Admin)',
      password_hash = crypt('Faisal@Admin#9841&Secure', gen_salt('bf'));
  `;

  // Super Admin 2: superadmin@falfaisal.com
  await sql`
    INSERT INTO public.users (email, password_hash, full_name, role)
    VALUES (
      'superadmin@falfaisal.com',
      crypt('Faisal@SuperAdmin#9841&Secure', gen_salt('bf')),
      'سوبر أدمن المنظومة (Super Admin)',
      'SUPER_ADMIN'
    )
    ON CONFLICT (email) DO UPDATE SET
      role = 'SUPER_ADMIN',
      password_hash = crypt('Faisal@SuperAdmin#9841&Secure', gen_salt('bf'));
  `;

  // Admin (Ethiopia): admin.eth@falfaisal.com
  const [adminEth] = await sql`
    INSERT INTO public.users (email, password_hash, full_name, role)
    VALUES (
      'admin.eth@falfaisal.com',
      crypt('Faisal@AdminEth#4821&Secure', gen_salt('bf')),
      'أدمن مكتب إثيوبيا (Admin - Ethiopia)',
      'ADMIN'
    )
    ON CONFLICT (email) DO UPDATE SET
      role = 'ADMIN',
      password_hash = crypt('Faisal@AdminEth#4821&Secure', gen_salt('bf'))
    RETURNING id;
  `;

  // Admin (Multi: Uganda & Kenya): admin.multi@falfaisal.com
  const [adminMulti] = await sql`
    INSERT INTO public.users (email, password_hash, full_name, role)
    VALUES (
      'admin.multi@falfaisal.com',
      crypt('Faisal@AdminMulti#7634&Secure', gen_salt('bf')),
      'أدمن شرق إفريقيا (Admin - Uganda & Kenya)',
      'ADMIN'
    )
    ON CONFLICT (email) DO UPDATE SET
      role = 'ADMIN',
      password_hash = crypt('Faisal@AdminMulti#7634&Secure', gen_salt('bf'))
    RETURNING id;
  `;

  // Staff (Read-Only Global): staff@falfaisal.com
  await sql`
    INSERT INTO public.users (email, password_hash, full_name, role)
    VALUES (
      'staff@falfaisal.com',
      crypt('Faisal@Staff#3172&Secure', gen_salt('bf')),
      'موظف متابعة وقراءة (Staff - Read Only)',
      'STAFF'
    )
    ON CONFLICT (email) DO UPDATE SET
      role = 'STAFF',
      password_hash = crypt('Faisal@Staff#3172&Secure', gen_salt('bf'));
  `;

  // Sync profiles and user_roles for all users
  const allUsers = await sql`SELECT id, email, full_name, role FROM public.users;`;
  for (const u of allUsers) {
    await sql`
      INSERT INTO public.profiles (id, email, full_name)
      VALUES (${u.id}::uuid, ${u.email}, ${u.full_name})
      ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;
    `;
    await sql`
      DELETE FROM public.user_roles WHERE user_id = ${u.id}::uuid;
    `;
    await sql`
      INSERT INTO public.user_roles (user_id, role)
      VALUES (${u.id}::uuid, ${u.role});
    `;
  }

  // 11. Assign Countries to Admins (Junction table)
  console.log("11. Assigning countries to Admin accounts...");
  const ugandaId = countryMap.get("UG");
  const kenyaId = countryMap.get("KE");

  // Admin Ethiopia -> Assigned to Ethiopia
  if (adminEth?.id && ethiopiaId) {
    await sql`
      INSERT INTO public.admin_countries (user_id, country_id)
      VALUES (${adminEth.id}::uuid, ${ethiopiaId}::uuid)
      ON CONFLICT (user_id, country_id) DO NOTHING;
    `;
  }

  // Admin Multi -> Assigned to Uganda & Kenya
  if (adminMulti?.id && ugandaId && kenyaId) {
    await sql`
      INSERT INTO public.admin_countries (user_id, country_id)
      VALUES (${adminMulti.id}::uuid, ${ugandaId}::uuid)
      ON CONFLICT (user_id, country_id) DO NOTHING;
    `;
    await sql`
      INSERT INTO public.admin_countries (user_id, country_id)
      VALUES (${adminMulti.id}::uuid, ${kenyaId}::uuid)
      ON CONFLICT (user_id, country_id) DO NOTHING;
    `;
  }

  // Add 2 sample records for Uganda and Kenya so Admin Multi has records to see and test!
  const [ugandaAgency] = await sql`
    SELECT id FROM public.agencies WHERE country_id = ${ugandaId}::uuid LIMIT 1;
  `;
  const [kenyaAgency] = await sql`
    SELECT id FROM public.agencies WHERE country_id = ${kenyaId}::uuid LIMIT 1;
  `;

  if (ugandaId && ugandaAgency) {
    const [existUg] =
      await sql`SELECT id FROM public.records WHERE worker_name = 'NABAKOOZA SARAH';`;
    if (!existUg) {
      await sql`
        INSERT INTO public.records (
          sponsor_name, worker_name, passport_no, visa_no, city,
          medical, payment_state, visa_status, amount, currency,
          country_id, agency_id, created_by_email, updated_by_email
        ) VALUES (
          'سلطان عبدالعزيز الشمري', 'NABAKOOZA SARAH', 'B0192834', '1827364501', 'الرياض',
          'FIT', 'PENDING', 'EMBASSY', 4200.00, 'SAR',
          ${ugandaId}::uuid, ${ugandaAgency.id}::uuid, 'admin.multi@falfaisal.com', 'admin.multi@falfaisal.com'
        );
      `;
    }
  }

  if (kenyaId && kenyaAgency) {
    const [existKe] =
      await sql`SELECT id FROM public.records WHERE worker_name = 'WANJIKU MARY NJERI';`;
    if (!existKe) {
      await sql`
        INSERT INTO public.records (
          sponsor_name, worker_name, passport_no, visa_no, city,
          medical, payment_state, visa_status, amount, currency,
          country_id, agency_id, created_by_email, updated_by_email
        ) VALUES (
          'خالد فهد السبيعي', 'WANJIKU MARY NJERI', 'AK982341', '1928374652', 'جدة',
          'PENDING', 'UNPAID', 'WKALA', 4000.00, 'SAR',
          ${kenyaId}::uuid, ${kenyaAgency.id}::uuid, 'admin.multi@falfaisal.com', 'admin.multi@falfaisal.com'
        );
      `;
    }
  }

  // 12. Update audit log trigger to capture country_id and agency_id changes
  console.log("12. Updating audit trigger...");
  await sql.unsafe(`
    CREATE OR REPLACE FUNCTION public.records_audit()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    DECLARE
      diff JSONB := '{}'::jsonb;
      k TEXT;
      o JSONB;
      n JSONB;
    BEGIN
      IF tg_op = 'INSERT' THEN
        INSERT INTO public.audit_log(record_id, serial_no, action, actor_email, changes)
        VALUES (new.id, new.serial_no, 'create', coalesce(new.created_by_email, 'system'), null);
        RETURN new;
      ELSIF tg_op = 'UPDATE' THEN
        o := to_jsonb(old);
        n := to_jsonb(new);
        FOR k IN SELECT jsonb_object_keys(n) LOOP
          IF k NOT IN ('updated_at', 'updated_by', 'updated_by_email') AND (o->k) IS DISTINCT FROM (n->k) THEN
            diff := diff || jsonb_build_object(k, jsonb_build_object('from', o->k, 'to', n->k));
          END IF;
        END LOOP;
        IF diff <> '{}'::jsonb THEN
          INSERT INTO public.audit_log(record_id, serial_no, action, actor_email, changes)
          VALUES (new.id, new.serial_no, 'update', coalesce(new.updated_by_email, 'system'), diff);
        END IF;
        RETURN new;
      ELSE
        INSERT INTO public.audit_log(record_id, serial_no, action, actor_email, changes)
        VALUES (old.id, old.serial_no, 'delete', coalesce(old.updated_by_email, 'system'), jsonb_build_object('worker_name', old.worker_name, 'sponsor_name', old.sponsor_name));
        RETURN old;
      END IF;
    END;
    $$;
  `);

  console.log("RBAC and Multi-Tenant Migration successfully completed!");
  await sql.end();
}

runMigration().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});
