import { formatDate, daysSince, type RecordRow } from "./records";

export type Language = "ar" | "en";

export function getPaymentLabel(state: string, lang: Language = "ar"): string {
  const safeLang: Language = (lang as unknown) === "en" ? "en" : "ar";
  const norm = (state || "").toUpperCase().trim();
  if (safeLang === "ar") {
    switch (norm) {
      case "PAID":
        return "مدفوع";
      case "PENDING":
        return "معلق";
      case "PARTIAL":
        return "سداد جزئي";
      case "UNPAID":
        return "غير مدفوع";
      case "REFUNDED":
        return "مسترد";
      default:
        return state || "";
    }
  }
  switch (norm) {
    case "PAID":
      return "Paid";
    case "PENDING":
      return "Pending";
    case "PARTIAL":
      return "Partial";
    case "UNPAID":
      return "Unpaid";
    case "REFUNDED":
      return "Refunded";
    default:
      return state || "";
  }
}

export function getVisaStatusLabel(status: string, lang: Language = "ar"): string {
  const safeLang: Language = (lang as unknown) === "en" ? "en" : "ar";
  const norm = (status || "").toUpperCase().trim();
  if (safeLang === "ar") {
    switch (norm) {
      case "WKALA":
        return "وكالة / تفويض";
      case "EMBASSY":
        return "بالسفارة";
      case "VISA STAMP":
      case "VISA_STAMP":
        return "تأشيرة صادرة";
      case "TRIB":
        return "تدريب مهني";
      case "BIOMETRIC":
        return "بصمة حيوية";
      case "ARRIVED":
        return "تم الوصول للمملكة";
      case "CANCELLED":
      case "CANCELED":
        return "ملغية";
      default:
        return status || "";
    }
  }
  switch (norm) {
    case "WKALA":
      return "Wekala Issued";
    case "EMBASSY":
      return "In Embassy";
    case "VISA STAMP":
    case "VISA_STAMP":
      return "Visa Stamped";
    case "TRIB":
      return "TRIB Completed";
    case "BIOMETRIC":
      return "Biometrics";
    case "ARRIVED":
      return "Arrived in Saudi Arabia";
    case "CANCELLED":
    case "CANCELED":
      return "Canceled";
    default:
      return status || "";
  }
}

export function getMedicalLabel(med: string, lang: Language = "ar"): string {
  const safeLang: Language = (lang as unknown) === "en" ? "en" : "ar";
  const norm = (med || "").toUpperCase().trim();
  if (safeLang === "ar") {
    switch (norm) {
      case "FIT":
        return "لائق طبياً";
      case "UNFIT":
        return "غير لائق";
      case "PENDING":
        return "بانتظار الفحص";
      default:
        return med || "";
    }
  }
  switch (norm) {
    case "FIT":
      return "Fit";
    case "UNFIT":
      return "Unfit";
    case "PENDING":
      return "Pending Medical";
    default:
      return med || "";
  }
}

