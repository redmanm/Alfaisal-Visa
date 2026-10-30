import {
  pgTable,
  unique,
  check,
  uuid,
  text,
  timestamp,
  foreignKey,
  bigint,
  integer,
  jsonb,
  numeric,
  date,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    email: text().notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name"),
    role: text().default("staff").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("users_email_key").on(table.email),
    check("users_role_check", sql`role = ANY (ARRAY['admin'::text, 'staff'::text])`),
  ],
);

export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    role: text().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "user_roles_user_id_fkey",
    }).onDelete("cascade"),
    unique("user_roles_user_id_role_key").on(table.userId, table.role),
    check("user_roles_role_check", sql`role = ANY (ARRAY['admin'::text, 'staff'::text])`),
  ],
);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid().primaryKey().notNull(),
    email: text(),
    fullName: text("full_name"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.id],
      foreignColumns: [users.id],
      name: "profiles_id_fkey",
    }).onDelete("cascade"),
  ],
);

export const auditLog = pgTable("audit_log", {
  // You can use { mode: "bigint" } if numbers are exceeding js number limitations
  id: bigint({ mode: "number" }).primaryKey().generatedAlwaysAsIdentity({
    name: "audit_log_id_seq",
    startWith: 1,
    increment: 1,
    minValue: 1,
    maxValue: 9223372036854775807,
    cache: 1,
  }),
  recordId: uuid("record_id"),
  serialNo: integer("serial_no"),
  action: text().notNull(),
  actorId: uuid("actor_id"),
  actorEmail: text("actor_email"),
  changes: jsonb(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
});

export const records = pgTable(
  "records",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    serialNo: integer("serial_no").generatedByDefaultAsIdentity({
      name: "records_serial_no_seq",
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    sponsorName: text("sponsor_name").notNull(),
    sponsorId: text("sponsor_id"),
    phone: text(),
    workerName: text("worker_name"),
    passportNo: text("passport_no"),
    visaNo: text("visa_no"),
    musanedNo: text("musaned_no"),
    city: text(),
    medical: text().default("PENDING").notNull(),
    paymentState: text("payment_state").default("PENDING").notNull(),
    visaStatus: text("visa_status").default("WKALA").notNull(),
    amount: numeric({ precision: 12, scale: 2 }).default("0").notNull(),
    currency: text().default("SAR").notNull(),
    transactionDate: date("transaction_date"),
    processingDate: date("processing_date"),
    airport: text(),
    reserved: text(),
    notes: text(),
    createdBy: uuid("created_by"),
    createdByEmail: text("created_by_email"),
    updatedBy: uuid("updated_by"),
    updatedByEmail: text("updated_by_email"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("records_serial_no_key").on(table.serialNo),
    check(
      "records_medical_check",
      sql`medical = ANY (ARRAY['FIT'::text, 'UNFIT'::text, 'PENDING'::text])`,
    ),
    check(
      "records_payment_state_check",
      sql`payment_state = ANY (ARRAY['PAID'::text, 'PENDING'::text, 'PARTIAL'::text, 'UNPAID'::text, 'REFUNDED'::text])`,
    ),
    check(
      "records_visa_status_check",
      sql`visa_status = ANY (ARRAY['WKALA'::text, 'EMBASSY'::text, 'VISA STAMP'::text, 'TRIB'::text, 'BIOMETRIC'::text, 'ARRIVED'::text, 'CANCELLED'::text])`,
    ),
    check("records_amount_check", sql`amount >= (0)::numeric`),
    check(
      "records_currency_check",
      sql`currency = ANY (ARRAY['SAR'::text, 'USD'::text, 'ETB'::text, 'EUR'::text])`,
    ),
  ],
);
