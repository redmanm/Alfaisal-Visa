import { z } from "zod";

export type AppRole = "SUPER_ADMIN" | "ADMIN" | "STAFF" | "admin" | "staff";

export interface CountryRow {
  id: string;
  name: string;
  country_code: string;
  created_at?: string;
  agency_count?: number;
  agencies?: AgencyRow[];
}

export interface AgencyRow {
  id: string;
  name: string;
  country_id: string;
  license_no?: string | null;
  phone?: string | null;
  email?: string | null;
  created_at?: string;
  country_name?: string;
  country_code?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  created_at?: string;
  assigned_country_ids: string[];
  assigned_countries?: CountryRow[];
}

export interface RecordRow {
  id: string;
  serial_no: number;
  sponsor_name: string;
  sponsor_id: string | null;
  phone: string | null;
  worker_name: string | null;
  passport_no: string | null;
  visa_no: string | null;
  musaned_no: string | null;
  city: string | null;
  medical: string;
  payment_state: string;
  visa_status: string;
  amount: number;
  currency: string;
  transaction_date: string | null;
  processing_date: string | null;
  airport: string | null;
  reserved: string | null;
  notes: string | null;
  country_id?: string | null;
  agency_id?: string | null;
  country_name?: string | null;
  country_code?: string | null;
  agency_name?: string | null;
  created_by?: string | null;
  created_by_email?: string | null;
  updated_by?: string | null;
  updated_by_email?: string | null;
  created_at: string;
  updated_at: string;
}

export const PAYMENT_STATES = ["PAID", "PENDING", "PARTIAL", "UNPAID", "REFUNDED"] as const;
export const VISA_STATUSES = [
  "WKALA",
  "EMBASSY",
  "VISA STAMP",
  "TRIB",
  "BIOMETRIC",
  "ARRIVED",
  "CANCELLED",
] as const;
export const MEDICAL_STATES = ["FIT", "UNFIT", "PENDING"] as const;
export const CURRENCIES = ["SAR", "USD", "ETB", "EUR"] as const;

export type Tone = "green" | "amber" | "red" | "blue" | "teal" | "violet" | "slate";
export const STATUS_TONE: Record<string, Tone> = {
  PAID: "green",
  PENDING: "amber",
  PARTIAL: "blue",
  UNPAID: "red",
  REFUNDED: "slate",
  FIT: "green",
  UNFIT: "red",
  WKALA: "slate",
  EMBASSY: "blue",
  "VISA STAMP": "teal",
  TRIB: "violet",
  BIOMETRIC: "amber",
  ARRIVED: "green",
  CANCELLED: "red",
};

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
  .refine((s) => !Number.isNaN(new Date(s).getTime()), "Invalid date")
  .optional()
  .or(z.literal(""));

export const recordSchema = z.object({
  sponsor_name: z.string().trim().min(2, "Sponsor name is required").max(150),
  sponsor_id: z
    .string()
    .trim()
    .regex(/^[12]\d{9}$/, "Saudi ID / Iqama must be 10 digits starting with 1 or 2")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ]{7,16}$/, "Phone must be 7–15 digits, optional +")
    .optional()
    .or(z.literal("")),
  worker_name: optionalText(150),
  passport_no: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{1,2}[0-9]{6,9}$/, "Passport like EQ1068907")
    .optional()
    .or(z.literal("")),
  visa_no: z
    .string()
    .trim()
    .regex(/^\d{6,12}$/, "Visa no. must be 6–12 digits")
    .optional()
    .or(z.literal("")),
  musaned_no: z
    .string()
    .trim()
    .regex(/^\d{5,12}$/, "Musaned no. must be digits")
    .optional()
    .or(z.literal("")),
  city: optionalText(60),
  country_id: z.string().trim().min(1, "Country selection is required"),
  agency_id: z.string().trim().min(1, "Agency selection is required"),
  medical: z.enum(MEDICAL_STATES),
  payment_state: z.enum(PAYMENT_STATES),
  visa_status: z.enum(VISA_STATUSES),
  amount: z.coerce
    .number({ message: "Amount must be a number" })
    .min(0, "Amount cannot be negative")
    .max(10_000_000),
  currency: z.enum(CURRENCIES),
  transaction_date: dateStr,
  processing_date: dateStr,
  airport: optionalText(60),
  reserved: optionalText(60),
  notes: optionalText(2000),
});
export type RecordInput = z.infer<typeof recordSchema>;