function getColumns(lang: Language = "ar"): [string, (r: RecordRow) => string | number][] {
  const safeLang: Language = (lang as unknown) === "en" ? "en" : "ar";
  if (safeLang === "ar") {
    return [
      ["الرقم", (r) => r.serial_no],
      ["اسم الكفيل", (r) => r.sponsor_name],
      ["رقم الهوية / الإقامة", (r) => r.sponsor_id ?? ""],
      ["رقم الجوال", (r) => r.phone ?? ""],
      ["اسم العامل", (r) => r.worker_name ?? ""],
      ["رقم الجواز", (r) => r.passport_no ?? ""],
      ["رقم التأشيرة", (r) => r.visa_no ?? ""],
      ["عقد مساند", (r) => r.musaned_no ?? ""],
      ["المدينة", (r) => r.city ?? ""],
      ["الفحص الطبي", (r) => getMedicalLabel(r.medical, "ar")],
      ["حالة السداد", (r) => getPaymentLabel(r.payment_state, "ar")],
      ["مرحلة التأشيرة", (r) => getVisaStatusLabel(r.visa_status, "ar")],
      ["المبلغ", (r) => Number(r.amount)],
      ["العملة", (r) => (r.currency === "SAR" ? "ر.س" : r.currency)],
      ["تاريخ المعاملة", (r) => formatDate(r.transaction_date)],
      ["تاريخ الإجراء", (r) => formatDate(r.processing_date)],
      ["الأيام", (r) => daysSince(r.transaction_date) ?? ""],
      ["المطار", (r) => r.airport ?? ""],
      ["حالة الحجز", (r) => r.reserved ?? ""],
      ["الملاحظات", (r) => r.notes ?? ""],
    ];
  }

  return [
    ["Serial No", (r) => r.serial_no],
    ["Sponsor Name", (r) => r.sponsor_name],
    ["Sponsor ID", (r) => r.sponsor_id ?? ""],
    ["Phone", (r) => r.phone ?? ""],
    ["Worker Name", (r) => r.worker_name ?? ""],
    ["Passport No", (r) => r.passport_no ?? ""],
    ["Visa No", (r) => r.visa_no ?? ""],
    ["Musaned Contract", (r) => r.musaned_no ?? ""],
    ["City", (r) => r.city ?? ""],
    ["Medical Status", (r) => getMedicalLabel(r.medical, "en")],
    ["Payment Status", (r) => getPaymentLabel(r.payment_state, "en")],
    ["Visa Status", (r) => getVisaStatusLabel(r.visa_status, "en")],
    ["Amount", (r) => Number(r.amount)],
    ["Currency", (r) => r.currency],
    ["Date", (r) => formatDate(r.transaction_date)],
    ["Processing Date", (r) => formatDate(r.processing_date)],
    ["Days Active", (r) => daysSince(r.transaction_date) ?? ""],
    ["Airport", (r) => r.airport ?? ""],
    ["Booking Status", (r) => r.reserved ?? ""],
    ["Notes", (r) => r.notes ?? ""],
  ];
}

const stamp = () => new Date().toISOString().slice(0, 10);

function download(blob: Blob, name: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function generateCsvContent(rows: RecordRow[], lang: Language = "ar"): string {
  const safeLang: Language = (lang as unknown) === "en" ? "en" : "ar";
  const cols = getColumns(safeLang);
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [
    cols.map((c) => esc(c[0])).join(","),
    ...rows.map((r) => cols.map((c) => esc(c[1](r))).join(",")),
  ];
  // BOM so Excel renders UTF-8 correctly
  return "\uFEFF" + lines.join("\r\n");
}

export function exportCsv(rows: RecordRow[], lang: Language = "ar") {
  const safeLang: Language = (lang as unknown) === "en" ? "en" : "ar";
  const content = generateCsvContent(rows, safeLang);
  download(new Blob([content], { type: "text/csv;charset=utf-8" }), `records-${stamp()}.csv`);
}

export async function exportXlsx(rows: RecordRow[], lang: Language = "ar") {
  const safeLang: Language = (lang as unknown) === "en" ? "en" : "ar";
  const XLSX = await import("xlsx");
  const cols = getColumns(safeLang);
  const data = rows.map((r) => Object.fromEntries(cols.map(([h, f]) => [h, f(r)])));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, safeLang === "ar" ? "المعاملات" : "Records");
  XLSX.writeFile(wb, `records-${stamp()}.xlsx`);
}

