import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpDown,
  Download,
  Plus,
  Trash2,
  Pencil,
  Eye,
  SlidersHorizontal,
  X,
  FileSpreadsheet,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Filter,
  ShieldCheck,
  Copy,
  Check,
} from "lucide-react";
import { neonDb, getStoredSession } from "@/lib/neon-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/StatusBadge";
import { RecordForm } from "@/components/RecordForm";
import { RecordDetailDialog } from "@/components/RecordDetailDialog";
import { DashboardMetrics } from "@/components/DashboardMetrics";
import { AnalyticsView } from "@/components/AnalyticsView";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { ConfirmExportDialog, type ExportFormat } from "@/components/ConfirmExportDialog";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  canCreateRecord,
  canEditRecord,
  canDelete,
  isSuperAdmin,
  daysSince,
  formatDate,
  normalizeRole,
  type AppRole,
  PAYMENT_STATES,
  VISA_STATUSES,
  MEDICAL_STATES,
  type RecordRow,
} from "@/lib/records";
import { exportCsv, exportPdf, exportXlsx } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/records")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "المعاملات والتأشيرات | Candidate Records — Fan AlFaisal" },
      { name: "description", content: "Sponsor, visa, embassy and payment records." },
    ],
  }),
  component: RecordsPage,
});

type SortKey =
  | "serial_no"
  | "sponsor_name"
  | "sponsor_id"
  | "worker_name"
  | "passport_no"
  | "visa_no"
  | "musaned_no"
  | "city"
  | "medical"
  | "amount"
  | "transaction_date"
  | "visa_status"
  | "payment_state";

function CopyableCell({
  value,
  label,
  className,
}: {
  value: string | number | null | undefined;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();

  if (!value) {
    return <span className="text-muted-foreground">—</span>;
  }

  const str = String(value);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(str);
    setCopied(true);
    toast.success(label ? `${t("copied")}: ${label}` : t("copied_to_clipboard"));
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={cn("inline-flex items-center gap-1 font-mono text-[11px] sm:text-xs", className)}
    >
      <span className="truncate select-all">{str}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="rounded p-0.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground shrink-0 focus-visible:outline-none"
        title={t("copy_to_clipboard")}
        aria-label={t("copy_to_clipboard")}
      >
        {copied ? (
          <Check className="size-2.5 text-emerald-500 animate-in zoom-in-50" />
        ) : (
          <Copy className="size-2.5" />
        )}
      </button>
    </div>
  );
}

