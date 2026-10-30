import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { DollarSign, CheckCircle2, Clock, AlertCircle, MapPin, Users } from "lucide-react";
import type { RecordRow } from "@/lib/records";
import { VISA_STATUSES, PAYMENT_STATES } from "@/lib/records";
import { useI18n } from "@/lib/i18n";

const PIE_COLORS: Record<string, string> = {
  PAID: "#1E40AF", // Blue - Rule 3 (Wekala Paid)
  PENDING: "#0891B2", // Cyan - Rule 4 (Wekala Not Paid)
  UNPAID: "#06B6D4", // Cyan - Rule 4 (Wekala Not Paid)
  PARTIAL: "#6366F1", // Indigo
  REFUNDED: "#64748B", // Slate
  CANCELLED: "#991B1B", // Red - Rule 5 (Canceled)
  CANCELED: "#991B1B",
};

const BAR_COLORS: Record<string, string> = {
  "VISA STAMP": "#D97706", // Yellow / Amber - Rule 1 (Visa Stamped)
  "VISA STAMPED": "#D97706",
  TRIB: "#166534", // Green - Rule 2 (TRIB)
  WKALA: "#0891B2", // Cyan / Blue - Rule 3 & 4 (Wekala)
  EMBASSY: "#7C3AED", // Violet
  BIOMETRIC: "#EA580C", // Orange
  ARRIVED: "#059669", // Emerald
  CANCELLED: "#991B1B", // Red - Rule 5 (Canceled)
  CANCELED: "#991B1B",
};

interface AnalyticsViewProps {
  records: RecordRow[];
}