/** Opens a print-ready report (browser "Save as PDF") — preserves language font shaping. */
export function exportPdf(rows: RecordRow[], title: string, lang: Language = "ar") {
  const safeLang: Language = (lang as unknown) === "en" ? "en" : "ar";
  const w = window.open("", "_blank");
  if (!w) return false;
  const isAr = safeLang === "ar";
  const cols = getColumns(safeLang);
  const excludeHeaders = isAr
    ? ["الملاحظات", "تاريخ الإجراء", "رقم الجوال", "حالة الحجز", "المطار"]
    : ["Notes", "Processing Date", "Phone", "Booking Status", "Airport"];
  const pdfCols = cols.filter(([h]) => !excludeHeaders.includes(h));
  const esc = (s: string | number) =>
    String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const companyTitle = isAr ? "شركة فن الفيصل للإستقدام" : "Fan AlFaisal Recruitment Company";
  const currencyLabel = isAr ? "ر.س" : "SAR";
  const summaryLine = isAr
    ? `${esc(title)} · ${rows.length} معاملة · الإجمالي ${total.toLocaleString()} ${currencyLabel} · تاريخ الإنشاء ${new Date().toLocaleDateString("ar-SA")}`
    : `${esc(title)} · ${rows.length} records · Total ${total.toLocaleString()} ${currencyLabel} · Generated ${new Date().toLocaleDateString("en-US")}`;

  w.document
    .write(`<!doctype html><html dir="${isAr ? "rtl" : "ltr"}" lang="${safeLang}"><head><meta charset="utf-8"><title>${esc(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&family=IBM+Plex+Sans+Arabic:wght@400;600&display=swap" rel="stylesheet">
  <style>@page{size:A4 landscape;margin:10mm}body{font-family:${isAr ? "'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Sans', sans-serif"};font-size:9px;color:#222;direction:${isAr ? "rtl" : "ltr"};}
  h1{font-size:14px;margin:0 0 2px}p{margin:0 0 8px;color:#666}table{border-collapse:collapse;width:100%}
  th,td{border:1px solid #ccc;padding:3px 4px;text-align:${isAr ? "right" : "left"}}th{background:#eef2f2}tr:nth-child(even) td{background:#fafafa}</style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #0f766e;padding-bottom:10px;margin-bottom:12px;">
    <div>
      <h1 style="font-size:15px;margin:0;color:#0f766e;">${companyTitle}</h1>
      <p style="margin:2px 0 0;color:#666;font-size:10px;">${summaryLine}</p>
    </div>
    <img src="${window.location.origin}/logo.png" style="height:44px;object-fit:contain;" alt="Logo" />
  </div>
  <table><thead><tr>${pdfCols.map(([h]) => `<th>${h}</th>`).join("")}</tr></thead><tbody>
  ${rows.map((r) => `<tr>${pdfCols.map(([, f]) => `<td>${esc(f(r))}</td>`).join("")}</tr>`).join("")}
  </tbody></table><script>document.fonts.ready.then(()=>setTimeout(()=>print(),300))</script></body></html>`);
  w.document.close();
  return true;
}