// Role Normalization and Authorization Checks
export function normalizeRole(
  role: string | null | undefined,
): "SUPER_ADMIN" | "ADMIN" | "STAFF" | null {
  if (!role) return null;
  const upper = role.toUpperCase();
  if (upper === "SUPER_ADMIN" || upper === "SUPERADMIN") return "SUPER_ADMIN";
  if (upper === "ADMIN") return "ADMIN";
  if (upper === "STAFF") return "STAFF";
  return null;
}

export function isSuperAdmin(role: AppRole | null | undefined): boolean {
  return normalizeRole(role) === "SUPER_ADMIN";
}

export function isAdmin(role: AppRole | null | undefined): boolean {
  return normalizeRole(role) === "ADMIN";
}

export function isStaff(role: AppRole | null | undefined): boolean {
  return normalizeRole(role) === "STAFF";
}

export function isReadOnly(role: AppRole | null | undefined): boolean {
  // Both Staff and Super Admin have read-only access to candidate visa processing records
  const r = normalizeRole(role);
  return r === "STAFF" || r === "SUPER_ADMIN";
}

export function canManageUsers(role: AppRole | null | undefined): boolean {
  return isSuperAdmin(role);
}

export function canManageCountries(role: AppRole | null | undefined): boolean {
  return isSuperAdmin(role);
}

export function canCreateRecord(role: AppRole | null | undefined): boolean {
  // Only the assigned Admin of that country/agency can create candidate records
  return isAdmin(role);
}

export function canEditRecord(
  role: AppRole | null | undefined,
  record?: Pick<RecordRow, "country_id"> | null,
  assignedCountryIds?: string[],
): boolean {
  // Super Admin and Staff have read-only access to candidate records.
  // Editing is strictly reserved for the assigned Admin of that country.
  if (isAdmin(role)) {
    if (!record || !record.country_id) return true;
    if (!assignedCountryIds || assignedCountryIds.length === 0) return true;
    return assignedCountryIds.includes(record.country_id);
  }
  return false;
}

export function canDelete(
  role: AppRole | null | undefined,
  record?: Pick<RecordRow, "country_id"> | null,
  assignedCountryIds?: string[],
): boolean {
  // Super Admin and Staff cannot delete candidate records.
  // Deletion is strictly reserved for the assigned Admin of that country.
  if (isAdmin(role)) {
    if (!record || !record.country_id) return true;
    if (!assignedCountryIds || assignedCountryIds.length === 0) return true;
    return assignedCountryIds.includes(record.country_id);
  }
  return false;
}

export function canEditFinancials(
  role: AppRole | null | undefined,
  _current?: Pick<RecordRow, "payment_state"> | null,
): boolean {
  return isAdmin(role);
}

export function allowedPaymentStates(role: AppRole | null | undefined) {
  if (isAdmin(role)) return [...PAYMENT_STATES];
  return PAYMENT_STATES.filter((s) => s !== "PAID");
}

export function daysSince(date: string | null, now = new Date()) {
  if (!date) return null;
  const d = new Date(date + "T00:00:00Z");
  return Math.floor(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - d.getTime()) /
      86_400_000,
  );
}

export function formatDate(d: string | null | undefined) {
  if (!d) return "";
  const str = String(d).split("T")[0] || "";
  const parts = str.split("-");
  if (parts.length === 3) {
    const [y, m, day] = parts;
    return `${day}/${m}/${y}`;
  }
  return str;
}
