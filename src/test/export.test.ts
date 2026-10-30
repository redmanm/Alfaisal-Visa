import { describe, it, expect } from "vitest";
import { generateCsvContent, getPaymentLabel, getVisaStatusLabel } from "@/lib/export";
import type { RecordRow } from "@/lib/records";
import * as XLSX from "xlsx";

const sampleRecords: RecordRow[] = [
  {
    id: "rec-1",
    serial_no: 101,
    sponsor_name: "عبدالله محمد السعيد",
    sponsor_id: "1098765432",
    phone: "+966501234567",
    worker_name: "Fatima Zahra",
    passport_no: "EP1234567",
    visa_no: "1234567890",
    musaned_no: "98765432",
    city: "الرياض",
    medical: "FIT",
    payment_state: "PAID",
    visa_status: "VISA STAMP",
    amount: 7500,
    currency: "SAR",
    transaction_date: "2026-10-15",
    processing_date: "2026-10-20",
    airport: "RUH",
    reserved: "CONFIRMED",
    notes: "ملاحظات باللغة العربية",
    country_id: "ET",
    agency_id: "AG-1",
    created_at: "2026-10-15T00:00:00Z",
    updated_at: "2026-10-20T00:00:00Z",
  },
  {
    id: "rec-2",
    serial_no: 102,
    sponsor_name: "خالد بن عبدالعزيز الشمري",
    sponsor_id: "1087654321",
    phone: "+966551234567",
    worker_name: "Sara Ahmed",
    passport_no: "EP7654321",
    visa_no: "0987654321",
    musaned_no: "87654321",
    city: "جدة",
    medical: "PENDING",
    payment_state: "PENDING",
    visa_status: "TRIB",
    amount: 5200,
    currency: "SAR",
    transaction_date: "2026-10-18",
    processing_date: null,
    airport: "JED",
    reserved: null,
    notes: "معاملة قيد التدريب",
    country_id: "UG",
    agency_id: "AG-2",
    created_at: "2026-10-18T00:00:00Z",
    updated_at: "2026-10-18T00:00:00Z",
  },
];

describe("Data Export Engine Verification", () => {
  it("generates CSV with UTF-8 BOM encoding for Excel compatibility", () => {
    const csvContent = generateCsvContent(sampleRecords, "ar");

    // Must start with UTF-8 BOM (\uFEFF)
    expect(csvContent.startsWith("\uFEFF")).toBe(true);

    // Contains Arabic headers
    expect(csvContent).toContain('"اسم الكفيل"');
    expect(csvContent).toContain('"رقم الهوية / الإقامة"');
    expect(csvContent).toContain('"عقد مساند"');

    // Preserves Arabic sponsor names and cities without corruption
    expect(csvContent).toContain('"عبدالله محمد السعيد"');
    expect(csvContent).toContain('"الرياض"');
    expect(csvContent).toContain('"خالد بن عبدالعزيز الشمري"');
    expect(csvContent).toContain('"جدة"');

    // Preserves status translations
    expect(csvContent).toContain('"مدفوع"');
    expect(csvContent).toContain('"تأشيرة صادرة"');
  });

  it("generates English CSV when English language is selected", () => {
    const csvContent = generateCsvContent(sampleRecords, "en");

    expect(csvContent.startsWith("\uFEFF")).toBe(true);
    expect(csvContent).toContain('"Sponsor Name"');
    expect(csvContent).toContain('"Passport No"');
    expect(csvContent).toContain('"Paid"');
    expect(csvContent).toContain('"Visa Stamped"');

    // Keeps Arabic sponsor names untranslated as expected
    expect(csvContent).toContain('"عبدالله محمد السعيد"');
  });

  it("verifies XLSX workbook generation with Arabic sheet and contents", () => {
    const data = sampleRecords.map((r) => ({
      الرقم: r.serial_no,
      "اسم الكفيل": r.sponsor_name,
      المدينة: r.city,
      "حالة السداد": getPaymentLabel(r.payment_state, "ar"),
      "مرحلة التأشيرة": getVisaStatusLabel(r.visa_status, "ar"),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المعاملات");

    // Workbook should contain sheet named "المعاملات"
    expect(wb.SheetNames).toContain("المعاملات");

    // Ensure cell contents are properly UTF-8 string values
    const sheet = wb.Sheets["المعاملات"];
    expect(sheet["B2"].v).toBe("عبدالله محمد السعيد");
    expect(sheet["C2"].v).toBe("الرياض");
    expect(sheet["D2"].v).toBe("مدفوع");
    expect(sheet["E2"].v).toBe("تأشيرة صادرة");
  });

  it("safely handles undefined lang parameter with default fallback", () => {
    // When lang is omitted / undefined, it must not throw and default to Arabic
    const csvContent = generateCsvContent(sampleRecords, undefined as unknown as "ar");
    expect(csvContent.startsWith("\uFEFF")).toBe(true);
    expect(csvContent).toContain('"اسم الكفيل"');
    expect(getPaymentLabel("PAID", undefined as unknown as "ar")).toBe("مدفوع");
    expect(getVisaStatusLabel("VISA STAMP", undefined as unknown as "ar")).toBe("تأشيرة صادرة");
  });
});
