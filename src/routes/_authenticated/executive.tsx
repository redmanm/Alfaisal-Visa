import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Users,
  Globe,
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Search,
  RefreshCw,
  Printer,
  ChevronRight,
  Briefcase,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  UserCheck,
  Percent,
} from "lucide-react";
import {
  getExecutiveDashboardServerFn,
  type ExecutiveDashboardData,
  type ExecutiveAgencyMetric,
} from "@/lib/server-api";
import { isSuperAdmin, normalizeRole, type AppRole } from "@/lib/records";
import { getStoredSession } from "@/lib/neon-client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmExportDialog } from "@/components/ConfirmExportDialog";

export const Route = createFileRoute("/_authenticated/executive")({
  ssr: false,
  head: () => ({
    meta: [
      {
        title: "لوحة القيادة التنفيذية | Executive Dashboard — Fan AlFaisal",
      },
      {
        name: "description",
        content:
          "Executive oversight, territory analytics, and agency performance tracking for Super Admin.",
      },
    ],
  }),
  component: ExecutiveDashboardPage,
});

function ExecutiveDashboardPage() {
  const context = (Route.useRouteContext() || {}) as Record<string, unknown>;
  const session = getStoredSession();
  const rawRole =
    session?.user?.role ||
    session?.user?.user_metadata?.role ||
    (context.role as string | undefined);
  const role: AppRole = normalizeRole(rawRole) ?? "STAFF";

  const { t, isAr } = useI18n();

  // Active view tab: "overview" | "admins" | "countries" | "agencies"
  const [activeTab, setActiveTab] = useState<"overview" | "admins" | "countries" | "agencies">(
    "overview",
  );

  // Agency tab filters
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>("ALL");
  const [agencySearch, setAgencySearch] = useState<string>("");

  // Admins tab search
  const [adminSearch, setAdminSearch] = useState<string>("");

  // Export modal state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch complete real-time executive data
  const { data, isLoading, isFetching, refetch } = useQuery<ExecutiveDashboardData | null>({
    queryKey: ["executive-dashboard"],
    queryFn: async () => {
      const res = await getExecutiveDashboardServerFn({
        data: { userRole: "SUPER_ADMIN" },
      });
      if (res.error) throw new Error(res.error);
      return res.data;
    },
    enabled: isSuperAdmin(role),
    refetchInterval: 60000,
  });

  const overview = data?.overview;
  const adminList = useMemo(() => data?.admins || [], [data?.admins]);
  const countryList = useMemo(() => data?.countries || [], [data?.countries]);
  const agenciesByCountry = useMemo(() => data?.agenciesByCountry || [], [data?.agenciesByCountry]);

  // Filtered Admins
  const filteredAdmins = useMemo(() => {
    const s = adminSearch.trim().toLowerCase();
    if (!s) return adminList;
    return adminList.filter(
      (a) =>
        a.fullName.toLowerCase().includes(s) ||
        a.email.toLowerCase().includes(s) ||
        a.assignedCountries.some(
          (c) => c.name.toLowerCase().includes(s) || c.countryCode.toLowerCase().includes(s),
        ),
    );
  }, [adminList, adminSearch]);

  // Filtered Agencies grouped by Country
  const filteredAgenciesByCountry = useMemo(() => {
    const s = agencySearch.trim().toLowerCase();
    return agenciesByCountry
      .filter((grp) => {
        if (selectedCountryFilter !== "ALL" && grp.country.id !== selectedCountryFilter) {
          return false;
        }
        return true;
      })
      .map((grp) => {
        if (!s) return grp;
        const matchingAgencies = grp.agencies.filter(
          (a) =>
            a.name.toLowerCase().includes(s) ||
            (a.licenseNo && a.licenseNo.toLowerCase().includes(s)) ||
            (a.phone && a.phone.includes(s)),
        );
        return {
          country: grp.country,
          agencies: matchingAgencies,
        };
      })
      .filter((grp) => grp.agencies.length > 0);
  }, [agenciesByCountry, selectedCountryFilter, agencySearch]);

  // Guard: Accessible ONLY by Super Admin
  if (!isSuperAdmin(role)) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="grid size-16 place-items-center rounded-2xl bg-destructive/10 text-destructive mb-4 shadow-xs">
          <ShieldAlert className="size-8" />
        </div>
        <h2 className="text-xl font-bold font-arabic">{t("access_restricted")}</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          {t("access_restricted_users_desc")}
        </p>
        <div className="mt-6">
          <Link
            to="/records"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {t("nav_records")}
          </Link>
        </div>
      </div>
    );
  }

  function handleConfirmExecutiveExport() {
    setIsExporting(true);
    toast.info(t("export_preparing"));
    setTimeout(() => {
      window.print();
      setIsExporting(false);
      setExportDialogOpen(false);
      toast.success(t("export_ready"));
    }, 300);
  }

  // Format currency numbers
  const fmtMoney = (val: number | undefined | null) =>
    (val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return (
    <div className="space-y-5 p-2 sm:p-3 md:px-4 md:py-3 w-full max-w-none">
      {/* ------------------------------------------------------------- */}
      {/* 1. Header & Super Admin Scoped Read-Only Notice Banner        */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:p-6 shadow-panel">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-arabic">
                {t("exec_title")}
              </h1>
              <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-600 border border-amber-500/30">
                <ShieldCheck className="size-3.5" /> {t("exec_badge")}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-arabic">
              {t("exec_subtitle")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-1.5 h-8 text-xs shadow-xs"
              title={t("exec_refresh")}
            >
              <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin text-primary" : ""}`} />
              <span className="hidden sm:inline">{t("exec_refresh")}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportDialogOpen(true)}
              className="gap-1.5 h-8 text-xs shadow-xs"
              title={t("exec_export_executive")}
            >
              <Printer className="size-3.5" />
              <span className="hidden sm:inline">{t("exec_export_executive")}</span>
            </Button>
            <Link
              to="/records"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <Briefcase className="size-3.5" />
              <span>{t("nav_records")}</span>
              <ArrowUpRight className="size-3.5 rtl:rotate-[-90deg]" />
            </Link>
          </div>
        </div>

        {/* Read-Only Scope Info Bar */}
        <div className="flex items-start sm:items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-foreground/90 font-arabic">
          <ShieldAlert className="size-4 text-primary shrink-0 mt-0.5 sm:mt-0" />
          <p className="leading-relaxed">{t("exec_read_only_notice")}</p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Navigation Tabs for the 4 Executive Dimensions                */}
      {/* ------------------------------------------------------------- */}
      <div className="flex border-b border-border/80 overflow-x-auto scrollbar-none gap-2 pb-1">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors shrink-0 ${
            activeTab === "overview"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <TrendingUp className="size-4" />
          <span>{t("exec_tab_overview")}</span>
        </button>

        <button
          onClick={() => setActiveTab("admins")}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors shrink-0 ${
            activeTab === "admins"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Users className="size-4" />
          <span>{t("exec_tab_admins")}</span>
          <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px] font-mono">
            {adminList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("countries")}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors shrink-0 ${
            activeTab === "countries"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Globe className="size-4" />
          <span>{t("exec_tab_countries")}</span>
          <span className="rounded-full bg-background/20 px-1.5 py-0.2 text-[10px] font-mono">
            {countryList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("agencies")}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors shrink-0 ${
            activeTab === "agencies"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Building2 className="size-4" />
          <span>{t("exec_tab_agencies")}</span>
        </button>
      </div>

      {isLoading && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-xs text-muted-foreground">
            <div className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>{t("loading")}</span>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* Dimension 1: Overall System Status Breakdown                  */}
      {/* ============================================================= */}
      {activeTab === "overview" && overview && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Top 4 Global Totals KPI Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* 1. Active Records */}
            <div className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-panel hover:border-primary/40 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold font-arabic">
                  {t("exec_active_records")}
                </span>
                <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <CheckCircle2 className="size-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-primary">
                  {overview.activeRecords.toLocaleString()}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5 font-mono">
                  <span>
                    {overview.totalRecords.toLocaleString()} {t("total")}
                  </span>
                  <span>•</span>
                  <span className="text-emerald-600 font-semibold">
                    {overview.totalRecords > 0
                      ? Math.round((overview.activeRecords / overview.totalRecords) * 100)
                      : 0}
                    % {t("exec_active_rate")}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Completed Visas */}
            <div className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-panel hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold font-arabic">
                  {t("exec_completed_visas")}
                </span>
                <div className="grid size-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <ShieldCheck className="size-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-emerald-600">
                  {overview.completedVisas.toLocaleString()}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 font-mono">
                  <span>
                    {overview.totalRecords > 0
                      ? Math.round((overview.completedVisas / overview.totalRecords) * 100)
                      : 0}
                    % {t("exec_completion_rate")}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Paid vs Unpaid Total Amounts */}
            <div className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-panel hover:border-blue-500/40 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold font-arabic">{t("exec_paid_total")}</span>
                <div className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-600">
                  <DollarSign className="size-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-blue-600">
                  {fmtMoney(overview.totalPaidAmount)}
                </div>
                <div className="text-[11px] text-amber-600 mt-1 font-mono flex items-center gap-1">
                  <span>{t("exec_unpaid_total")}:</span>
                  <span className="font-bold">{fmtMoney(overview.totalUnpaidAmount)}</span>
                </div>
              </div>
            </div>

            {/* 4. Canceled Applications */}
            <div className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-panel hover:border-destructive/40 transition-colors">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-semibold font-arabic">{t("exec_canceled_apps")}</span>
                <div className="grid size-8 place-items-center rounded-lg bg-destructive/10 text-destructive">
                  <XCircle className="size-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono text-destructive">
                  {overview.canceledRecords.toLocaleString()}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 font-mono">
                  <span>
                    {overview.totalRecords > 0
                      ? Math.round((overview.canceledRecords / overview.totalRecords) * 100)
                      : 0}
                    % {t("exec_percentage_label")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5 Core Status Pills - Global Breakdown */}
          <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-panel space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
              <div>
                <h3 className="text-sm font-bold font-arabic">{t("exec_drilldown_agency")}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-arabic">
                  {t("exec_agency_drilldown_desc")}
                </p>
              </div>
              <div className="text-xs font-mono text-muted-foreground">
                {overview.totalRecords.toLocaleString()} {t("exec_applications_count")}
              </div>
            </div>

            {/* Color-Coded 5 Status Badges Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* 1. Visa Stamped - Yellow */}
              <div className="flex flex-col p-3 rounded-lg border border-[#FCD34D] bg-[#FEF3C7]/60 dark:bg-[#78350F]/20 dark:border-[#F59E0B]/40 text-[#92400E] dark:text-[#FDE68A] shadow-xs">
                <span className="text-xs font-bold font-arabic">{t("exec_status_stamped")}</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl font-extrabold font-mono">
                    {overview.statusBreakdown.visaStamped.count}
                  </span>
                  <span className="text-xs font-bold font-mono">
                    {overview.statusBreakdown.visaStamped.percentage}%
                  </span>
                </div>
              </div>

              {/* 2. TRIB - Green */}
              <div className="flex flex-col p-3 rounded-lg border border-[#86EFAC] bg-[#DCFCE7]/60 dark:bg-[#14532D]/20 dark:border-[#22C55E]/40 text-[#166534] dark:text-[#86EFAC] shadow-xs">
                <span className="text-xs font-bold font-arabic">{t("exec_status_trib")}</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl font-extrabold font-mono">
                    {overview.statusBreakdown.trib.count}
                  </span>
                  <span className="text-xs font-bold font-mono">
                    {overview.statusBreakdown.trib.percentage}%
                  </span>
                </div>
              </div>

              {/* 3. Wekala Paid - Blue */}
              <div className="flex flex-col p-3 rounded-lg border border-[#93C5FD] bg-[#DBEAFE]/60 dark:bg-[#1E3A8A]/20 dark:border-[#3B82F6]/40 text-[#1E40AF] dark:text-[#93C5FD] shadow-xs">
                <span className="text-xs font-bold font-arabic">{t("exec_status_paid")}</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl font-extrabold font-mono">
                    {overview.statusBreakdown.wekalaPaid.count}
                  </span>
                  <span className="text-xs font-bold font-mono">
                    {overview.statusBreakdown.wekalaPaid.percentage}%
                  </span>
                </div>
              </div>

              {/* 4. Wekala Not Paid - Cyan */}
              <div className="flex flex-col p-3 rounded-lg border border-[#67E8F9] bg-[#CFFAFE]/60 dark:bg-[#164E63]/20 dark:border-[#06B6D4]/40 text-[#155E75] dark:text-[#A5F3FC] shadow-xs">
                <span className="text-xs font-bold font-arabic">{t("exec_status_unpaid")}</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl font-extrabold font-mono">
                    {overview.statusBreakdown.wekalaNotPaid.count}
                  </span>
                  <span className="text-xs font-bold font-mono">
                    {overview.statusBreakdown.wekalaNotPaid.percentage}%
                  </span>
                </div>
              </div>

              {/* 5. Canceled - Red */}
              <div className="flex flex-col p-3 rounded-lg border border-[#FCA5A5] bg-[#FEE2E2]/60 dark:bg-[#7F1D1D]/20 dark:border-[#EF4444]/40 text-[#991B1B] dark:text-[#FCA5A5] shadow-xs col-span-2 sm:col-span-1">
                <span className="text-xs font-bold font-arabic">{t("exec_status_canceled")}</span>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xl font-extrabold font-mono">
                    {overview.statusBreakdown.canceled.count}
                  </span>
                  <span className="text-xs font-bold font-mono">
                    {overview.statusBreakdown.canceled.percentage}%
                  </span>
                </div>
              </div>
            </div>

            {/* Currency Distribution Cards */}
            <div className="pt-2">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 font-arabic">
                {t("exec_total_volume")}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                {overview.currencies.map((cur) => (
                  <div
                    key={cur.currency}
                    className="flex flex-col p-2.5 rounded-lg border bg-muted/20 text-xs shadow-2xs"
                  >
                    <div className="flex items-center justify-between font-mono font-bold text-foreground">
                      <span>{cur.currency}</span>
                      <span className="text-[11px] text-muted-foreground font-normal">
                        {cur.count} {t("exec_applications_count")}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-baseline justify-between text-xs font-mono">
                      <span className="text-muted-foreground">{t("total")}:</span>
                      <span className="font-bold">{fmtMoney(cur.totalAmount)}</span>
                    </div>
                    <div className="flex items-baseline justify-between text-[11px] font-mono text-emerald-600">
                      <span>{t("exec_status_paid")}:</span>
                      <span>{fmtMoney(cur.paidAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* Dimension 2: Admin Status & Performance Metrics               */}
      {/* ============================================================= */}
      {activeTab === "admins" && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
            <div>
              <h3 className="text-base font-bold font-arabic">{t("exec_admins_metrics_title")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-arabic">
                {t("exec_admins_metrics_desc")}
              </p>
            </div>
            <div className="relative min-w-[240px] max-w-sm">
              <Search className="absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                placeholder={t("exec_search_admin")}
                className="h-8 text-xs pl-8 rtl:pl-3 rtl:pr-8 bg-card shadow-xs"
              />
            </div>
          </div>

          {filteredAdmins.length === 0 && (
            <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground font-arabic">
              {t("exec_no_admins_found")}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAdmins.map((adm) => {
              const isHeavy = adm.activePendingWorkload > 15;
              return (
                <div
                  key={adm.id}
                  className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-panel hover:border-primary/40 transition-colors"
                >
                  <div className="space-y-3">
                    {/* Admin Header */}
                    <div className="flex items-start justify-between gap-2 border-b pb-2.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="size-4 text-primary shrink-0" />
                          <h4 className="text-sm font-bold truncate">{adm.fullName}</h4>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate font-mono">
                          {adm.email}
                        </p>
                      </div>
                      <span className="rounded-md bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 shrink-0">
                        {t("role_admin")}
                      </span>
                    </div>

                    {/* Assigned Countries & Agencies */}
                    <div className="space-y-1.5 text-xs">
                      <div className="text-[11px] font-semibold text-muted-foreground font-arabic">
                        {t("exec_assigned_territories")}:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {adm.assignedCountries.length > 0 ? (
                          adm.assignedCountries.map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1 rounded bg-muted/60 border px-1.5 py-0.5 text-[10px] font-medium"
                            >
                              <span className="font-mono font-bold text-primary">
                                {c.countryCode}
                              </span>
                              <span>{c.name}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-amber-600 font-medium">
                            {t("no_country_assigned_warning")}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-1">
                        {adm.assignedAgencies.length} {t("exec_assigned_agencies")}
                      </div>
                    </div>

                    {/* Workload & Volume Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div className="rounded-lg bg-muted/30 p-2 text-center">
                        <div className="text-[10px] text-muted-foreground font-arabic">
                          {t("exec_handled_volume")}
                        </div>
                        <div className="text-lg font-bold font-mono text-foreground mt-0.5">
                          {adm.totalCandidateVolume.toLocaleString()}
                        </div>
                      </div>

                      <div
                        className={`rounded-lg p-2 text-center border ${
                          isHeavy
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                            : "bg-muted/30 border-transparent text-foreground"
                        }`}
                      >
                        <div className="text-[10px] font-arabic flex items-center justify-center gap-1">
                          {isHeavy && <AlertTriangle className="size-3 text-amber-600 shrink-0" />}
                          <span>{t("exec_pending_workload")}</span>
                        </div>
                        <div className="text-lg font-bold font-mono mt-0.5">
                          {adm.activePendingWorkload.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Completed Visas & Financials */}
                    <div className="space-y-1 text-[11px] font-mono pt-1">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>{t("exec_completed_visas")}:</span>
                        <span className="font-semibold text-emerald-600">
                          {adm.completedVisas.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>{t("exec_paid_total")}:</span>
                        <span className="font-semibold text-blue-600">
                          {fmtMoney(adm.paidFinancialVolume)} SAR
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* Dimension 3: Country-Level Status Overview                    */}
      {/* ============================================================= */}
      {activeTab === "countries" && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="border-b pb-3">
            <h3 className="text-base font-bold font-arabic">{t("exec_country_pipeline_title")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 font-arabic">
              {t("exec_country_pipeline_desc")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {countryList.map((c) => (
              <div
                key={c.id}
                className="flex flex-col justify-between rounded-xl border bg-card p-4 sm:p-5 shadow-panel space-y-4 hover:border-primary/40 transition-colors"
              >
                {/* Country Header */}
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-9 place-items-center rounded-lg bg-primary/10 font-bold text-primary font-mono text-sm shrink-0">
                      {c.countryCode}
                    </span>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold">{c.name}</h4>
                      <p className="text-[11px] text-muted-foreground font-mono">
                        {c.agencyCount} {t("exec_agency_count")}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold font-mono text-primary">
                      {c.totalApplications.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {c.activeApplications} {t("exec_active_records")}
                    </div>
                  </div>
                </div>

                {/* Assigned Admins */}
                <div className="text-xs space-y-1">
                  <span className="text-[11px] text-muted-foreground font-semibold font-arabic">
                    {t("nav_admins")}:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {c.assignedAdmins.length > 0 ? (
                      c.assignedAdmins.map((adm) => (
                        <span
                          key={adm.id}
                          className="inline-flex items-center gap-1 rounded bg-muted/70 px-2 py-0.5 text-[10px] font-medium"
                        >
                          <UserCheck className="size-2.5 text-primary" />
                          <span>{adm.fullName}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-amber-600 font-medium">
                        {t("no_country_assigned_warning")}
                      </span>
                    )}
                  </div>
                </div>

                {/* 5 Status Badges for Country */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                  {/* Visa Stamped */}
                  <div className="rounded p-2 border border-[#FCD34D] bg-[#FEF3C7]/40 dark:bg-[#78350F]/20 text-[#92400E] dark:text-[#FDE68A]">
                    <div className="text-[10px] font-bold font-arabic">
                      {t("exec_status_stamped")}
                    </div>
                    <div className="font-mono font-bold text-sm mt-0.5">
                      {c.statusBreakdown.visaStamped.count} (
                      {c.statusBreakdown.visaStamped.percentage}%)
                    </div>
                  </div>

                  {/* TRIB */}
                  <div className="rounded p-2 border border-[#86EFAC] bg-[#DCFCE7]/40 dark:bg-[#14532D]/20 text-[#166534] dark:text-[#86EFAC]">
                    <div className="text-[10px] font-bold font-arabic">{t("exec_status_trib")}</div>
                    <div className="font-mono font-bold text-sm mt-0.5">
                      {c.statusBreakdown.trib.count} ({c.statusBreakdown.trib.percentage}%)
                    </div>
                  </div>

                  {/* Wekala Paid */}
                  <div className="rounded p-2 border border-[#93C5FD] bg-[#DBEAFE]/40 dark:bg-[#1E3A8A]/20 text-[#1E40AF] dark:text-[#93C5FD]">
                    <div className="text-[10px] font-bold font-arabic">{t("exec_status_paid")}</div>
                    <div className="font-mono font-bold text-sm mt-0.5">
                      {c.statusBreakdown.wekalaPaid.count} (
                      {c.statusBreakdown.wekalaPaid.percentage}%)
                    </div>
                  </div>

                  {/* Wekala Not Paid */}
                  <div className="rounded p-2 border border-[#67E8F9] bg-[#CFFAFE]/40 dark:bg-[#164E63]/20 text-[#155E75] dark:text-[#A5F3FC]">
                    <div className="text-[10px] font-bold font-arabic">
                      {t("exec_status_unpaid")}
                    </div>
                    <div className="font-mono font-bold text-sm mt-0.5">
                      {c.statusBreakdown.wekalaNotPaid.count} (
                      {c.statusBreakdown.wekalaNotPaid.percentage}%)
                    </div>
                  </div>

                  {/* Canceled */}
                  <div className="rounded p-2 border border-[#FCA5A5] bg-[#FEE2E2]/40 dark:bg-[#7F1D1D]/20 text-[#991B1B] dark:text-[#FCA5A5] col-span-2 sm:col-span-1">
                    <div className="text-[10px] font-bold font-arabic">
                      {t("exec_status_canceled")}
                    </div>
                    <div className="font-mono font-bold text-sm mt-0.5">
                      {c.statusBreakdown.canceled.count} ({c.statusBreakdown.canceled.percentage}%)
                    </div>
                  </div>
                </div>

                {/* Country Financials */}
                <div className="pt-2 border-t flex flex-wrap items-center justify-between text-xs font-mono">
                  <div className="text-muted-foreground">
                    <span>{t("total")}: </span>
                    <strong className="text-foreground">{fmtMoney(c.totalAmount)} SAR</strong>
                  </div>
                  <div className="text-blue-600">
                    <span>{t("exec_status_paid")}: </span>
                    <strong>{fmtMoney(c.paidAmount)} SAR</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* Dimension 4: Agency-Level Visa Processing Status (Drill-Down) */}
      {/* ============================================================= */}
      {activeTab === "agencies" && (
        <div className="space-y-4 animate-in fade-in-50 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
            <div>
              <h3 className="text-base font-bold font-arabic">
                {t("exec_agency_drilldown_title")}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 font-arabic">
                {t("exec_agency_drilldown_desc")}
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedCountryFilter}
                onChange={(e) => setSelectedCountryFilter(e.target.value)}
                className="h-8 rounded-md border bg-card px-2.5 text-xs shadow-xs focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">{t("exec_all_countries")}</option>
                {countryList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.countryCode} — {c.name}
                  </option>
                ))}
              </select>

              <div className="relative min-w-[200px]">
                <Search className="absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={agencySearch}
                  onChange={(e) => setAgencySearch(e.target.value)}
                  placeholder={t("exec_search_agency")}
                  className="h-8 text-xs pl-8 rtl:pl-3 rtl:pr-8 bg-card shadow-xs"
                />
              </div>
            </div>
          </div>

          {filteredAgenciesByCountry.length === 0 && (
            <div className="rounded-xl border border-dashed p-8 text-center text-xs text-muted-foreground font-arabic">
              {t("exec_no_agencies_found")}
            </div>
          )}

          {/* Grouped Agencies by Country */}
          <div className="space-y-6">
            {filteredAgenciesByCountry.map((grp) => (
              <div key={grp.country.id} className="space-y-3">
                {/* Country Header Bar */}
                <div className="flex items-center gap-2 px-1">
                  <span className="grid size-6 place-items-center rounded bg-primary text-primary-foreground font-bold font-mono text-xs">
                    {grp.country.countryCode}
                  </span>
                  <h4 className="text-sm font-bold">{grp.country.name}</h4>
                  <span className="text-xs text-muted-foreground font-mono">
                    ({grp.agencies.length} {t("exec_assigned_agencies")})
                  </span>
                </div>

                {/* Agencies Grid for this Country */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {grp.agencies.map((agency: ExecutiveAgencyMetric) => (
                    <div
                      key={agency.id}
                      className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-panel hover:border-primary/40 transition-colors space-y-3"
                    >
                      {/* Agency Name & Total */}
                      <div className="flex items-start justify-between gap-2 border-b pb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="size-4 text-primary shrink-0" />
                            <h5 className="text-sm font-bold truncate">{agency.name}</h5>
                          </div>
                          {agency.licenseNo && (
                            <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                              {agency.licenseNo}
                            </p>
                          )}
                        </div>
                        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold font-mono text-primary shrink-0">
                          {agency.totalCandidates} {t("exec_applications_count")}
                        </span>
                      </div>

                      {/* Exact 5 Status Badges with Exact Rules */}
                      <div className="space-y-1.5 text-xs">
                        {/* 1. Visa Stamped - Yellow */}
                        <div className="flex items-center justify-between rounded-md p-1.5 px-2 border border-[#FCD34D] bg-[#FEF3C7]/60 dark:bg-[#78350F]/20 text-[#92400E] dark:text-[#FDE68A]">
                          <span className="text-[11px] font-bold font-arabic">
                            {t("exec_status_stamped")}
                          </span>
                          <span className="font-mono font-bold text-xs">
                            {agency.visaStamped.count} ({agency.visaStamped.percentage}%)
                          </span>
                        </div>

                        {/* 2. TRIB - Green */}
                        <div className="flex items-center justify-between rounded-md p-1.5 px-2 border border-[#86EFAC] bg-[#DCFCE7]/60 dark:bg-[#14532D]/20 text-[#166534] dark:text-[#86EFAC]">
                          <span className="text-[11px] font-bold font-arabic">
                            {t("exec_status_trib")}
                          </span>
                          <span className="font-mono font-bold text-xs">
                            {agency.trib.count} ({agency.trib.percentage}%)
                          </span>
                        </div>

                        {/* 3. Wekala Paid - Blue */}
                        <div className="flex items-center justify-between rounded-md p-1.5 px-2 border border-[#93C5FD] bg-[#DBEAFE]/60 dark:bg-[#1E3A8A]/20 text-[#1E40AF] dark:text-[#93C5FD]">
                          <span className="text-[11px] font-bold font-arabic">
                            {t("exec_status_paid")}
                          </span>
                          <span className="font-mono font-bold text-xs">
                            {agency.wekalaPaid.count} ({agency.wekalaPaid.percentage}%)
                          </span>
                        </div>

                        {/* 4. Wekala Not Paid - Cyan */}
                        <div className="flex items-center justify-between rounded-md p-1.5 px-2 border border-[#67E8F9] bg-[#CFFAFE]/60 dark:bg-[#164E63]/20 text-[#155E75] dark:text-[#A5F3FC]">
                          <span className="text-[11px] font-bold font-arabic">
                            {t("exec_status_unpaid")}
                          </span>
                          <span className="font-mono font-bold text-xs">
                            {agency.wekalaNotPaid.count} ({agency.wekalaNotPaid.percentage}%)
                          </span>
                        </div>

                        {/* 5. Canceled - Red */}
                        <div className="flex items-center justify-between rounded-md p-1.5 px-2 border border-[#FCA5A5] bg-[#FEE2E2]/60 dark:bg-[#7F1D1D]/20 text-[#991B1B] dark:text-[#FCA5A5]">
                          <span className="text-[11px] font-bold font-arabic">
                            {t("exec_status_canceled")}
                          </span>
                          <span className="font-mono font-bold text-xs">
                            {agency.canceled.count} ({agency.canceled.percentage}%)
                          </span>
                        </div>
                      </div>

                      {/* Financial info */}
                      <div className="pt-2 border-t flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                        <span>
                          {t("total")}: {fmtMoney(agency.totalAmount)}
                        </span>
                        <span className="text-blue-600 font-semibold">
                          {t("exec_status_paid")}: {fmtMoney(agency.paidAmount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal: Executive Report Print / Export */}
      <ConfirmExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        format="PDF"
        recordsCount={overview?.totalRecords ?? 0}
        onConfirm={handleConfirmExecutiveExport}
        loading={isExporting}
      />
    </div>
  );
}
