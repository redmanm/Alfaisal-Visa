import { createServerFn } from "@tanstack/react-start";
import { sql } from "./neon.server";

export interface RecordPayload {
  sponsor_name: string;
  sponsor_id?: string | null;
  phone?: string | null;
  worker_name?: string | null;
  passport_no?: string | null;
  visa_no?: string | null;
  musaned_no?: string | null;
  city?: string | null;
  country_id?: string | null;
  agency_id?: string | null;
  medical?: string;
  payment_state?: string;
  visa_status?: string;
  amount?: number | string;
  currency?: string;
  transaction_date?: string | null;
  processing_date?: string | null;
  airport?: string | null;
  reserved?: string | null;
  notes?: string | null;
  actor_email?: string | null;
  actor_id?: string | null;
  actor_role?: string | null;
}

// -------------------------------------------------------------------------
// 1. Fetch Records (Scoped by Admin Assigned Countries or Global for Super Admin & Staff)
// -------------------------------------------------------------------------
export const getRecordsServerFn = createServerFn({ method: "POST" })
  .validator((d?: { userId?: string; role?: string }) => d)
  .handler(async ({ data }) => {
    try {
      const role = data?.role?.toUpperCase();
      const userId = data?.userId;

      let assignedCountryIds: string[] = [];

      // If user is Admin, determine their assigned country IDs
      if (role === "ADMIN" && userId) {
        const rows = await sql`
          SELECT country_id::text
          FROM public.admin_countries
          WHERE user_id = ${userId}::uuid;
        `;
        assignedCountryIds = rows.map((r) => r.country_id);
        // If an Admin has no assigned countries yet, return empty list
        if (assignedCountryIds.length === 0) {
          return { data: [], error: null };
        }
      }

      // Query records
      let rows;
      if (role === "ADMIN" && assignedCountryIds.length > 0) {
        rows = await sql`
          SELECT 
            r.id,
            r.serial_no,
            r.sponsor_name,
            r.sponsor_id,
            r.phone,
            r.worker_name,
            r.passport_no,
            r.visa_no,
            r.musaned_no,
            r.city,
            r.country_id::text as country_id,
            r.agency_id::text as agency_id,
            c.name as country_name,
            c.country_code as country_code,
            a.name as agency_name,
            r.medical,
            r.payment_state,
            r.visa_status,
            r.amount::float8 as amount,
            r.currency,
            to_char(r.transaction_date, 'YYYY-MM-DD') as transaction_date,
            to_char(r.processing_date, 'YYYY-MM-DD') as processing_date,
            r.airport,
            r.reserved,
            r.notes,
            r.created_by,
            r.created_by_email,
            r.updated_by,
            r.updated_by_email,
            r.created_at::text as created_at,
            r.updated_at::text as updated_at
          FROM public.records r
          LEFT JOIN public.countries c ON c.id = r.country_id
          LEFT JOIN public.agencies a ON a.id = r.agency_id
          WHERE r.country_id = ANY(${assignedCountryIds}::uuid[])
          ORDER BY r.serial_no ASC;
        `;
      } else {
        // Super Admin & Staff get global visibility across all records
        rows = await sql`
          SELECT 
            r.id,
            r.serial_no,
            r.sponsor_name,
            r.sponsor_id,
            r.phone,
            r.worker_name,
            r.passport_no,
            r.visa_no,
            r.musaned_no,
            r.city,
            r.country_id::text as country_id,
            r.agency_id::text as agency_id,
            c.name as country_name,
            c.country_code as country_code,
            a.name as agency_name,
            r.medical,
            r.payment_state,
            r.visa_status,
            r.amount::float8 as amount,
            r.currency,
            to_char(r.transaction_date, 'YYYY-MM-DD') as transaction_date,
            to_char(r.processing_date, 'YYYY-MM-DD') as processing_date,
            r.airport,
            r.reserved,
            r.notes,
            r.created_by,
            r.created_by_email,
            r.updated_by,
            r.updated_by_email,
            r.created_at::text as created_at,
            r.updated_at::text as updated_at
          FROM public.records r
          LEFT JOIN public.countries c ON c.id = r.country_id
          LEFT JOIN public.agencies a ON a.id = r.agency_id
          ORDER BY r.serial_no ASC;
        `;
      }
      return { data: rows, error: null };
    } catch (err) {
      console.error("Neon getRecords error:", err);
      return { data: [], error: err instanceof Error ? err.message : String(err) };
    }
  });

// -------------------------------------------------------------------------
// 2. Insert Record (Enforcing RBAC: Staff cannot create, Admin scoped)
// -------------------------------------------------------------------------
export const insertRecordServerFn = createServerFn({ method: "POST" })
  .validator((d: RecordPayload) => d)
  .handler(async ({ data }) => {
    try {
      const role = data.actor_role?.toUpperCase();
      if (role === "STAFF" || role === "SUPER_ADMIN") {
        return {
          data: null,
          error:
            role === "SUPER_ADMIN"
              ? "المدير العام يمتلك صلاحية الاطلاع فقط على المعاملات. إضافة المعاملات مقتصرة حصراً على المشرف المعتمد للدولة."
              : "حسابات الموظفين (Staff) مخصصة للاطلاع فقط ولا تملك صلاحية إضافة معاملات جديدة.",
        };
      }

      if (role === "ADMIN" && data.actor_id && data.country_id) {
        const [perm] = await sql`
          SELECT 1 FROM public.admin_countries
          WHERE user_id = ${data.actor_id}::uuid AND country_id = ${data.country_id}::uuid;
        `;
        if (!perm) {
          return {
            data: null,
            error: "ليس لديك صلاحية إضافة معاملات لدولة خارج نطاقك الإداري المخصص.",
          };
        }
      }

      const [inserted] = await sql`
        INSERT INTO public.records (
          sponsor_name, sponsor_id, phone, worker_name, passport_no,
          visa_no, musaned_no, city, country_id, agency_id, medical, payment_state,
          visa_status, amount, currency, transaction_date, processing_date,
          airport, reserved, notes, created_by_email, updated_by_email
        ) VALUES (
          ${data.sponsor_name},
          ${data.sponsor_id || null},
          ${data.phone || null},
          ${data.worker_name || null},
          ${data.passport_no || null},
          ${data.visa_no || null},
          ${data.musaned_no || null},
          ${data.city || null},
          ${data.country_id ? sql`${data.country_id}::uuid` : null},
          ${data.agency_id ? sql`${data.agency_id}::uuid` : null},
          ${data.medical || "PENDING"},
          ${data.payment_state || "PENDING"},
          ${data.visa_status || "WKALA"},
          ${Number(data.amount) || 0},
          ${data.currency || "SAR"},
          ${data.transaction_date ? sql`${data.transaction_date}::date` : null},
          ${data.processing_date ? sql`${data.processing_date}::date` : null},
          ${data.airport || null},
          ${data.reserved || null},
          ${data.notes || null},
          ${data.actor_email || null},
          ${data.actor_email || null}
        )
        RETURNING id, serial_no;
      `;
      return { data: inserted, error: null };
    } catch (err) {
      console.error("Neon insertRecord error:", err);
      return { data: null, error: err instanceof Error ? err.message : String(err) };
    }
  });

