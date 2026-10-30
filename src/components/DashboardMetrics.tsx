import { CheckCircle2, Clock, Plane, Layers, Banknote, XCircle } from "lucide-react";
import type { RecordRow } from "@/lib/records";
import { useI18n } from "@/lib/i18n";

interface MetricsProps {
  records: RecordRow[];
  activePayFilter: string;
  activeVisaFilter: string;
  onFilterPay: (pay: string) => void;
  onFilterVisa: (visa: string) => void;
}

export function DashboardMetrics({
  records,
  activePayFilter,
  activeVisaFilter,
  onFilterPay,
  onFilterVisa,
}: MetricsProps) {
  const { t } = useI18n();

  const totalCount = records.length;
  const totalAmount = records.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  // 1. Visa Stamped
  const visaStampedRecords = records.filter(
    (r) => r.visa_status === "VISA STAMP" || r.visa_status === "VISA STAMPED",
  );

  // 2. TRIB (Completed)
  const tribRecords = records.filter(
    (r) => r.visa_status === "TRIB" || r.visa_status === "ARRIVED",
  );

  // 3. Wekala Paid
  const paidRecords = records.filter((r) => r.payment_state === "PAID");
  const paidCount = paidRecords.length;
  const paidAmount = paidRecords.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  // 4. Wekala Not Paid
  const pendingRecords = records.filter(
    (r) =>
      r.payment_state === "PENDING" ||
      r.payment_state === "PARTIAL" ||
      r.payment_state === "UNPAID",
  );
  const pendingCount = pendingRecords.length;
  const pendingAmount = pendingRecords.reduce((s, r) => s + (Number(r.amount) || 0), 0);

  // 5. Canceled
  const canceledRecords = records.filter(
    (r) => r.visa_status === "CANCELLED" || r.visa_status === "CANCELED",
  );

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
      {/* 0. Total Cases (Neutral/Primary) */}
      <div
        onClick={() => {
          onFilterPay("");
          onFilterVisa("");
        }}
        className={`group cursor-pointer rounded-lg border bg-card p-3 transition-all hover:border-primary/50 hover:shadow-panel ${
          !activePayFilter && !activeVisaFilter ? "ring-2 ring-primary/20 border-primary" : ""
        }`}
      >
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium">{t("kpi_total")}</span>
          <Layers className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight">{totalCount}</div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{t("kpi_contract_val")}</span>
          <span className="font-mono font-medium text-foreground">
            {totalAmount.toLocaleString()} {t("currency_sar")}
          </span>
        </div>
      </div>

      {/* 1. Visa Stamped - Yellow (#FEF3C7, #92400E, #FCD34D) */}
      <div
        onClick={() => onFilterVisa(activeVisaFilter === "VISA STAMP" ? "" : "VISA STAMP")}
        className={`group cursor-pointer rounded-lg border p-3 transition-all hover:shadow-panel ${
          activeVisaFilter === "VISA STAMP"
            ? "border-[#FCD34D] bg-[#FEF3C7]/40 ring-2 ring-[#FCD34D]/50 dark:bg-[#78350F]/30 dark:border-[#F59E0B]"
            : "border-border bg-card hover:border-[#FCD34D]/60"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#92400E] dark:text-[#FDE68A]">
            {t("kpi_visa_stamped")}
          </span>
          <Banknote className="size-4 text-[#92400E] dark:text-[#FDE68A]" />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight text-[#92400E] dark:text-[#FDE68A]">
          {visaStampedRecords.length}
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{t("col_visa_status")}</span>
          <span className="font-mono font-medium text-foreground">
            {records.filter((r) => r.medical === "FIT").length} {t("med_FIT")}
          </span>
        </div>
      </div>

      {/* 2. TRIB (Completed) - Green (#DCFCE7, #166534, #86EFAC) */}
      <div
        onClick={() => onFilterVisa(activeVisaFilter === "TRIB" ? "" : "TRIB")}
        className={`group cursor-pointer rounded-lg border p-3 transition-all hover:shadow-panel ${
          activeVisaFilter === "TRIB"
            ? "border-[#86EFAC] bg-[#DCFCE7]/40 ring-2 ring-[#86EFAC]/50 dark:bg-[#14532D]/30 dark:border-[#22C55E]"
            : "border-border bg-card hover:border-[#86EFAC]/60"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#166534] dark:text-[#86EFAC]">
            {t("kpi_trib")}
          </span>
          <Plane className="size-4 text-[#166534] dark:text-[#86EFAC]" />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight text-[#166534] dark:text-[#86EFAC]">
          {tribRecords.length}
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{t("kpi_flight_ready")}</span>
          <span className="font-mono font-medium text-foreground">
            {records.filter((r) => !!r.reserved).length} {t("kpi_booked")}
          </span>
        </div>
      </div>

      {/* 3. Wekala Paid - Blue (#DBEAFE, #1E40AF, #93C5FD) */}
      <div
        onClick={() => onFilterPay(activePayFilter === "PAID" ? "" : "PAID")}
        className={`group cursor-pointer rounded-lg border p-3 transition-all hover:shadow-panel ${
          activePayFilter === "PAID"
            ? "border-[#93C5FD] bg-[#DBEAFE]/40 ring-2 ring-[#93C5FD]/50 dark:bg-[#1E3A8A]/30 dark:border-[#3B82F6]"
            : "border-border bg-card hover:border-[#93C5FD]/60"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#1E40AF] dark:text-[#93C5FD]">
            {t("kpi_wekala_paid")}
          </span>
          <CheckCircle2 className="size-4 text-[#1E40AF] dark:text-[#93C5FD]" />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight text-[#1E40AF] dark:text-[#93C5FD]">
          {paidCount}
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{t("kpi_collected")}</span>
          <span className="font-mono font-medium text-foreground">
            {paidAmount.toLocaleString()} {t("currency_sar")}
          </span>
        </div>
      </div>

      {/* 4. Wekala Not Paid - Cyan (#CFFAFE, #155E75, #67E8F9) */}
      <div
        onClick={() => onFilterPay(activePayFilter === "PENDING" ? "" : "PENDING")}
        className={`group cursor-pointer rounded-lg border p-3 transition-all hover:shadow-panel ${
          activePayFilter === "PENDING"
            ? "border-[#67E8F9] bg-[#CFFAFE]/40 ring-2 ring-[#67E8F9]/50 dark:bg-[#164E63]/30 dark:border-[#06B6D4]"
            : "border-border bg-card hover:border-[#67E8F9]/60"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#155E75] dark:text-[#A5F3FC]">
            {t("kpi_wekala_unpaid")}
          </span>
          <Clock className="size-4 text-[#155E75] dark:text-[#A5F3FC]" />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight text-[#155E75] dark:text-[#A5F3FC]">
          {pendingCount}
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{t("kpi_outstanding")}</span>
          <span className="font-mono font-medium text-foreground">
            {pendingAmount.toLocaleString()} {t("currency_sar")}
          </span>
        </div>
      </div>

      {/* 5. Canceled - Red (#FEE2E2, #991B1B, #FCA5A5) */}
      <div
        onClick={() => onFilterVisa(activeVisaFilter === "CANCELLED" ? "" : "CANCELLED")}
        className={`group cursor-pointer rounded-lg border p-3 transition-all hover:shadow-panel ${
          activeVisaFilter === "CANCELLED"
            ? "border-[#FCA5A5] bg-[#FEE2E2]/40 ring-2 ring-[#FCA5A5]/50 dark:bg-[#7F1D1D]/30 dark:border-[#EF4444]"
            : "border-border bg-card hover:border-[#FCA5A5]/60"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#991B1B] dark:text-[#FCA5A5]">
            {t("kpi_canceled")}
          </span>
          <XCircle className="size-4 text-[#991B1B] dark:text-[#FCA5A5]" />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight text-[#991B1B] dark:text-[#FCA5A5]">
          {canceledRecords.length}
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{t("col_visa_status")}</span>
          <span className="font-mono font-medium text-foreground">
            {canceledRecords.length > 0 ? `${canceledRecords.length} ${t("records_count")}` : "0"}
          </span>
        </div>
      </div>
    </div>
  );
}