export function AnalyticsView({ records }: AnalyticsViewProps) {
  const { t, isAr } = useI18n();

  // Financial totals
  const totalAmount = records.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const paidRecords = records.filter((r) => r.payment_state === "PAID");
  const paidAmount = paidRecords.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const pendingAmount = records
    .filter(
      (r) =>
        r.payment_state === "PENDING" ||
        r.payment_state === "PARTIAL" ||
        r.payment_state === "UNPAID",
    )
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);

  const collectionRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  // Visa Status Distribution
  const visaData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of VISA_STATUSES) counts[v] = 0;
    for (const r of records) {
      if (r.visa_status) {
        counts[r.visa_status] = (counts[r.visa_status] || 0) + 1;
      }
    }
    return Object.entries(counts).map(([name, count]) => ({
      name: t(`visa_${name.replace(/ /g, "_")}`, name),
      count,
      fill: BAR_COLORS[name] || "#0f766e",
    }));
  }, [records, t]);

  // Payment State Distribution
  const paymentData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of PAYMENT_STATES) counts[p] = 0;
    for (const r of records) {
      if (r.payment_state) {
        counts[r.payment_state] = (counts[r.payment_state] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([name, value]) => ({
        name: t(`pay_${name}`, name),
        value,
        color: PIE_COLORS[name] || "#64748b",
      }));
  }, [records, t]);

  // City Distribution (Top 7)
  const cityData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of records) {
      const city = r.city?.trim() || t("city_unspecified");
      counts[city] = (counts[city] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([city, count]) => ({ city, count }));
  }, [records, t]);

  // Medical status
  const medicalCounts = useMemo(() => {
    const fit = records.filter((r) => r.medical === "FIT").length;
    const unfit = records.filter((r) => r.medical === "UNFIT").length;
    const pending = records.filter((r) => r.medical === "PENDING").length;
    return { fit, unfit, pending };
  }, [records]);

  return (
    <div className="space-y-6">
      {/* Top summary metric cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 shadow-panel">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">{t("analytics_contract_val")}</span>
            <DollarSign className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight">
            {totalAmount.toLocaleString()}{" "}
            <span className="text-xs font-normal text-muted-foreground">{t("currency_sar")}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {records.length} {t("active_case_records")}
          </div>
        </div>

        <div className="rounded-lg border border-[#93C5FD]/40 bg-card p-4 shadow-panel dark:border-[#3B82F6]/30">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold text-[#1E40AF] dark:text-[#93C5FD]">
              {t("analytics_settled")}
            </span>
            <CheckCircle2 className="size-4 text-[#1E40AF] dark:text-[#93C5FD]" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-[#1E40AF] dark:text-[#93C5FD]">
            {paidAmount.toLocaleString()}{" "}
            <span className="text-xs font-normal text-muted-foreground">{t("currency_sar")}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {collectionRate}% {t("analytics_collection_rate")}
          </div>
        </div>

        <div className="rounded-lg border border-[#67E8F9]/40 bg-card p-4 shadow-panel dark:border-[#06B6D4]/30">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold text-[#155E75] dark:text-[#A5F3FC]">
              {t("analytics_pending")}
            </span>
            <Clock className="size-4 text-[#155E75] dark:text-[#A5F3FC]" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-[#155E75] dark:text-[#A5F3FC]">
            {pendingAmount.toLocaleString()}{" "}
            <span className="text-xs font-normal text-muted-foreground">{t("currency_sar")}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {records.filter((r) => r.payment_state !== "PAID").length} {t("outstanding_records")}
          </div>
        </div>

        <div className="rounded-lg border border-[#86EFAC]/40 bg-card p-4 shadow-panel dark:border-[#22C55E]/30">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold text-[#166534] dark:text-[#86EFAC]">
              {t("analytics_medical_clearance")}
            </span>
            <Users className="size-4 text-[#166534] dark:text-[#86EFAC]" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono tracking-tight text-[#166534] dark:text-[#86EFAC]">
            {medicalCounts.fit}{" "}
            <span className="text-xs font-normal text-muted-foreground">{t("med_FIT")}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {medicalCounts.pending} {t("med_PENDING")} · {medicalCounts.unfit} {t("med_UNFIT")}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Visa Pipeline Distribution */}
        <div className="rounded-lg border bg-card p-4 shadow-panel">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">{t("analytics_visa_dist")}</h3>
              <p className="text-xs text-muted-foreground">{t("analytics_visa_dist_sub")}</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visaData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis
                  dataKey="name"
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                  tick={{ fontSize: 10, fill: "currentColor" }}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "currentColor" }} />
                <Tooltip
                  formatter={(value) => [
                    `${value} ${t("records_count")}`,
                    isAr ? "العدد" : "Count",
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    borderColor: "var(--color-border)",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {visaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment State Pie Chart */}
        <div className="rounded-lg border bg-card p-4 shadow-panel">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">{t("analytics_payment_dist")}</h3>
              <p className="text-xs text-muted-foreground">{t("analytics_payment_dist_sub")}</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-pay-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [
                    `${value} ${t("records_count")}`,
                    isAr ? "الحجم" : "Volume",
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    borderColor: "var(--color-border)",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "11px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Destination Cities */}
        <div className="rounded-lg border bg-card p-4 shadow-panel">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">{t("analytics_top_cities")}</h3>
              <p className="text-xs text-muted-foreground">{t("analytics_top_cities_sub")}</p>
            </div>
            <MapPin className="size-4 text-muted-foreground" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={cityData}
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "currentColor" }}
                />
                <YAxis
                  dataKey="city"
                  type="category"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  width={75}
                />
                <Tooltip
                  formatter={(value) => [
                    `${value} ${t("records_count")}`,
                    isAr ? "الحجم" : "Volume",
                  ]}
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    borderColor: "var(--color-border)",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" fill="#0f766e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Operational Flow / Aging Insights */}
        <div className="rounded-lg border bg-card p-4 shadow-panel flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold">{t("analytics_operational_health")}</h3>
            <p className="text-xs text-muted-foreground">{t("analytics_operational_health_sub")}</p>

            <div className="mt-4 space-y-3">
              <div className="rounded-md border border-[#FCD34D]/60 bg-[#FEF3C7]/20 p-3 dark:border-[#F59E0B]/40 dark:bg-[#78350F]/20">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-[#92400E] dark:text-[#FDE68A]">
                    <Clock className="size-3.5 text-[#92400E] dark:text-[#FDE68A]" />{" "}
                    {t("analytics_overdue_alert")}
                  </span>
                  <span className="font-mono font-bold text-[#92400E] dark:text-[#FDE68A]">
                    {
                      records.filter((r) => {
                        if (!r.transaction_date) return false;
                        const diff =
                          (Date.now() - new Date(r.transaction_date).getTime()) / 86400000;
                        return diff > 30;
                      }).length
                    }{" "}
                    {t("records_count")}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {isAr
                    ? "معاملات قد تحتاج لمتابعة وتواصل مع الكفيل أو مراجعة السفارة الخارجية."
                    : "Cases that might require sponsor contact or embassy follow-up."}
                </div>
              </div>

              <div className="rounded-md border border-[#FCA5A5]/60 bg-[#FEE2E2]/20 p-3 dark:border-[#EF4444]/40 dark:bg-[#7F1D1D]/20">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-[#991B1B] dark:text-[#FCA5A5]">
                    <AlertCircle className="size-3.5 text-[#991B1B] dark:text-[#FCA5A5]" />{" "}
                    {t("analytics_unfit_alert")}
                  </span>
                  <span className="font-mono font-bold text-[#991B1B] dark:text-[#FCA5A5]">
                    {records.filter((r) => r.medical === "UNFIT").length} {t("records_count")}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {isAr
                    ? "مرشحون تم رفضهم في مراكز الفحص وتتطلب المعاملات ترشيحاً بديلاً."
                    : "Candidates rejected at biometric/medical centers requiring replacement."}
                </div>
              </div>

              <div className="rounded-md border border-[#86EFAC]/60 bg-[#DCFCE7]/20 p-3 dark:border-[#22C55E]/40 dark:bg-[#14532D]/20">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-[#166534] dark:text-[#86EFAC]">
                    <CheckCircle2 className="size-3.5 text-[#166534] dark:text-[#86EFAC]" />{" "}
                    {t("analytics_ticketed_alert")}
                  </span>
                  <span className="font-mono font-bold text-[#166534] dark:text-[#86EFAC]">
                    {records.filter((r) => !!r.reserved).length} {t("records_count")}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {isAr
                    ? "معاملات بحجوزات طيران مؤكدة وجاهزة لاستقبال وتفويج العمالة."
                    : "Cases with flight bookings ready for reception at airport."}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