/** Opens a print-ready single case voucher / slip for handoff or filing. */
export function printCaseSlip(r: RecordRow, lang: Language = "ar") {
  const safeLang: Language = (lang as unknown) === "en" ? "en" : "ar";
  const w = window.open("", "_blank");
  if (!w) return false;
  const isAr = safeLang === "ar";
  const esc = (s: unknown) =>
    s == null
      ? ""
      : String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

  const companyName = isAr ? "شركة فن الفيصل للإستقدام" : "Fan AlFaisal Recruitment Company";
  const slipSubtitle = isAr
    ? "سند متابعة إجراءات تأشيرة ومعاملة مرشح"
    : "Candidate Visa & Processing Case Slip";
  const caseNumberLabel = isAr ? `معاملة رقم #${r.serial_no}` : `Case #${r.serial_no}`;
  const issuedDate = isAr
    ? `تاريخ الإصدار: ${new Date().toLocaleDateString("ar-SA")}`
    : `Issued: ${new Date().toLocaleDateString("en-US")}`;
  const paymentBadge = isAr
    ? `حالة السداد: <strong>${esc(getPaymentLabel(r.payment_state, "ar"))}</strong>`
    : `Payment: <strong>${esc(getPaymentLabel(r.payment_state, "en"))}</strong>`;
  const visaBadge = isAr
    ? `حالة التأشيرة: <strong>${esc(getVisaStatusLabel(r.visa_status, "ar"))}</strong>`
    : `Visa Stage: <strong>${esc(getVisaStatusLabel(r.visa_status, "en"))}</strong>`;
  const medicalBadge = isAr
    ? `الفحص الطبي: <strong>${esc(getMedicalLabel(r.medical, "ar"))}</strong>`
    : `Medical: <strong>${esc(getMedicalLabel(r.medical, "en"))}</strong>`;
  const amountBadge = isAr
    ? `المبلغ: <strong>${Number(r.amount).toLocaleString()} ر.س</strong>`
    : `Amount: <strong>${Number(r.amount).toLocaleString()} ${esc(r.currency || "SAR")}</strong>`;

  const sec1Title = isAr ? "١. بيانات الكفيل" : "1. Sponsor Information";
  const sec1Labels = isAr
    ? {
        name: "اسم الكفيل",
        id: "الهوية الوطنية / الإقامة",
        phone: "رقم الجوال والتواصل",
        city: "المدينة",
      }
    : {
        name: "Sponsor Name",
        id: "Saudi ID / Iqama",
        phone: "Phone / Contact",
        city: "City",
      };

  const sec2Title = isAr ? "٢. بيانات العامل والتأشيرة" : "2. Worker & Visa Details";
  const sec2Labels = isAr
    ? {
        worker: "اسم العامل المرشح",
        passport: "رقم جواز السفر",
        visa: "رقم التأشيرة",
        musaned: "رقم عقد مساند",
      }
    : {
        worker: "Worker Name",
        passport: "Passport Number",
        visa: "Visa Number",
        musaned: "Musaned Contract #",
      };

  const sec3Title = isAr ? "٣. السفر والإجراءات" : "3. Travel & Processing";
  const sec3Labels = isAr
    ? {
        airport: "مطار الوصول",
        flight: "حالة الحجز والطيران",
        txDate: "تاريخ تسجيل المعاملة",
        procDate: "تاريخ آخر إجراء",
      }
    : {
        airport: "Arrival Airport",
        flight: "Flight / Booking",
        txDate: "Transaction Date",
        procDate: "Processing Date",
      };

  const sec4Title = isAr ? "٤. الملاحظات والتعليمات التشغيلية" : "4. Operational Notes & Remarks";
  const sig1 = isAr ? "توقيع مسؤول العمليات والاعتماد" : "Operations Officer Signature";
  const sig2 = isAr ? "إقرار وتوقيع العميل / المستلم" : "Client / Receiver Acknowledgment";

  w.document
    .write(`<!doctype html><html dir="${isAr ? "rtl" : "ltr"}" lang="${lang}"><head><meta charset="utf-8">
  <title>${isAr ? `سند معاملة #${r.serial_no}` : `Case Slip #${r.serial_no}`} — ${esc(r.sponsor_name)}</title>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 portrait; margin: 15mm }
    body { font-family: ${isAr ? "'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Sans', sans-serif"}; font-size: 11px; color: #1e293b; line-height: 1.5; margin: 0; padding: 20px; direction: ${isAr ? "rtl" : "ltr"}; }
    .header { border-bottom: 2px solid #0f766e; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 18px; font-weight: 700; color: #0f766e; margin: 0; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-weight: 600; font-size: 10px; border: 1px solid #cbd5e1; background: #f8fafc; }
    .section { margin-bottom: 14px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
    .sec-title { background: #f1f5f9; padding: 6px 10px; font-weight: 600; font-size: 11px; color: #334155; border-bottom: 1px solid #e2e8f0; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 10px; }
    .row { display: flex; flex-direction: column; }
    .label { font-size: 9px; color: #64748b; font-weight: 500; }
    .value { font-size: 12px; font-weight: 600; color: #0f172a; margin-top: 2px; }
    .notes-box { padding: 10px; background: #fafafa; border-radius: 4px; border: 1px solid #e2e8f0; min-height: 50px; font-size: 11px; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; padding-top: 20px; }
    .sig-line { border-top: 1px dashed #94a3b8; padding-top: 6px; text-align: center; color: #64748b; font-size: 10px; }
    @media print { body { padding: 0; } }
  </style>
  </head><body>
    <div class="header">
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="${window.location.origin}/logo.png" style="height:54px;object-fit:contain;" alt="Logo" />
        <div>
          <h1 class="title">${companyName}</h1>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${slipSubtitle}</div>
        </div>
      </div>
      <div style="text-align: ${isAr ? "left" : "right"};">
        <div style="font-size: 18px; font-weight: 700; color: #0f766e;">${caseNumberLabel}</div>
        <div style="font-size: 10px; color: #64748b;">${issuedDate}</div>
      </div>
    </div>

    <div style="display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap;">
      <span class="badge">${paymentBadge}</span>
      <span class="badge">${visaBadge}</span>
      <span class="badge">${medicalBadge}</span>
      <span class="badge">${amountBadge}</span>
    </div>

    <div class="section">
      <div class="sec-title">${sec1Title}</div>
      <div class="grid">
        <div class="row"><span class="label">${sec1Labels.name}</span><span class="value" dir="auto">${esc(r.sponsor_name)}</span></div>
        <div class="row"><span class="label">${sec1Labels.id}</span><span class="value">${esc(r.sponsor_id) || "—"}</span></div>
        <div class="row"><span class="label">${sec1Labels.phone}</span><span class="value">${esc(r.phone) || "—"}</span></div>
        <div class="row"><span class="label">${sec1Labels.city}</span><span class="value" dir="auto">${esc(r.city) || "—"}</span></div>
      </div>
    </div>

    <div class="section">
      <div class="sec-title">${sec2Title}</div>
      <div class="grid">
        <div class="row"><span class="label">${sec2Labels.worker}</span><span class="value" dir="auto">${esc(r.worker_name) || "—"}</span></div>
        <div class="row"><span class="label">${sec2Labels.passport}</span><span class="value">${esc(r.passport_no) || "—"}</span></div>
        <div class="row"><span class="label">${sec2Labels.visa}</span><span class="value">${esc(r.visa_no) || "—"}</span></div>
        <div class="row"><span class="label">${sec2Labels.musaned}</span><span class="value">${esc(r.musaned_no) || "—"}</span></div>
      </div>
    </div>

    <div class="section">
      <div class="sec-title">${sec3Title}</div>
      <div class="grid">
        <div class="row"><span class="label">${sec3Labels.airport}</span><span class="value">${esc(r.airport) || "—"}</span></div>
        <div class="row"><span class="label">${sec3Labels.flight}</span><span class="value">${esc(r.reserved) || "—"}</span></div>
        <div class="row"><span class="label">${sec3Labels.txDate}</span><span class="value">${formatDate(r.transaction_date) || "—"}</span></div>
        <div class="row"><span class="label">${sec3Labels.procDate}</span><span class="value">${formatDate(r.processing_date) || "—"}</span></div>
      </div>
    </div>

    ${
      r.notes
        ? `
    <div class="section">
      <div class="sec-title">${sec4Title}</div>
      <div style="padding: 10px;">
        <div class="notes-box" dir="auto">${esc(r.notes)}</div>
      </div>
    </div>`
        : ""
    }

    <div class="signatures">
      <div><div class="sig-line">${sig1}</div></div>
      <div><div class="sig-line">${sig2}</div></div>
    </div>

    <script>document.fonts.ready.then(()=>setTimeout(()=>print(),300))</script>
  </body></html>`);
  w.document.close();
  return true;
}