function RecordsPage() {
  const context = (Route.useRouteContext() || {}) as Record<string, unknown>;
  const session = getStoredSession();
  const rawRole =
    session?.user?.role ||
    session?.user?.user_metadata?.role ||
    (context.role as string | undefined);
  const role: AppRole = normalizeRole(rawRole) ?? "STAFF";
  const assignedCountryIds: string[] =
    session?.user?.assigned_country_ids ||
    session?.user?.user_metadata?.assigned_country_ids ||
    (context.assignedCountryIds as string[] | undefined) ||
    [];
  const { t, isAr, lang } = useI18n();
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["records"],
    queryFn: async () => {
      const { data, error } = await neonDb
        .from("records")
        .select("*")
        .order("serial_no")
        .range(0, 4999);
      if (error) throw error;
      return (data || []) as RecordRow[];
    },
  });

  // View mode: grid table vs analytics
  const [activeTab, setActiveTab] = useState<"grid" | "analytics">("grid");

  // Filters
  const [q, setQ] = useState("");
  const [pay, setPay] = useState("");
  const [visa, setVisa] = useState("");
  const [med, setMed] = useState("");
  const [city, setCity] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [agencyFilter, setAgencyFilter] = useState("");
  const [quickFilter, setQuickFilter] = useState<string>("ALL");

  // Sorting & display
  const [sort, setSort] = useState<{ k: SortKey; asc: boolean }>({ k: "serial_no", asc: true });
  const [compact, setCompact] = useState(false);

  // Pagination
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Selection for batch actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals & drawers
  const [editingRecord, setEditingRecord] = useState<RecordRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<RecordRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const recordList = useMemo(() => (Array.isArray(data) ? (data as RecordRow[]) : []), [data]);

  // Distinct cities list for dropdown
  const distinctCities = useMemo(() => {
    const set = new Set<string>();
    for (const r of recordList) {
      if (r?.city?.trim()) set.add(r.city.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [recordList]);

  // Distinct countries list for dropdown
  const distinctCountries = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const r of recordList) {
      if (r?.country_id && r?.country_name) {
        map.set(r.country_id, { id: r.country_id, name: r.country_name });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "ar"),
    );
  }, [recordList]);

  // Distinct agencies list for dropdown
  const distinctAgencies = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const r of recordList) {
      if (r?.agency_id && r?.agency_name) {
        if (!countryFilter || r.country_id === countryFilter) {
          map.set(r.agency_id, { id: r.agency_id, name: r.agency_name });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", "ar"),
    );
  }, [recordList, countryFilter]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return recordList.filter((r) => {
      if (countryFilter && r.country_id !== countryFilter) return false;
      if (agencyFilter && r.agency_id !== agencyFilter) return false;
      if (pay && r.payment_state !== pay) return false;
      if (visa && r.visa_status !== visa) return false;
      if (med && r.medical !== med) return false;
      if (city && r.city !== city) return false;

      // Quick filter preset matching 5 status rules
      if (quickFilter === "VISA_STAMP") {
        if (r.visa_status !== "VISA STAMP" && r.visa_status !== "VISA STAMPED") return false;
      } else if (quickFilter === "TRIB") {
        if (r.visa_status !== "TRIB") return false;
      } else if (quickFilter === "WEKALA_PAID") {
        if (r.payment_state !== "PAID") return false;
      } else if (quickFilter === "WEKALA_UNPAID") {
        if (r.payment_state !== "PENDING" && r.payment_state !== "UNPAID") return false;
      } else if (quickFilter === "CANCELED") {
        if (r.visa_status !== "CANCELLED" && r.visa_status !== "CANCELED") return false;
      } else if (quickFilter === "OVERDUE") {
        const days = daysSince(r.transaction_date);
        if (days == null || days < 30) return false;
      }

      // Search match
      if (s) {
        const matched = [
          r.serial_no,
          r.sponsor_name,
          r.sponsor_id,
          r.worker_name,
          r.passport_no,
          r.visa_no,
          r.musaned_no,
          r.city,
          r.phone,
          r.notes,
          r.airport,
        ].some((v) => v != null && String(v).toLowerCase().includes(s));
        if (!matched) return false;
      }

      return true;
    });
  }, [recordList, q, pay, visa, med, city, countryFilter, agencyFilter, quickFilter]);

  // Sorted rows
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const x = a[sort.k] ?? "";
      const y = b[sort.k] ?? "";
      let c = 0;
      if (sort.k === "amount" || sort.k === "serial_no") {
        c = Number(x) - Number(y);
      } else {
        c = String(x).localeCompare(String(y), undefined, { numeric: true });
      }
      return sort.asc ? c : -c;
    });
  }, [filteredRows, sort]);

  // Paginated rows
  const totalPages = pageSize === 0 ? 1 : Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    if (pageSize === 0) return sortedRows;
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const totalAmount = sortedRows.reduce((s, r) => s + Number(r.amount || 0), 0);
  const hasActiveFilters = Boolean(
    q || pay || visa || med || city || countryFilter || agencyFilter || quickFilter !== "ALL",
  );

  const clearAllFilters = () => {
    setQ("");
    setPay("");
    setVisa("");
    setMed("");
    setCity("");
    setCountryFilter("");
    setAgencyFilter("");
    setQuickFilter("ALL");
    setCurrentPage(1);
  };

  const refresh = () => qc.invalidateQueries({ queryKey: ["records"] });

  // Delete modal state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<RecordRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function requestDelete(r: RecordRow) {
    setRecordToDelete(r);
    setDeleteDialogOpen(true);
  }

  async function handleConfirmDelete() {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await neonDb.from("records").delete().eq("id", recordToDelete.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(t("record_deleted"));
      if (detailRecord?.id === recordToDelete.id) setDetailOpen(false);
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
      refresh();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsDeleting(false);
    }
  }

  // Export modal state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("CSV");
  const [isExporting, setIsExporting] = useState(false);

  function triggerExport(format: ExportFormat) {
    setExportFormat(format);
    setExportDialogOpen(true);
  }

  async function handleConfirmExport() {
    setIsExporting(true);
    toast.info(t("export_preparing"));
    const exportLang = lang || (isAr ? "ar" : "en");
    try {
      if (exportFormat === "CSV") {
        exportCsv(rowsToExport, exportLang);
      } else if (exportFormat === "Excel") {
        await exportXlsx(rowsToExport, exportLang);
      } else if (exportFormat === "PDF") {
        exportPdf(
          rowsToExport,
          isAr ? "تقرير معاملات التأشيرات والعمليات" : "Visa Desk Operations Report",
          exportLang,
        );
      }
      toast.success(t("export_ready"));
      setExportDialogOpen(false);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsExporting(false);
    }
  }

  // Row selection helpers
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedRows.length && paginatedRows.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedRows.map((r) => r.id)));
    }
  };

  const toggleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Export handlers (export selected if any, otherwise all filtered)
  const rowsToExport = useMemo(() => {
    if (selectedIds.size > 0) {
      return sortedRows.filter((r) => selectedIds.has(r.id));
    }
    return sortedRows;
  }, [sortedRows, selectedIds]);

  const H = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <button
      className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${className ?? ""}`}
      onClick={() =>
        setSort((p) => {
          setCurrentPage(1);
          return { k, asc: p.k === k ? !p.asc : true };
        })
      }
    >
      <span>{label}</span>
      <ArrowUpDown
        className={`size-3 ${sort.k === k ? "text-primary opacity-100" : "opacity-40"}`}
      />
    </button>
  );

  const selClass =
    "h-9 rounded-md border border-input bg-background px-2.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="space-y-4 p-2 sm:p-3 md:px-4 md:py-3 w-full max-w-none">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Fan AlFaisal Logo"
            className="size-10 sm:size-11 shrink-0 rounded-lg bg-white object-contain p-1 shadow-xs border"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight font-arabic">
                {t("company_name")}
              </h1>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-primary">
                {isAr ? "فن الفيصل" : "Fan AlFaisal"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{t("tagline")}</p>
          </div>
        </div>

        {/* Tab & Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border bg-muted p-0.5 text-xs">
            <button
              onClick={() => setActiveTab("grid")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-1.5 font-medium transition-colors ${
                activeTab === "grid"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileSpreadsheet className="size-3.5" /> {t("tab_grid")}
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-1.5 font-medium transition-colors ${
                activeTab === "analytics"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart2 className="size-3.5" /> {t("tab_analytics")}
            </button>
          </div>

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerExport("CSV")}
              className="h-8 text-xs px-2"
              title={selectedIds.size > 0 ? `Export ${selectedIds.size} selected` : t("export_csv")}
            >
              <Download className="mr-1 size-3.5" />
              CSV {selectedIds.size > 0 && `(${selectedIds.size})`}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerExport("Excel")}
              className="h-8 text-xs px-2"
              title={
                selectedIds.size > 0 ? `Export ${selectedIds.size} selected` : t("export_excel")
              }
            >
              <Download className="mr-1 size-3.5" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => triggerExport("PDF")}
              className="h-8 text-xs px-2"
              title={t("export_pdf")}
            >
              <Download className="mr-1 size-3.5" />
              PDF
            </Button>
          </div>

          {canCreateRecord(role) && (
            <Button
              size="sm"
              onClick={() => {
                setEditingRecord(null);
                setFormOpen(true);
              }}
              className="h-8 text-xs gap-1.5 font-medium shadow-panel"
            >
              <Plus className="size-3.5" /> {t("new_record")}
            </Button>
          )}
        </div>
      </div>

      {/* Super Admin Read-Only Notice */}
      {isSuperAdmin(role) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-foreground shadow-xs font-arabic">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary shrink-0" />
            <p className="leading-relaxed">{t("exec_read_only_notice")}</p>
          </div>
          <Link
            to="/executive"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-xs font-bold hover:bg-primary/90 transition-colors shrink-0 shadow-2xs"
          >
            <span>{t("nav_executive")}</span>
          </Link>
        </div>
      )}

      {/* KPI Metrics Strip */}
      <DashboardMetrics
        records={recordList}
        activePayFilter={pay}
        activeVisaFilter={visa}
        onFilterPay={(newPay) => {
          setPay(newPay);
          setCurrentPage(1);
        }}
        onFilterVisa={(newVisa) => {
          setVisa(newVisa);
          setCurrentPage(1);
        }}
      />

      {/* Main Content Area */}
      {activeTab === "analytics" ? (
        <AnalyticsView records={sortedRows} />
      ) : (
        <div className="space-y-3">
          {/* Filters and Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border bg-card p-3 shadow-panel">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              <div className="relative flex-1 min-w-[200px] sm:max-w-xs">
                <Input
                  placeholder={t("search_placeholder")}
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9 text-xs pr-8"
                />
                {q && (
                  <button
                    onClick={() => setQ("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Payment State Filter */}
              <select
                className={cn(
                  selClass,
                  pay === "PAID" &&
                    "border-[#93C5FD] text-[#1E40AF] bg-[#DBEAFE]/30 ring-1 ring-[#93C5FD] font-semibold dark:bg-[#1E3A8A]/30 dark:text-[#93C5FD]",
                  (pay === "PENDING" || pay === "UNPAID") &&
                    "border-[#67E8F9] text-[#155E75] bg-[#CFFAFE]/30 ring-1 ring-[#67E8F9] font-semibold dark:bg-[#164E63]/30 dark:text-[#A5F3FC]",
                )}
                value={pay}
                onChange={(e) => {
                  setPay(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">{t("all_payments")}</option>
                {PAYMENT_STATES.map((s) => (
                  <option key={s} value={s}>
                    {t(`pay_${s}`, s)}
                  </option>
                ))}
              </select>

              {/* Visa Status Filter */}
              <select
                className={cn(
                  selClass,
                  visa === "VISA STAMP" &&
                    "border-[#FCD34D] text-[#92400E] bg-[#FEF3C7]/30 ring-1 ring-[#FCD34D] font-semibold dark:bg-[#78350F]/30 dark:text-[#FDE68A]",
                  visa === "TRIB" &&
                    "border-[#86EFAC] text-[#166534] bg-[#DCFCE7]/30 ring-1 ring-[#86EFAC] font-semibold dark:bg-[#14532D]/30 dark:text-[#86EFAC]",
                  visa === "WKALA" &&
                    "border-[#93C5FD] text-[#1E40AF] bg-[#DBEAFE]/30 ring-1 ring-[#93C5FD] font-semibold dark:bg-[#1E3A8A]/30 dark:text-[#93C5FD]",
                  (visa === "CANCELLED" || visa === "CANCELED") &&
                    "border-[#FCA5A5] text-[#991B1B] bg-[#FEE2E2]/30 ring-1 ring-[#FCA5A5] font-semibold dark:bg-[#7F1D1D]/30 dark:text-[#FCA5A5]",
                )}
                value={visa}
                onChange={(e) => {
                  setVisa(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">{t("all_visas")}</option>
                {VISA_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`visa_${s.replace(/ /g, "_")}`, s)}
                  </option>
                ))}
              </select>

              {/* Medical State Filter */}
              <select
                className={selClass}
                value={med}
                onChange={(e) => {
                  setMed(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">{t("all_medicals")}</option>
                {MEDICAL_STATES.map((s) => (
                  <option key={s} value={s}>
                    {t(`med_${s}`, s)}
                  </option>
                ))}
              </select>

              {/* City Filter */}
              {distinctCities.length > 0 && (
                <select
                  className={selClass}
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">{t("all_cities")}</option>
                  {distinctCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}

              {/* Country Filter */}
              {distinctCountries.length > 0 && (
                <select
                  className={selClass}
                  value={countryFilter}
                  onChange={(e) => {
                    setCountryFilter(e.target.value);
                    setAgencyFilter("");
                    setCurrentPage(1);
                  }}
                >
                  <option value="">{t("all_countries")}</option>
                  {distinctCountries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Agency Filter */}
              {distinctAgencies.length > 0 && (
                <select
                  className={selClass}
                  value={agencyFilter}
                  onChange={(e) => {
                    setAgencyFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">{t("all_agencies")}</option>
                  {distinctAgencies.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-9 text-xs text-muted-foreground hover:text-destructive px-2"
                >
                  <X className="mr-1 size-3.5" /> {t("clear_filters")}
                </Button>
              )}
            </div>

            {/* Quick toggles */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCompact(!compact)}
                className={`h-9 text-xs ${compact ? "bg-accent" : ""}`}
                title="Toggle High Density"
              >
                <SlidersHorizontal className="mr-1.5 size-3" />
                {compact ? t("density_comfortable") : t("density_compact")}
              </Button>
            </div>
          </div>

          {/* Quick Filter Presets Strip - Matching 5 Status Rules */}
          <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 max-w-full">
            <span className="flex items-center gap-1 text-muted-foreground font-medium shrink-0 mr-1">
              <Filter className="size-3" /> {t("quick_views")}
            </span>
            <button
              onClick={() => {
                setQuickFilter("ALL");
                setPay("");
                setVisa("");
                setCurrentPage(1);
              }}
              className={`shrink-0 rounded-full px-2.5 py-1 transition-colors border ${
                quickFilter === "ALL" && !pay && !visa
                  ? "bg-primary text-primary-foreground font-semibold border-primary shadow-xs"
                  : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
              }`}
            >
              {t("qf_all")} ({recordList.length})
            </button>

            {/* 1. Visa Stamped - Yellow */}
            <button
              onClick={() => {
                setQuickFilter("VISA_STAMP");
                setPay("");
                setVisa("");
                setCurrentPage(1);
              }}
              className={`shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors border ${
                quickFilter === "VISA_STAMP"
                  ? "status-pill-visa-stamped font-bold ring-2 ring-[#FCD34D]/50 shadow-xs"
                  : "bg-[#FEF3C7]/40 text-[#92400E] border-[#FCD34D]/50 hover:bg-[#FEF3C7] dark:bg-[#78350F]/20 dark:text-[#FDE68A] dark:border-[#F59E0B]/40"
              }`}
            >
              {t("qf_visa_stamped")}
            </button>

            {/* 2. TRIB - Green */}
            <button
              onClick={() => {
                setQuickFilter("TRIB");
                setPay("");
                setVisa("");
                setCurrentPage(1);
              }}
              className={`shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors border ${
                quickFilter === "TRIB"
                  ? "status-pill-trib font-bold ring-2 ring-[#86EFAC]/50 shadow-xs"
                  : "bg-[#DCFCE7]/40 text-[#166534] border-[#86EFAC]/50 hover:bg-[#DCFCE7] dark:bg-[#14532D]/20 dark:text-[#86EFAC] dark:border-[#22C55E]/40"
              }`}
            >
              {t("qf_trib")}
            </button>

            {/* 3. Wekala Paid - Blue */}
            <button
              onClick={() => {
                setQuickFilter("WEKALA_PAID");
                setPay("");
                setVisa("");
                setCurrentPage(1);
              }}
              className={`shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors border ${
                quickFilter === "WEKALA_PAID"
                  ? "status-pill-wekala-paid font-bold ring-2 ring-[#93C5FD]/50 shadow-xs"
                  : "bg-[#DBEAFE]/40 text-[#1E40AF] border-[#93C5FD]/50 hover:bg-[#DBEAFE] dark:bg-[#1E3A8A]/20 dark:text-[#93C5FD] dark:border-[#3B82F6]/40"
              }`}
            >
              {t("qf_wekala_paid")}
            </button>

            {/* 4. Wekala Not Paid - Cyan */}
            <button
              onClick={() => {
                setQuickFilter("WEKALA_UNPAID");
                setPay("");
                setVisa("");
                setCurrentPage(1);
              }}
              className={`shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors border ${
                quickFilter === "WEKALA_UNPAID"
                  ? "status-pill-wekala-unpaid font-bold ring-2 ring-[#67E8F9]/50 shadow-xs"
                  : "bg-[#CFFAFE]/40 text-[#155E75] border-[#67E8F9]/50 hover:bg-[#CFFAFE] dark:bg-[#164E63]/20 dark:text-[#A5F3FC] dark:border-[#06B6D4]/40"
              }`}
            >
              {t("qf_wekala_unpaid")}
            </button>

            {/* 5. Canceled - Red */}
            <button
              onClick={() => {
                setQuickFilter("CANCELED");
                setPay("");
                setVisa("");
                setCurrentPage(1);
              }}
              className={`shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors border ${
                quickFilter === "CANCELED"
                  ? "status-pill-canceled font-bold ring-2 ring-[#FCA5A5]/50 shadow-xs"
                  : "bg-[#FEE2E2]/40 text-[#991B1B] border-[#FCA5A5]/50 hover:bg-[#FEE2E2] dark:bg-[#7F1D1D]/20 dark:text-[#FCA5A5] dark:border-[#EF4444]/40"
              }`}
            >
              {t("qf_canceled")}
            </button>

            {/* Overdue */}
            <button
              onClick={() => {
                setQuickFilter("OVERDUE");
                setCurrentPage(1);
              }}
              className={`shrink-0 rounded-full px-2.5 py-1 font-medium transition-colors border ${
                quickFilter === "OVERDUE"
                  ? "bg-destructive text-destructive-foreground font-semibold border-destructive shadow-xs"
                  : "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20"
              }`}
            >
              {t("qf_overdue")}
            </button>
          </div>

          {/* Records Table Card */}
          <div className="overflow-x-auto rounded-lg border bg-card shadow-panel w-full">
            <table className="w-full text-xs">
              <thead className="bg-table-head text-left rtl:text-right text-muted-foreground border-b select-none">
                <tr className="[&>th]:px-1.5 sm:[&>th]:px-2 [&>th]:py-2 [&>th]:font-semibold [&>th]:whitespace-nowrap text-[11px] sm:text-xs">
                  <th className="w-7 text-center">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      className="size-3.5 rounded border-muted-foreground/30 accent-primary cursor-pointer"
                      checked={selectedIds.size > 0 && selectedIds.size === paginatedRows.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="w-10">
                    <H k="serial_no" label={t("col_serial")} />
                  </th>
                  <th>
                    <H k="sponsor_name" label={t("col_sponsor_name")} />
                  </th>
                  <th>
                    <H k="sponsor_id" label={t("col_sponsor_id")} />
                  </th>
                  <th>
                    <H k="worker_name" label={t("col_worker_name")} />
                  </th>
                  <th>
                    <H k="passport_no" label={t("col_passport")} />
                  </th>
                  <th>
                    <H k="visa_no" label={t("col_visa_no")} />
                  </th>
                  <th>
                    <H k="musaned_no" label={t("col_musaned_no")} />
                  </th>
                  <th>
                    <H k="medical" label={t("col_medical")} />
                  </th>
                  <th>
                    <H k="payment_state" label={t("col_payment")} />
                  </th>
                  <th>
                    <H k="visa_status" label={t("col_visa_status")} />
                  </th>
                  <th className="text-right rtl:text-left">
                    <H k="amount" label={t("col_amount")} />
                  </th>
                  <th>
                    <H k="transaction_date" label={t("col_date")} />
                  </th>
                  <th>{t("col_days")}</th>
                  <th>{t("col_notes")}</th>
                  <th>
                    <H k="city" label={t("col_city")} />
                  </th>
                  <th className="text-right rtl:text-left w-20">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && (
                  <tr>
                    <td colSpan={17} className="p-8 text-center text-muted-foreground">
                      <div className="inline-block size-5 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
                      <div>{t("loading")}</div>
                    </td>
                  </tr>
                )}

                {!isLoading && paginatedRows.length === 0 && (
                  <tr>
                    <td colSpan={17} className="p-8 text-center text-muted-foreground">
                      <div className="text-sm font-medium">{t("no_records")}</div>
                      {hasActiveFilters && (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={clearAllFilters}
                          className="mt-1 text-xs"
                        >
                          {t("clear_filters")}
                        </Button>
                      )}
                    </td>
                  </tr>
                )}

                {paginatedRows.map((r) => {
                  const isSelected = selectedIds.has(r.id);
                  const days = daysSince(r.transaction_date);
                  const isOverdue = days != null && days > 30;

                  return (
                    <tr
                      key={r.id}
                      className={`transition-colors hover:bg-row-hover/60 [&>td]:px-1.5 sm:[&>td]:px-2 [&>td]:whitespace-nowrap text-[11px] sm:text-xs ${
                        compact ? "[&>td]:py-0.5" : "[&>td]:py-1.5"
                      } ${isSelected ? "bg-primary/5" : ""}`}
                    >
                      <td className="w-7 text-center" onClick={(e) => toggleSelectRow(r.id, e)}>
                        <input
                          type="checkbox"
                          aria-label={`Select record #${r.serial_no}`}
                          className="size-3.5 rounded border-muted-foreground/30 accent-primary cursor-pointer"
                          checked={isSelected}
                          onChange={() => {}}
                        />
                      </td>
                      <td className="w-10 font-mono font-bold text-muted-foreground">
                        #{r.serial_no}
                      </td>
                      <td
                        dir="auto"
                        className="font-arabic font-semibold text-foreground max-w-[140px] truncate"
                      >
                        {r.sponsor_name}
                      </td>
                      <td>
                        <CopyableCell value={r.sponsor_id} label={t("col_sponsor_id")} />
                      </td>
                      <td className="font-medium text-foreground max-w-[130px] truncate">
                        {r.worker_name || "—"}
                      </td>
                      <td>
                        <CopyableCell
                          value={r.passport_no}
                          label={t("col_passport")}
                          className="font-medium"
                        />
                      </td>
                      <td>
                        <CopyableCell value={r.visa_no} label={t("col_visa_no")} />
                      </td>
                      <td>
                        <CopyableCell value={r.musaned_no} label={t("col_musaned_no")} />
                      </td>
                      <td>
                        <StatusBadge value={r.medical} />
                      </td>
                      <td>
                        <StatusBadge value={r.payment_state} />
                      </td>
                      <td>
                        <StatusBadge value={r.visa_status} paymentState={r.payment_state} />
                      </td>
                      <td className="text-right font-mono font-semibold">
                        {Number(r.amount).toLocaleString()}{" "}
                        <span className="text-[10px] text-muted-foreground font-normal">
                          {r.currency}
                        </span>
                      </td>
                      <td className="font-mono text-muted-foreground">
                        {formatDate(r.transaction_date) || "—"}
                      </td>
                      <td className="font-mono">
                        {days != null ? (
                          <span
                            className={
                              isOverdue ? "font-semibold text-destructive" : "text-muted-foreground"
                            }
                          >
                            {days} {t("days_unit")}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="max-w-[110px] truncate text-muted-foreground" dir="auto">
                        {r.notes || "—"}
                      </td>
                      <td dir="auto" className="font-arabic max-w-[80px] truncate">
                        {r.city || "—"}
                      </td>
                      <td
                        className="text-right rtl:text-left w-20"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          {/* Explicit Edit Button (Admin Only) */}
                          {canEditRecord(role, r, assignedCountryIds) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingRecord(r);
                                setFormOpen(true);
                              }}
                              className="h-6 px-1.5 text-[11px] font-medium gap-1 text-primary border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                              title={t("edit")}
                            >
                              <Pencil className="size-2.5" />
                              <span>{t("edit")}</span>
                            </Button>
                          )}

                          {/* View Details Button (Available to all roles) */}
                          <button
                            type="button"
                            aria-label={t("view_details")}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            onClick={() => {
                              setDetailRecord(r);
                              setDetailOpen(true);
                            }}
                            title={t("inspect_case")}
                          >
                            <Eye className="size-3.5" />
                          </button>

                          {/* Delete Button (Admin Only) */}
                          {canDelete(role, r, assignedCountryIds) && (
                            <button
                              type="button"
                              aria-label={t("delete")}
                              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                              onClick={() => requestDelete(r)}
                              title={t("delete")}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-card px-4 py-2.5 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <span>
                  {t("showing")}{" "}
                  <strong className="text-foreground">
                    {sortedRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                  </strong>{" "}
                  {t("to")}{" "}
                  <strong className="text-foreground">
                    {pageSize === 0
                      ? sortedRows.length
                      : Math.min(currentPage * pageSize, sortedRows.length)}
                  </strong>{" "}
                  {t("of")} <strong className="text-foreground">{sortedRows.length}</strong>{" "}
                  {t("records_count")}
                </span>
                <span>·</span>
                <span>
                  {t("total_filtered")}{" "}
                  <strong className="font-mono text-foreground">
                    {totalAmount.toLocaleString()} {t("currency_sar")}
                  </strong>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span>{t("rows_per_page")}</span>
                  <select
                    className="h-7 rounded border border-input bg-background px-1.5 text-xs focus-visible:outline-none"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                    <option value={0}>{t("all")}</option>
                  </select>
                </div>

                {pageSize > 0 && totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-7"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    >
                      <ChevronLeft className="size-3.5 rtl:rotate-180" />
                    </Button>
                    <span className="px-1 font-mono text-xs">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-7"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    >
                      <ChevronRight className="size-3.5 rtl:rotate-180" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Record Inspection Dialog */}
      <RecordDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        record={detailRecord}
        role={role}
        assignedCountryIds={assignedCountryIds}
        onEdit={(r) => {
          setEditingRecord(r);
          setFormOpen(true);
        }}
        onDelete={requestDelete}
      />

      {/* Add / Edit Record Form Modal */}
      <RecordForm
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editingRecord}
        role={role}
        assignedCountryIds={assignedCountryIds}
        onSaved={refresh}
      />

      {/* Safety Confirmation Modal: Permanent Record Deletion */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemName={
          recordToDelete
            ? `#${recordToDelete.serial_no} · ${recordToDelete.sponsor_name}${
                recordToDelete.worker_name ? ` · ${recordToDelete.worker_name}` : ""
              }`
            : null
        }
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
      />

      {/* Safety Confirmation Modal: File Export & Download */}
      <ConfirmExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        format={exportFormat}
        recordsCount={rowsToExport.length}
        onConfirm={handleConfirmExport}
        loading={isExporting}
      />
    </div>
  );
}