// -------------------------------------------------------------------------
// 3. Update Record (Enforcing RBAC)
// -------------------------------------------------------------------------
export const updateRecordServerFn = createServerFn({ method: "POST" })
  .validator(
    (d: { id: string; payload: Partial<RecordPayload>; actorRole?: string; actorId?: string }) => d,
  )
  .handler(async ({ data }) => {
    try {
      const role = data.actorRole?.toUpperCase();
      if (role === "STAFF" || role === "SUPER_ADMIN") {
        return {
          data: null,
          error:
            role === "SUPER_ADMIN"
              ? "المدير العام يمتلك صلاحية الاطلاع فقط على المعاملات. تعديل بيانات ومراحل المعاملات محصور بالمشرف المعتمد للدولة."
              : "حسابات الموظفين (Staff) مخصصة للاطلاع فقط ولا تملك صلاحية تعديل المعاملات.",
        };
      }

      if (role === "ADMIN" && data.actorId) {
        // Check current record country
        const [rec] = await sql`
          SELECT country_id FROM public.records WHERE id = ${data.id}::uuid;
        `;
        if (rec?.country_id) {
          const [perm] = await sql`
            SELECT 1 FROM public.admin_countries
            WHERE user_id = ${data.actorId}::uuid AND country_id = ${rec.country_id}::uuid;
          `;
          if (!perm) {
            return {
              data: null,
              error: "ليس لديك صلاحية تعديل هذه المعاملة لأنها تابعة لدولة خارج نطاقك المخصص.",
            };
          }
        }
      }

      const p = data.payload;
      const [updated] = await sql`
        UPDATE public.records SET
          sponsor_name = coalesce(${p.sponsor_name ?? null}, sponsor_name),
          sponsor_id = ${p.sponsor_id !== undefined ? p.sponsor_id : sql`sponsor_id`},
          phone = ${p.phone !== undefined ? p.phone : sql`phone`},
          worker_name = ${p.worker_name !== undefined ? p.worker_name : sql`worker_name`},
          passport_no = ${p.passport_no !== undefined ? p.passport_no : sql`passport_no`},
          visa_no = ${p.visa_no !== undefined ? p.visa_no : sql`visa_no`},
          musaned_no = ${p.musaned_no !== undefined ? p.musaned_no : sql`musaned_no`},
          city = ${p.city !== undefined ? p.city : sql`city`},
          country_id = ${p.country_id ? sql`${p.country_id}::uuid` : sql`country_id`},
          agency_id = ${p.agency_id ? sql`${p.agency_id}::uuid` : sql`agency_id`},
          medical = coalesce(${p.medical ?? null}, medical),
          payment_state = coalesce(${p.payment_state ?? null}, payment_state),
          visa_status = coalesce(${p.visa_status ?? null}, visa_status),
          amount = ${p.amount !== undefined ? Number(p.amount) : sql`amount`},
          currency = coalesce(${p.currency ?? null}, currency),
          transaction_date = ${p.transaction_date ? sql`${p.transaction_date}::date` : p.transaction_date === null ? null : sql`transaction_date`},
          processing_date = ${p.processing_date ? sql`${p.processing_date}::date` : p.processing_date === null ? null : sql`processing_date`},
          airport = ${p.airport !== undefined ? p.airport : sql`airport`},
          reserved = ${p.reserved !== undefined ? p.reserved : sql`reserved`},
          notes = ${p.notes !== undefined ? p.notes : sql`notes`},
          updated_by_email = ${p.actor_email ?? sql`updated_by_email`},
          updated_at = now()
        WHERE id = ${data.id}::uuid
        RETURNING id, serial_no;
      `;
      return { data: updated, error: null };
    } catch (err) {
      console.error("Neon updateRecord error:", err);
      return { data: null, error: err instanceof Error ? err.message : String(err) };
    }
  });

