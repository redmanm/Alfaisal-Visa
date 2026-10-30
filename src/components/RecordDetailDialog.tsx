import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Copy,
  Printer,
  Pencil,
  Trash2,
  CreditCard,
  User,
  Plane,
  FileText,
  History,
  Check,
  Building,
  Globe,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { neonDb } from "@/lib/neon-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useI18n } from "@/lib/i18n";
import {
  canDelete,
  canEditRecord,
  isReadOnly,
  daysSince,
  formatDate,
  type AppRole,
  type RecordRow,
} from "@/lib/records";
import { printCaseSlip } from "@/lib/export";

interface RecordDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: RecordRow | null;
  role: AppRole | null;
  assignedCountryIds?: string[];
  onEdit: (record: RecordRow) => void;
  onDelete: (record: RecordRow) => void;
}

interface RecordAuditItem {
  id: string;
  serial_no?: number | null;
  action: string;
  changes?: Record<string, unknown> | null;
  actor_email?: string | null;
  actor_id?: string | null;
  actor_role?: string | null;
  created_at: string;
}

export function RecordDetailDialog({
  open,
  onOpenChange,
  record,
  role,
  assignedCountryIds,
  onEdit,
  onDelete,
}: RecordDetailDialogProps) {
  const { t, isAr, lang } = useI18n();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data: recordAudit = [], isLoading: auditLoading } = useQuery({
    queryKey: ["record-audit", record?.serial_no],
    queryFn: async () => {
      if (!record?.serial_no) return [];
      const { data, error } = await neonDb
        .from("audit_log")
        .select("*")
        .eq("serial_no", record.serial_no)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as RecordAuditItem[];
    },
    enabled: !!record?.serial_no && open,
  });

  const auditList = Array.isArray(recordAudit) ? recordAudit : [];

  if (!record) return null;

  const copyToClipboard = (text: string | null | undefined, label: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    toast.success(`${t("copied")}: ${label}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const CopyableField = ({
    label,
    value,
    copyKey,
    dir,
  }: {
    label: string;
    value: string | number | null | undefined;
    copyKey: string;
    dir?: "auto" | "rtl" | "ltr";
  }) => (
    <div className="group flex items-center justify-between rounded-md border bg-card/60 p-2.5 transition-colors hover:bg-muted/40">
      <div className="min-w-0 pr-2">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="truncate font-mono text-xs font-semibold text-foreground" dir={dir}>
          {value || "—"}
        </div>
      </div>
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="size-7 opacity-60 transition-opacity group-hover:opacity-100"
          onClick={() => copyToClipboard(String(value), label, copyKey)}
          title={`${t("copy_label")} ${label}`}
        >
          {copiedKey === copyKey ? (
            <Check className="size-3.5 text-st-green" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </Button>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="Fan AlFaisal"
                className="size-9 shrink-0 rounded-md bg-white object-contain p-0.5 border shadow-2xs"
              />
              <span className="grid size-7 place-items-center rounded bg-primary/10 font-mono text-xs font-bold text-primary">
                #{record.serial_no}
              </span>
              <div>
                <DialogTitle className="text-base font-semibold font-arabic" dir="auto">
                  {record.sponsor_name}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {record.worker_name
                    ? `${t("col_worker_name")}: ${record.worker_name}`
                    : t("no_worker_specified")}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusBadge value={record.payment_state} />
              <StatusBadge value={record.visa_status} paymentState={record.payment_state} />
              <StatusBadge value={record.medical} />
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="text-xs">
              <FileText className="mr-1.5 size-3.5" /> {t("tab_overview")}
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <History className="mr-1.5 size-3.5" /> {t("tab_history")} ({auditList.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Country & Agency Badge */}
            {(record.country_name || record.agency_name) && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/20 bg-primary/5 p-2.5 text-xs">
                <Globe className="size-4 text-primary shrink-0" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {t("col_country")}: {record.country_name ?? "—"}{" "}
                    {record.country_code ? `(${record.country_code})` : ""}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Building2 className="size-3 text-primary" />
                    {t("col_agency")}: {record.agency_name ?? "—"}
                  </span>
                </div>
              </div>
            )}

            {/* Sponsor Section */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <User className="size-3.5" /> {t("sec_sponsor")}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <CopyableField
                  label={t("col_sponsor_name")}
                  value={record.sponsor_name}
                  copyKey="sp_name"
                  dir="auto"
                />
                <CopyableField
                  label={t("col_sponsor_id")}
                  value={record.sponsor_id}
                  copyKey="sp_id"
                />
                <CopyableField label={t("phone")} value={record.phone} copyKey="phone" />
                <CopyableField
                  label={t("col_city")}
                  value={record.city}
                  copyKey="city"
                  dir="auto"
                />
              </div>
            </div>

            {/* Worker & Visa Section */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Building className="size-3.5" /> {t("sec_worker")}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <CopyableField
                  label={t("col_worker_name")}
                  value={record.worker_name}
                  copyKey="worker"
                />
                <CopyableField
                  label={t("col_passport")}
                  value={record.passport_no}
                  copyKey="passport"
                />
                <CopyableField label={t("col_visa_no")} value={record.visa_no} copyKey="visa" />
                <CopyableField
                  label={t("musaned_contract_no")}
                  value={record.musaned_no}
                  copyKey="musaned"
                />
              </div>
            </div>

            {/* Financial & Dates Section */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <CreditCard className="size-3.5" /> {t("sec_financial")}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-md border bg-card/60 p-2.5">
                  <div className="text-[10px] font-medium uppercase text-muted-foreground">
                    {t("col_amount")}
                  </div>
                  <div className="font-mono text-sm font-bold text-foreground">
                    {Number(record.amount).toLocaleString()}{" "}
                    {record.currency === "SAR" ? t("currency_sar") : record.currency}
                  </div>
                </div>
                <div className="rounded-md border bg-card/60 p-2.5">
                  <div className="text-[10px] font-medium uppercase text-muted-foreground">
                    {t("col_payment")}
                  </div>
                  <div className="mt-1">
                    <StatusBadge value={record.payment_state} />
                  </div>
                </div>
                <div className="rounded-md border bg-card/60 p-2.5">
                  <div className="text-[10px] font-medium uppercase text-muted-foreground">
                    {t("col_date")}
                  </div>
                  <div className="font-mono text-xs font-semibold">
                    {formatDate(record.transaction_date) || "—"}
                  </div>
                </div>
                <div className="rounded-md border bg-card/60 p-2.5">
                  <div className="text-[10px] font-medium uppercase text-muted-foreground">
                    {t("days_elapsed")}
                  </div>
                  <div className="font-mono text-xs font-semibold">
                    {daysSince(record.transaction_date) != null
                      ? `${daysSince(record.transaction_date)} ${t("days_unit")}`
                      : "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* Travel Section */}
            {(record.airport || record.reserved || record.processing_date) && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Plane className="size-3.5" /> {t("sec_travel")}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <CopyableField label={t("airport")} value={record.airport} copyKey="airport" />
                  <CopyableField
                    label={t("reserved_flight")}
                    value={record.reserved}
                    copyKey="flight"
                  />
                  <CopyableField
                    label={t("processing_date")}
                    value={formatDate(record.processing_date)}
                    copyKey="pdate"
                  />
                </div>
              </div>
            )}

            {/* Notes Section */}
            {record.notes && (
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("sec_notes")}
                </div>
                <p
                  className="whitespace-pre-wrap text-xs leading-relaxed text-foreground"
                  dir="auto"
                >
                  {record.notes}
                </p>
              </div>
            )}

            {/* Footer metadata */}
            <div className="flex flex-wrap items-center justify-between gap-1 border-t pt-2 text-[11px] text-muted-foreground">
              <span>
                {t("created_at_label")}: {new Date(record.created_at).toLocaleString()}
              </span>
              {record.created_by_email && (
                <span>
                  {t("created_by_label")}: {record.created_by_email}
                </span>
              )}
              {record.updated_by_email && (
                <span>
                  {t("updated_by_label")}: {record.updated_by_email}
                </span>
              )}
            </div>
          </TabsContent>

          {/* Audit History Tab */}
          <TabsContent value="history" className="space-y-3">
            {auditLoading && (
              <div className="p-4 text-center text-xs text-muted-foreground">{t("loading")}</div>
            )}
            {!auditLoading && auditList.length === 0 && (
              <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
                {t("audit_no_logs")}
              </div>
            )}
            <div className="space-y-2">
              {auditList.map((log) => (
                <div key={log.id} className="rounded-md border bg-card p-3 text-xs shadow-xs">
                  <div className="flex items-center justify-between border-b pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold uppercase tracking-wider text-primary">
                        {log.action === "INSERT"
                          ? t("audit_insert")
                          : log.action === "UPDATE"
                            ? t("audit_update")
                            : log.action === "DELETE"
                              ? t("audit_delete")
                              : log.action}
                      </span>
                      <span className="text-muted-foreground">
                        {t("created_by_label")} {log.actor_email ?? t("system_user")}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  {log.changes && (
                    <div className="mt-2 space-y-1">
                      {Object.entries(
                        log.changes as Record<string, { from?: unknown; to?: unknown } | unknown>,
                      ).map(([k, v]) => (
                        <div key={k} className="flex items-start gap-1 font-mono text-[11px]">
                          <span className="text-muted-foreground">{k}:</span>{" "}
                          {v && typeof v === "object" && "to" in v ? (
                            <span>
                              <span className="line-through opacity-70">
                                {String(v.from ?? "—")}
                              </span>{" "}
                              →{" "}
                              <span className="font-semibold text-primary">
                                {String(v.to ?? "—")}
                              </span>
                            </span>
                          ) : (
                            <span>{String(v)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => printCaseSlip(record, lang)}
            className="flex items-center gap-1.5"
          >
            <Printer className="size-3.5" /> {t("print_slip")}
          </Button>

          <div className="flex items-center gap-2">
            {canDelete(role, record, assignedCountryIds) && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onDelete(record);
                  onOpenChange(false);
                }}
                className="flex items-center gap-1.5"
              >
                <Trash2 className="size-3.5" /> {t("delete")}
              </Button>
            )}
            {canEditRecord(role, record, assignedCountryIds) && (
              <Button
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(record);
                }}
                className="flex items-center gap-1.5"
              >
                <Pencil className="size-3.5" /> {t("edit_record")}
              </Button>
            )}
            {isReadOnly(role) && (
              <span className="text-[11px] text-muted-foreground bg-muted px-2.5 py-1 rounded border">
                {t("role_read_only")}
              </span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
