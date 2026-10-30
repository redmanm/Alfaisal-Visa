import { describe, it, expect } from "vitest";
import {
  allowedPaymentStates,
  canDelete,
  canEditRecord,
  canCreateRecord,
  canManageUsers,
  canManageCountries,
  isReadOnly,
  daysSince,
  recordSchema,
} from "@/lib/records";

const base = {
  sponsor_name: "ياسر بدر صالح العربي",
  country_id: "c-123",
  agency_id: "a-456",
  medical: "FIT",
  payment_state: "PENDING",
  visa_status: "TRIB",
  amount: "3950",
  currency: "SAR",
};

describe("RBAC and Multi-Tenant Permissions", () => {
  it("enforces role-based delete permissions", () => {
    expect(canDelete("SUPER_ADMIN")).toBe(false);
    expect(canDelete("ADMIN")).toBe(true);
    expect(canDelete("STAFF")).toBe(false);
  });

  it("enforces country scope isolation for Admin on delete", () => {
    expect(canDelete("ADMIN", { country_id: "ET" }, ["ET", "UG"])).toBe(true);
    expect(canDelete("ADMIN", { country_id: "KE" }, ["ET", "UG"])).toBe(false);
    expect(canDelete("SUPER_ADMIN", { country_id: "KE" }, ["ET"])).toBe(false);
    expect(canDelete("STAFF", { country_id: "ET" }, ["ET"])).toBe(false);
  });

  it("enforces country scope isolation for Admin on edit", () => {
    expect(canEditRecord("ADMIN", { country_id: "ET" }, ["ET"])).toBe(true);
    expect(canEditRecord("ADMIN", { country_id: "UG" }, ["ET"])).toBe(false);
    expect(canEditRecord("SUPER_ADMIN", { country_id: "UG" }, ["ET"])).toBe(false);
    expect(canEditRecord("STAFF", { country_id: "ET" }, ["ET"])).toBe(false);
  });

  it("enforces candidate data read-only restrictions for Super Admin and Staff", () => {
    expect(isReadOnly("STAFF")).toBe(true);
    expect(isReadOnly("ADMIN")).toBe(false);
    expect(isReadOnly("SUPER_ADMIN")).toBe(true);
    expect(canCreateRecord("STAFF")).toBe(false);
    expect(canCreateRecord("ADMIN")).toBe(true);
    expect(canCreateRecord("SUPER_ADMIN")).toBe(false);
  });

  it("restricts user management to Super Admin only", () => {
    expect(canManageUsers("SUPER_ADMIN")).toBe(true);
    expect(canManageUsers("ADMIN")).toBe(false);
    expect(canManageUsers("STAFF")).toBe(false);
  });

  it("restricts country and agency management to Super Admin only", () => {
    expect(canManageCountries("SUPER_ADMIN")).toBe(true);
    expect(canManageCountries("ADMIN")).toBe(false);
    expect(canManageCountries("STAFF")).toBe(false);
  });

  it("staff and super admin cannot modify payments to PAID", () => {
    expect(allowedPaymentStates("STAFF")).not.toContain("PAID");
    expect(allowedPaymentStates("SUPER_ADMIN")).not.toContain("PAID");
    expect(allowedPaymentStates("ADMIN")).toContain("PAID");
  });

  it("enforces that candidate record CRUD is strictly reserved for the assigned Admin", () => {
    // Super Admin has global read-only visibility matching Staff for candidate data
    expect(canCreateRecord("SUPER_ADMIN")).toBe(false);
    expect(canEditRecord("SUPER_ADMIN", { country_id: "ET" })).toBe(false);
    expect(canDelete("SUPER_ADMIN", { country_id: "ET" })).toBe(false);
    expect(isReadOnly("SUPER_ADMIN")).toBe(true);

    // Admin has CRUD permissions isolated to assigned countries
    expect(canCreateRecord("ADMIN")).toBe(true);
    expect(canEditRecord("ADMIN", { country_id: "ET" }, ["ET"])).toBe(true);
    expect(canEditRecord("ADMIN", { country_id: "UG" }, ["ET"])).toBe(false);
    expect(canDelete("ADMIN", { country_id: "ET" }, ["ET"])).toBe(true);
    expect(canDelete("ADMIN", { country_id: "UG" }, ["ET"])).toBe(false);

    // Super Admin retains administrative privileges (Admins, Countries, Agencies)
    expect(canManageUsers("SUPER_ADMIN")).toBe(true);
    expect(canManageCountries("SUPER_ADMIN")).toBe(true);
  });
});

describe("validation", () => {
  it("accepts a 10-digit Saudi ID starting with 1", () => {
    expect(recordSchema.safeParse({ ...base, sponsor_id: "1081931923" }).success).toBe(true);
  });
  it("rejects a malformed ID", () => {
    expect(recordSchema.safeParse({ ...base, sponsor_id: "308193192" }).success).toBe(false);
  });
  it("rejects malformed passport and accepts EQ1068907", () => {
    expect(recordSchema.safeParse({ ...base, passport_no: "123" }).success).toBe(false);
    expect(recordSchema.safeParse({ ...base, passport_no: "EQ1068907" }).success).toBe(true);
  });
  it("rejects invalid dates and negative amounts", () => {
    expect(recordSchema.safeParse({ ...base, transaction_date: "21/5/2026" }).success).toBe(false);
    expect(recordSchema.safeParse({ ...base, amount: "-5" }).success).toBe(false);
  });
  it("rejects record without country_id or agency_id", () => {
    expect(recordSchema.safeParse({ ...base, country_id: "" }).success).toBe(false);
    expect(recordSchema.safeParse({ ...base, agency_id: "" }).success).toBe(false);
  });
  it("counts days since transaction date", () => {
    expect(daysSince("2026-05-21", new Date("2026-10-25T08:00:00Z"))).toBe(157);
  });
  it("handles null dates gracefully in daysSince", () => {
    expect(daysSince(null)).toBeNull();
  });
});