// -------------------------------------------------------------------------
// 4. Delete Record (Enforcing RBAC: Staff cannot delete, Admin scoped)
// -------------------------------------------------------------------------
export const deleteRecordServerFn = createServerFn({ method: "POST" })
  .validator((d: { id: string; actorRole?: string; actorId?: string }) => d)
  .handler(async ({ data }) => {
    try {
      const role = data.actorRole?.toUpperCase();
      if (role === "STAFF" || role === "SUPER_ADMIN") {
        return {
          error:
            role === "SUPER_ADMIN"
              ? "المدير العام يمتلك صلاحية الاطلاع فقط على المعاملات. حذف المعاملات محصور بالمشرف المعتمد للدولة."
              : "حسابات الموظفين (Staff) مخصصة للاطلاع فقط ولا تملك صلاحية حذف المعاملات.",
        };
      }

      if (role === "ADMIN" && data.actorId) {
        const [rec] = await sql`
          SELECT country_id FROM public.records WHERE id = ${data.id}::uuid;
        `;
        if (rec?.country_id) {
          const [perm] = await sql`
            SELECT 1 FROM public.admin_countries
            WHERE user_id = ${data.actorId}::uuid AND country_id = ${rec.country_id}::uuid;
          `;
          if (!perm) {
            return {
              error: "ليس لديك صلاحية حذف هذه المعاملة لأنها تابعة لدولة خارج نطاقك.",
            };
          }
        }
      }

      await sql`DELETE FROM public.records WHERE id = ${data.id}::uuid;`;
      return { error: null };
    } catch (err) {
      console.error("Neon deleteRecord error:", err);
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

// -------------------------------------------------------------------------
// 5. Fetch Audit Logs
// -------------------------------------------------------------------------
export const getAuditLogsServerFn = createServerFn({ method: "POST" })
  .validator((d?: { serial_no?: number | null }) => d)
  .handler(async ({ data }) => {
    try {
      let rows;
      if (data?.serial_no) {
        rows = await sql`
          SELECT 
            id::int as id,
            record_id::text as record_id,
            serial_no,
            action,
            actor_email,
            changes,
            created_at::text as created_at
          FROM public.audit_log
          WHERE serial_no = ${data.serial_no}
          ORDER BY created_at DESC;
        `;
      } else {
        rows = await sql`
          SELECT 
            id::int as id,
            record_id::text as record_id,
            serial_no,
            action,
            actor_email,
            changes,
            created_at::text as created_at
          FROM public.audit_log
          ORDER BY created_at DESC
          LIMIT 500;
        `;
      }
      return { data: rows, error: null };
    } catch (err) {
      console.error("Neon getAuditLogs error:", err);
      return { data: [], error: err instanceof Error ? err.message : String(err) };
    }
  });

// -------------------------------------------------------------------------
// 6. Countries & Agencies Management (Super Admin)
// -------------------------------------------------------------------------
export const getCountriesServerFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const countries = await sql`
      SELECT 
        c.id,
        c.name,
        c.country_code,
        c.created_at::text as created_at,
        count(a.id)::int as agency_count
      FROM public.countries c
      LEFT JOIN public.agencies a ON a.country_id = c.id
      GROUP BY c.id, c.name, c.country_code, c.created_at
      ORDER BY c.name ASC;
    `;

    const agencies = await sql`
      SELECT 
        id,
        name,
        country_id::text as country_id,
        license_no,
        phone,
        email,
        created_at::text as created_at
      FROM public.agencies
      ORDER BY name ASC;
    `;

    const countryList = countries.map((c) => ({
      ...c,
      agencies: agencies.filter((a) => a.country_id === c.id),
    }));

    return { data: countryList, error: null };
  } catch (err) {
    console.error("Neon getCountries error:", err);
    return { data: [], error: err instanceof Error ? err.message : String(err) };
  }
});

export const getAgenciesServerFn = createServerFn({ method: "POST" })
  .validator((d?: { countryId?: string }) => d)
  .handler(async ({ data }) => {
    try {
      let rows;
      if (data?.countryId) {
        rows = await sql`
          SELECT 
            a.id,
            a.name,
            a.country_id::text as country_id,
            a.license_no,
            a.phone,
            a.email,
            a.created_at::text as created_at,
            c.name as country_name,
            c.country_code as country_code
          FROM public.agencies a
          JOIN public.countries c ON c.id = a.country_id
          WHERE a.country_id = ${data.countryId}::uuid
          ORDER BY a.name ASC;
        `;
      } else {
        rows = await sql`
          SELECT 
            a.id,
            a.name,
            a.country_id::text as country_id,
            a.license_no,
            a.phone,
            a.email,
            a.created_at::text as created_at,
            c.name as country_name,
            c.country_code as country_code
          FROM public.agencies a
          JOIN public.countries c ON c.id = a.country_id
          ORDER BY a.name ASC;
        `;
      }
      return { data: rows, error: null };
    } catch (err) {
      console.error("Neon getAgencies error:", err);
      return { data: [], error: err instanceof Error ? err.message : String(err) };
    }
  });

// Create Country (Ensuring at least 1 agency is provided as per business rule)
export const createCountryServerFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      name: string;
      countryCode: string;
      initialAgencyName: string;
      initialAgencyPhone?: string;
      initialAgencyEmail?: string;
      initialAgencyLicense?: string;
      userRole?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    try {
      if (data.userRole?.toUpperCase() !== "SUPER_ADMIN") {
        return { data: null, error: "فقط Super Admin يملك صلاحية إضافة دول واستقدام جديدة." };
      }
      if (!data.name.trim() || !data.countryCode.trim()) {
        return { data: null, error: "اسم الدولة وكود الدولة مطلوبان." };
      }
      if (!data.initialAgencyName.trim()) {
        return {
          data: null,
          error: "قاعدة النظام: يجب ربط كل دولة بوكالة واحدة على الأقل عند الإنشاء.",
        };
      }

      const [newCountry] = await sql`
        INSERT INTO public.countries (name, country_code)
        VALUES (${data.name.trim()}, ${data.countryCode.trim().toUpperCase()})
        RETURNING id, name, country_code;
      `;

      const [newAgency] = await sql`
        INSERT INTO public.agencies (name, country_id, license_no, phone, email)
        VALUES (
          ${data.initialAgencyName.trim()},
          ${newCountry.id}::uuid,
          ${data.initialAgencyLicense?.trim() || null},
          ${data.initialAgencyPhone?.trim() || null},
          ${data.initialAgencyEmail?.trim() || null}
        )
        RETURNING id, name;
      `;

      return { data: { country: newCountry, agency: newAgency }, error: null };
    } catch (err) {
      console.error("Neon createCountry error:", err);
      return { data: null, error: err instanceof Error ? err.message : String(err) };
    }
  });

export const updateCountryServerFn = createServerFn({ method: "POST" })
  .validator((d: { id: string; name: string; countryCode: string; userRole?: string }) => d)
  .handler(async ({ data }) => {
    try {
      if (data.userRole?.toUpperCase() !== "SUPER_ADMIN") {
        return { error: "فقط Super Admin يملك صلاحية تعديل بيانات الدول." };
      }
      await sql`
        UPDATE public.countries
        SET name = ${data.name.trim()},
            country_code = ${data.countryCode.trim().toUpperCase()}
        WHERE id = ${data.id}::uuid;
      `;
      return { error: null };
    } catch (err) {
      console.error("Neon updateCountry error:", err);
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

export const deleteCountryServerFn = createServerFn({ method: "POST" })
  .validator((d: { id: string; userRole?: string }) => d)
  .handler(async ({ data }) => {
    try {
      if (data.userRole?.toUpperCase() !== "SUPER_ADMIN") {
        return { error: "فقط Super Admin يملك صلاحية حذف الدول." };
      }
      // Check if there are candidate records linked
      const [count] = await sql`
        SELECT count(*)::int as count FROM public.records WHERE country_id = ${data.id}::uuid;
      `;
      if (count.count > 0) {
        return {
          error: `لا يمكن حذف هذه الدولة لاحتوائها على (${count.count}) معاملة مرتبطة بها في النظام.`,
        };
      }
      await sql`DELETE FROM public.countries WHERE id = ${data.id}::uuid;`;
      return { error: null };
    } catch (err) {
      console.error("Neon deleteCountry error:", err);
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

// Create Agency
export const createAgencyServerFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      name: string;
      countryId: string;
      licenseNo?: string;
      phone?: string;
      email?: string;
      userRole?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    try {
      if (data.userRole?.toUpperCase() !== "SUPER_ADMIN") {
        return { data: null, error: "فقط Super Admin يملك صلاحية إضافة وكالات جديدة." };
      }
      const [agency] = await sql`
        INSERT INTO public.agencies (name, country_id, license_no, phone, email)
        VALUES (
          ${data.name.trim()},
          ${data.countryId}::uuid,
          ${data.licenseNo?.trim() || null},
          ${data.phone?.trim() || null},
          ${data.email?.trim() || null}
        )
        RETURNING id, name;
      `;
      return { data: agency, error: null };
    } catch (err) {
      console.error("Neon createAgency error:", err);
      return { data: null, error: err instanceof Error ? err.message : String(err) };
    }
  });

// Delete Agency (Enforcing: Every Country MUST have at least 1 Agency assigned)
export const deleteAgencyServerFn = createServerFn({ method: "POST" })
  .validator((d: { id: string; countryId: string; userRole?: string }) => d)
  .handler(async ({ data }) => {
    try {
      if (data.userRole?.toUpperCase() !== "SUPER_ADMIN") {
        return { error: "فقط Super Admin يملك صلاحية حذف الوكالات." };
      }
      const [agencyCount] = await sql`
        SELECT count(*)::int as count FROM public.agencies WHERE country_id = ${data.countryId}::uuid;
      `;
      if (agencyCount.count <= 1) {
        return {
          error:
            "لا يمكن حذف هذه الوكالة: تفرض قواعد النظام أن تحتوي كل دولة على وكالة واحدة على الأقل.",
        };
      }
      await sql`DELETE FROM public.agencies WHERE id = ${data.id}::uuid;`;
      return { error: null };
    } catch (err) {
      console.error("Neon deleteAgency error:", err);
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

// -------------------------------------------------------------------------
// 7. Admin Accounts & Country Assignment Management (Super Admin)
// -------------------------------------------------------------------------
export const getAdminsServerFn = createServerFn({ method: "POST" })
  .validator((d?: { userRole?: string }) => d)
  .handler(async ({ data }) => {
    try {
      if (data?.userRole?.toUpperCase() !== "SUPER_ADMIN") {
        return { data: [], error: "غير مصرح: إدارة المشرفين متاحة فقط للـ Super Admin." };
      }

      const users = await sql`
        SELECT 
          u.id,
          u.email,
          u.full_name,
          u.role,
          u.created_at::text as created_at
        FROM public.users u
        ORDER BY 
          CASE WHEN u.role = 'SUPER_ADMIN' THEN 1 WHEN u.role = 'ADMIN' THEN 2 ELSE 3 END,
          u.email ASC;
      `;

      const adminCountries = await sql`
        SELECT 
          ac.user_id::text as user_id,
          ac.country_id::text as country_id,
          c.name as country_name,
          c.country_code
        FROM public.admin_countries ac
        JOIN public.countries c ON c.id = ac.country_id;
      `;

      const list = users.map((u) => {
        const assignments = adminCountries.filter((ac) => ac.user_id === u.id);
        return {
          ...u,
          assigned_country_ids: assignments.map((a) => a.country_id),
          assigned_countries: assignments.map((a) => ({
            id: a.country_id,
            name: a.country_name,
            country_code: a.country_code,
          })),
        };
      });

      return { data: list, error: null };
    } catch (err) {
      console.error("Neon getAdmins error:", err);
      return { data: [], error: err instanceof Error ? err.message : String(err) };
    }
  });

// Create Admin (Enforcing: Every Admin MUST be assigned to at least 1 Country)
export const createAdminServerFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      name: string;
      email: string;
      password: string;
      role: "ADMIN" | "STAFF";
      countryIds: string[];
      userRole?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    try {
      if (data.userRole?.toUpperCase() !== "SUPER_ADMIN") {
        return { data: null, error: "غير مصرح: إنشاء حسابات الإدارة متاح فقط للـ Super Admin." };
      }

      if (data.role === "ADMIN" && (!data.countryIds || data.countryIds.length === 0)) {
        return {
          data: null,
          error: "قاعدة النظام: يجب تعيين دولة واحدة على الأقل لكل مسؤول (Admin).",
        };
      }

      const email = data.email.trim().toLowerCase();
      const [existing] = await sql`SELECT id FROM public.users WHERE lower(email) = ${email};`;
      if (existing) {
        return { data: null, error: "البريد الإلكتروني مسجل بالفعل لمستخدم آخر." };
      }

      const [newUser] = await sql`
        INSERT INTO public.users (email, password_hash, full_name, role)
        VALUES (
          ${email},
          crypt(${data.password}, gen_salt('bf')),
          ${data.name.trim()},
          ${data.role}
        )
        RETURNING id, email, full_name, role;
      `;

      await sql`
        INSERT INTO public.profiles (id, email, full_name)
        VALUES (${newUser.id}::uuid, ${email}, ${data.name.trim()})
        ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name;
      `;

      await sql`
        INSERT INTO public.user_roles (user_id, role)
        VALUES (${newUser.id}::uuid, ${data.role})
        ON CONFLICT (user_id, role) DO NOTHING;
      `;

      // Assign Countries
      if (data.role === "ADMIN" && data.countryIds.length > 0) {
        for (const cid of data.countryIds) {
          await sql`
            INSERT INTO public.admin_countries (user_id, country_id)
            VALUES (${newUser.id}::uuid, ${cid}::uuid)
            ON CONFLICT (user_id, country_id) DO NOTHING;
          `;
        }
      }

      return { data: newUser, error: null };
    } catch (err) {
      console.error("Neon createAdmin error:", err);
      return { data: null, error: err instanceof Error ? err.message : String(err) };
    }
  });

// Update Admin Country Assignments (Enforcing: Every Admin MUST be assigned to at least 1 Country)
export const updateAdminCountriesServerFn = createServerFn({ method: "POST" })
  .validator((d: { userId: string; countryIds: string[]; userRole?: string }) => d)
  .handler(async ({ data }) => {
    try {
      if (data.userRole?.toUpperCase() !== "SUPER_ADMIN") {
        return { error: "غير مصرح: تعديل تخصيص الدول متاح فقط للـ Super Admin." };
      }

      if (!data.countryIds || data.countryIds.length === 0) {
        return {
          error: "قاعدة النظام: يجب أن يكون المسؤول (Admin) مخصصاً لدولة واحدة على الأقل.",
        };
      }

      // Reassign countries
      await sql`DELETE FROM public.admin_countries WHERE user_id = ${data.userId}::uuid;`;

      for (const cid of data.countryIds) {
        await sql`
          INSERT INTO public.admin_countries (user_id, country_id)
          VALUES (${data.userId}::uuid, ${cid}::uuid)
          ON CONFLICT (user_id, country_id) DO NOTHING;
        `;
      }

      return { error: null };
    } catch (err) {
      console.error("Neon updateAdminCountries error:", err);
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

// Delete Admin
export const deleteAdminServerFn = createServerFn({ method: "POST" })
  .validator((d: { userId: string; userRole?: string }) => d)
  .handler(async ({ data }) => {
    try {
      if (data.userRole?.toUpperCase() !== "SUPER_ADMIN") {
        return { error: "غير مصرح: حذف المشرفين متاح فقط للـ Super Admin." };
      }
      await sql`DELETE FROM public.users WHERE id = ${data.userId}::uuid;`;
      return { error: null };
    } catch (err) {
      console.error("Neon deleteAdmin error:", err);
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

// -------------------------------------------------------------------------
// 8. Authentication: Sign In (Returns User, Role, and Assigned Countries)
// -------------------------------------------------------------------------
export const authSignInServerFn = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    try {
      const email = data.email.trim().toLowerCase();
      const [user] = await sql`
        SELECT id, email, full_name, role
        FROM public.users
        WHERE lower(email) = ${email}
          AND password_hash = crypt(${data.password}, password_hash)
        LIMIT 1;
      `;

      if (!user) {
        return { user: null, session: null, error: "بيانات الدخول غير صحيحة" };
      }

      // Fetch assigned countries
      const adminCountries = await sql`
        SELECT ac.country_id::text as id, ac.country_id::text as country_id, c.name, c.name as country_name, c.country_code
        FROM public.admin_countries ac
        JOIN public.countries c ON c.id = ac.country_id
        WHERE ac.user_id = ${user.id}::uuid;
      `;

      const assignedCountryIds = adminCountries.map((c) => c.country_id);
      const mappedCountries = adminCountries.map((c) => ({
        id: (c.id || c.country_id) as string,
        name: (c.name || c.country_name) as string,
        country_code: c.country_code as string,
      }));

      const session = {
        access_token: "neon_token_" + Buffer.from(`${user.id}:${Date.now()}`).toString("base64"),
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          assigned_country_ids: assignedCountryIds,
          assigned_countries: mappedCountries,
          user_metadata: {
            full_name: user.full_name,
            role: user.role,
            assigned_country_ids: assignedCountryIds,
          },
        },
      };

      return { user: session.user, session, error: null };
    } catch (err) {
      console.error("Neon authSignIn error:", err);
      return { user: null, session: null, error: err instanceof Error ? err.message : String(err) };
    }
  });

// -------------------------------------------------------------------------
// 9. Authentication: Sign Up
// -------------------------------------------------------------------------
export const authSignUpServerFn = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string; fullName?: string }) => d)
  .handler(async ({ data }) => {
    try {
      const email = data.email.trim().toLowerCase();
      const fullName = data.fullName?.trim() || "";

      const [existing] = await sql`SELECT id FROM public.users WHERE lower(email) = ${email};`;
      if (existing) {
        return { user: null, session: null, error: "المستخدم مسجل بالفعل" };
      }

      const [adminCount] =
        await sql`SELECT count(*)::int as count FROM public.users WHERE role = 'SUPER_ADMIN';`;
      const role = adminCount.count === 0 ? "SUPER_ADMIN" : "STAFF";

      const [newUser] = await sql`
        INSERT INTO public.users (email, password_hash, full_name, role)
        VALUES (
          ${email},
          crypt(${data.password}, gen_salt('bf')),
          ${fullName},
          ${role}
        )
        RETURNING id, email, full_name, role;
      `;

      await sql`
        INSERT INTO public.profiles (id, email, full_name)
        VALUES (${newUser.id}::uuid, ${email}, ${fullName})
        ON CONFLICT (id) DO NOTHING;
      `;

      await sql`
        INSERT INTO public.user_roles (user_id, role)
        VALUES (${newUser.id}::uuid, ${role})
        ON CONFLICT (user_id, role) DO NOTHING;
      `;

      const session = {
        access_token: "neon_token_" + Buffer.from(`${newUser.id}:${Date.now()}`).toString("base64"),
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          assigned_country_ids: [],
          user_metadata: { full_name: newUser.full_name, role: newUser.role },
        },
      };

      return { user: session.user, session, error: null };
    } catch (err) {
      console.error("Neon authSignUp error:", err);
      return { user: null, session: null, error: err instanceof Error ? err.message : String(err) };
    }
  });

// -------------------------------------------------------------------------
// 10. Executive Dashboard Server Function (Exclusively for Super Admin)
// Real-time tracking across 4 main dimensions:
// 1. Overall System Status Breakdown
// 2. Admin Status & Performance Metrics
// 3. Country-Level Pipeline Overview
// 4. Agency-Level Visa Processing Status (Drill-Down View)
// -------------------------------------------------------------------------

export interface ExecutiveGlobalMetrics {
  totalRecords: number;
  activeRecords: number;
  completedVisas: number;
  canceledRecords: number;
  totalAmount: number;
  totalPaidAmount: number;
  totalUnpaidAmount: number;
  currencies: Array<{
    currency: string;
    count: number;
    totalAmount: number;
    paidAmount: number;
    unpaidAmount: number;
  }>;
  statusBreakdown: {
    visaStamped: { count: number; percentage: number };
    trib: { count: number; percentage: number };
    wekalaPaid: { count: number; percentage: number };
    wekalaNotPaid: { count: number; percentage: number };
    canceled: { count: number; percentage: number };
  };
}

export interface ExecutiveAdminMetric {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
  assignedCountries: Array<{ id: string; name: string; countryCode: string }>;
  assignedAgencies: Array<{ id: string; name: string; countryId: string; countryName?: string }>;
  totalCandidateVolume: number;
  activePendingWorkload: number;
  completedVisas: number;
  canceledCount: number;
  totalFinancialVolume: number;
  paidFinancialVolume: number;
}

export interface ExecutiveCountryMetric {
  id: string;
  name: string;
  countryCode: string;
  agencyCount: number;
  assignedAdmins: Array<{ id: string; fullName: string; email: string }>;
  totalApplications: number;
  activeApplications: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  statusBreakdown: {
    visaStamped: { count: number; percentage: number };
    trib: { count: number; percentage: number };
    wekalaPaid: { count: number; percentage: number };
    wekalaNotPaid: { count: number; percentage: number };
    canceled: { count: number; percentage: number };
  };
}

export interface ExecutiveAgencyMetric {
  id: string;
  name: string;
  countryId: string;
  countryName: string;
  countryCode: string;
  licenseNo: string | null;
  phone: string | null;
  email: string | null;
  totalCandidates: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  visaStamped: { count: number; percentage: number };
  trib: { count: number; percentage: number };
  wekalaPaid: { count: number; percentage: number };
  wekalaNotPaid: { count: number; percentage: number };
  canceled: { count: number; percentage: number };
}

export interface ExecutiveDashboardData {
  overview: ExecutiveGlobalMetrics;
  admins: ExecutiveAdminMetric[];
  countries: ExecutiveCountryMetric[];
  agenciesByCountry: Array<{
    country: { id: string; name: string; countryCode: string };
    agencies: ExecutiveAgencyMetric[];
  }>;
}

export const getExecutiveDashboardServerFn = createServerFn({ method: "POST" })
  .validator((d?: { userRole?: string; userId?: string }) => d)
  .handler(
    async ({ data }): Promise<{ data: ExecutiveDashboardData | null; error: string | null }> => {
      try {
        const role = data?.userRole?.toUpperCase();
        if (role !== "SUPER_ADMIN") {
          return {
            data: null,
            error: "غير مصرح: لوحة القيادة التنفيذية مخصصة حصرياً للمدير العام (Super Admin).",
          };
        }

        // 1. Fetch all records with essential fields
        const rawRecords = await sql`
        SELECT 
          r.id::text as id,
          r.country_id::text as country_id,
          r.agency_id::text as agency_id,
          upper(coalesce(r.payment_state, 'PENDING')) as payment_state,
          upper(coalesce(r.visa_status, 'WKALA')) as visa_status,
          upper(coalesce(r.medical, 'PENDING')) as medical,
          coalesce(r.amount::float8, 0) as amount,
          upper(coalesce(r.currency, 'SAR')) as currency,
          r.transaction_date::text as transaction_date
        FROM public.records r;
      `;

        // 2. Fetch all countries
        const rawCountries = await sql`
        SELECT id::text as id, name, upper(country_code) as country_code
        FROM public.countries
        ORDER BY name ASC;
      `;

        // 3. Fetch all agencies
        const rawAgencies = await sql`
        SELECT 
          a.id::text as id,
          a.name,
          a.country_id::text as country_id,
          c.name as country_name,
          c.country_code,
          a.license_no,
          a.phone,
          a.email
        FROM public.agencies a
        LEFT JOIN public.countries c ON c.id = a.country_id
        ORDER BY a.name ASC;
      `;

        // 4. Fetch all admins and their country assignments
        const rawUsers = await sql`
        SELECT id::text as id, email, coalesce(full_name, '') as full_name, role, created_at::text as created_at
        FROM public.users
        WHERE role = 'ADMIN' OR role = 'SUPER_ADMIN'
        ORDER BY CASE WHEN role = 'SUPER_ADMIN' THEN 1 ELSE 2 END, email ASC;
      `;

        const rawAdminCountries = await sql`
        SELECT ac.user_id::text as user_id, ac.country_id::text as country_id
        FROM public.admin_countries ac;
      `;

        // Helper function to calculate safe percentages
        const calcPct = (cnt: number, tot: number) =>
          tot > 0 ? Math.round((cnt / tot) * 1000) / 10 : 0;

        // Group records by agency and by country
        const recordsByAgency = new Map<string, typeof rawRecords>();
        const recordsByCountry = new Map<string, typeof rawRecords>();

        for (const rec of rawRecords) {
          if (rec.country_id) {
            const list = recordsByCountry.get(rec.country_id) || [];
            list.push(rec);
            recordsByCountry.set(rec.country_id, list);
          }
          if (rec.agency_id) {
            const list = recordsByAgency.get(rec.agency_id) || [];
            list.push(rec);
            recordsByAgency.set(rec.agency_id, list);
          }
        }

        // Status helper
        const isVisaStamp = (vs: string) => vs === "VISA STAMP" || vs === "VISA STAMPED";
        const isTrib = (vs: string) => vs === "TRIB";
        const isPaid = (ps: string) => ps === "PAID";
        const isUnpaid = (ps: string) => ps === "PENDING" || ps === "UNPAID";
        const isCanceled = (vs: string) => vs === "CANCELLED" || vs === "CANCELED";
        const isCompleted = (vs: string) => isVisaStamp(vs) || isTrib || vs === "ARRIVED";

        // -----------------------------------------------------------------
        // Dimension 1: Overall System Status Breakdown
        // -----------------------------------------------------------------
        const totalRecords = rawRecords.length;
        let activeRecords = 0;
        let completedVisas = 0;
        let canceledRecords = 0;
        let totalAmount = 0;
        let totalPaidAmount = 0;
        let totalUnpaidAmount = 0;

        let gVisaStamp = 0;
        let gTrib = 0;
        let gPaid = 0;
        let gUnpaid = 0;

        const currencyMap = new Map<
          string,
          { count: number; totalAmount: number; paidAmount: number; unpaidAmount: number }
        >();

        for (const r of rawRecords) {
          const amt = Number(r.amount) || 0;
          const cur = r.currency || "SAR";
          totalAmount += amt;

          if (isCanceled(r.visa_status)) {
            canceledRecords++;
          } else {
            activeRecords++;
          }

          if (isCompleted(r.visa_status)) {
            completedVisas++;
          }

          if (isVisaStamp(r.visa_status)) gVisaStamp++;
          if (isTrib(r.visa_status)) gTrib++;

          if (isPaid(r.payment_state)) {
            totalPaidAmount += amt;
            gPaid++;
          } else if (isUnpaid(r.payment_state)) {
            totalUnpaidAmount += amt;
            gUnpaid++;
          }

          // Currency map
          const cStat = currencyMap.get(cur) || {
            count: 0,
            totalAmount: 0,
            paidAmount: 0,
            unpaidAmount: 0,
          };
          cStat.count++;
          cStat.totalAmount += amt;
          if (isPaid(r.payment_state)) {
            cStat.paidAmount += amt;
          } else {
            cStat.unpaidAmount += amt;
          }
          currencyMap.set(cur, cStat);
        }

        const overview: ExecutiveGlobalMetrics = {
          totalRecords,
          activeRecords,
          completedVisas,
          canceledRecords,
          totalAmount,
          totalPaidAmount,
          totalUnpaidAmount,
          currencies: Array.from(currencyMap.entries()).map(([currency, stat]) => ({
            currency,
            ...stat,
          })),
          statusBreakdown: {
            visaStamped: { count: gVisaStamp, percentage: calcPct(gVisaStamp, totalRecords) },
            trib: { count: gTrib, percentage: calcPct(gTrib, totalRecords) },
            wekalaPaid: { count: gPaid, percentage: calcPct(gPaid, totalRecords) },
            wekalaNotPaid: { count: gUnpaid, percentage: calcPct(gUnpaid, totalRecords) },
            canceled: {
              count: canceledRecords,
              percentage: calcPct(canceledRecords, totalRecords),
            },
          },
        };

        // -----------------------------------------------------------------
        // Dimension 2: Admin Status & Performance Metrics
        // -----------------------------------------------------------------
        const admins: ExecutiveAdminMetric[] = rawUsers
          .filter((u) => u.role === "ADMIN")
          .map((u) => {
            const userCountryIds = rawAdminCountries
              .filter((ac) => ac.user_id === u.id)
              .map((ac) => ac.country_id);

            const assignedCountries = rawCountries.filter((c) => userCountryIds.includes(c.id));
            const assignedAgencies = rawAgencies.filter((a) =>
              userCountryIds.includes(a.country_id),
            );

            let totalCandidateVolume = 0;
            let activePendingWorkload = 0;
            let adminCompletedVisas = 0;
            let adminCanceledCount = 0;
            let totalFinancialVolume = 0;
            let paidFinancialVolume = 0;

            for (const cId of userCountryIds) {
              const countryRecs = recordsByCountry.get(cId) || [];
              totalCandidateVolume += countryRecs.length;

              for (const r of countryRecs) {
                const amt = Number(r.amount) || 0;
                totalFinancialVolume += amt;
                if (isPaid(r.payment_state)) paidFinancialVolume += amt;

                if (isCompleted(r.visa_status)) {
                  adminCompletedVisas++;
                }
                if (isCanceled(r.visa_status)) {
                  adminCanceledCount++;
                }

                // Active pending workload: non-canceled, payment not fully completed or visa in-flight
                if (!isCanceled(r.visa_status)) {
                  if (
                    !isPaid(r.payment_state) ||
                    !isCompleted(r.visa_status) ||
                    r.medical === "PENDING"
                  ) {
                    activePendingWorkload++;
                  }
                }
              }
            }

            return {
              id: u.id,
              email: u.email,
              fullName: u.full_name || u.email.split("@")[0],
              role: u.role,
              createdAt: u.created_at,
              assignedCountries: assignedCountries.map((c) => ({
                id: c.id,
                name: c.name,
                countryCode: c.country_code,
              })),
              assignedAgencies: assignedAgencies.map((a) => ({
                id: a.id,
                name: a.name,
                countryId: a.country_id,
                countryName: a.country_name,
              })),
              totalCandidateVolume,
              activePendingWorkload,
              completedVisas: adminCompletedVisas,
              canceledCount: adminCanceledCount,
              totalFinancialVolume,
              paidFinancialVolume,
            };
          });

        // -----------------------------------------------------------------
        // Dimension 3: Country-Level Status Overview
        // -----------------------------------------------------------------
        const countries: ExecutiveCountryMetric[] = rawCountries.map((c) => {
          const countryRecs = recordsByCountry.get(c.id) || [];
          const countryAgencies = rawAgencies.filter((a) => a.country_id === c.id);

          const assignedAdminIds = rawAdminCountries
            .filter((ac) => ac.country_id === c.id)
            .map((ac) => ac.user_id);
          const assignedAdmins = rawUsers
            .filter((u) => assignedAdminIds.includes(u.id))
            .map((u) => ({
              id: u.id,
              fullName: u.full_name || u.email.split("@")[0],
              email: u.email,
            }));

          const totalApplications = countryRecs.length;
          let activeApplications = 0;
          let cVisaStamp = 0;
          let cTrib = 0;
          let cPaid = 0;
          let cUnpaid = 0;
          let cCanceled = 0;
          let countryTotalAmt = 0;
          let countryPaidAmt = 0;
          let countryUnpaidAmt = 0;

          for (const r of countryRecs) {
            const amt = Number(r.amount) || 0;
            countryTotalAmt += amt;

            if (isCanceled(r.visa_status)) {
              cCanceled++;
            } else {
              activeApplications++;
            }

            if (isVisaStamp(r.visa_status)) cVisaStamp++;
            if (isTrib(r.visa_status)) cTrib++;

            if (isPaid(r.payment_state)) {
              countryPaidAmt += amt;
              cPaid++;
            } else if (isUnpaid(r.payment_state)) {
              countryUnpaidAmt += amt;
              cUnpaid++;
            }
          }

          return {
            id: c.id,
            name: c.name,
            countryCode: c.country_code,
            agencyCount: countryAgencies.length,
            assignedAdmins,
            totalApplications,
            activeApplications,
            totalAmount: countryTotalAmt,
            paidAmount: countryPaidAmt,
            unpaidAmount: countryUnpaidAmt,
            statusBreakdown: {
              visaStamped: {
                count: cVisaStamp,
                percentage: calcPct(cVisaStamp, totalApplications),
              },
              trib: { count: cTrib, percentage: calcPct(cTrib, totalApplications) },
              wekalaPaid: { count: cPaid, percentage: calcPct(cPaid, totalApplications) },
              wekalaNotPaid: { count: cUnpaid, percentage: calcPct(cUnpaid, totalApplications) },
              canceled: { count: cCanceled, percentage: calcPct(cCanceled, totalApplications) },
            },
          };
        });

        // -----------------------------------------------------------------
        // Dimension 4: Agency-Level Visa Processing Status (Drill-Down View)
        // -----------------------------------------------------------------
        const agenciesByCountry = rawCountries.map((c) => {
          const countryAgencies = rawAgencies.filter((a) => a.country_id === c.id);

          const agencies: ExecutiveAgencyMetric[] = countryAgencies.map((a) => {
            const agencyRecs = recordsByAgency.get(a.id) || [];
            const totalCandidates = agencyRecs.length;

            let aVisaStamp = 0;
            let aTrib = 0;
            let aPaid = 0;
            let aUnpaid = 0;
            let aCanceled = 0;
            let agencyTotalAmt = 0;
            let agencyPaidAmt = 0;
            let agencyUnpaidAmt = 0;

            for (const r of agencyRecs) {
              const amt = Number(r.amount) || 0;
              agencyTotalAmt += amt;

              if (isCanceled(r.visa_status)) aCanceled++;
              if (isVisaStamp(r.visa_status)) aVisaStamp++;
              if (isTrib(r.visa_status)) aTrib++;

              if (isPaid(r.payment_state)) {
                agencyPaidAmt += amt;
                aPaid++;
              } else if (isUnpaid(r.payment_state)) {
                agencyUnpaidAmt += amt;
                aUnpaid++;
              }
            }

            return {
              id: a.id,
              name: a.name,
              countryId: a.country_id,
              countryName: c.name,
              countryCode: c.country_code,
              licenseNo: a.license_no || null,
              phone: a.phone || null,
              email: a.email || null,
              totalCandidates,
              totalAmount: agencyTotalAmt,
              paidAmount: agencyPaidAmt,
              unpaidAmount: agencyUnpaidAmt,
              visaStamped: { count: aVisaStamp, percentage: calcPct(aVisaStamp, totalCandidates) },
              trib: { count: aTrib, percentage: calcPct(aTrib, totalCandidates) },
              wekalaPaid: { count: aPaid, percentage: calcPct(aPaid, totalCandidates) },
              wekalaNotPaid: { count: aUnpaid, percentage: calcPct(aUnpaid, totalCandidates) },
              canceled: { count: aCanceled, percentage: calcPct(aCanceled, totalCandidates) },
            };
          });

          return {
            country: { id: c.id, name: c.name, countryCode: c.country_code },
            agencies,
          };
        });

        return {
          data: {
            overview,
            admins,
            countries,
            agenciesByCountry,
          },
          error: null,
        };
      } catch (err) {
        console.error("Neon getExecutiveDashboard error:", err);
        return {
          data: null,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  );
