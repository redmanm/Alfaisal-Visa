import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { History, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/audit")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "سجل التدقيق | Audit Trail — Fan AlFaisal" },
      {
        name: "description",
        content: "Complete audit log of record creations, modifications and status transitions.",
      },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["audit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as AuditLogEntry[];
    },
  });

  const logList = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const filteredLogs = useMemo(() => {
    const s = q.trim().toLowerCase();
    return logList.filter((log) => {
      if (actionFilter && log.action.toUpperCase() !== actionFilter) return false;
      if (s) {
        const changesText = log.changes ? JSON.stringify(log.changes).toLowerCase() : "";
        const matched =
          (log.actor_email && log.actor_email.toLowerCase().includes(s)) ||
          (log.action && log.action.toLowerCase().includes(s)) ||
          (log.serial_no != null && String(log.serial_no).includes(s)) ||
          changesText.includes(s);
        if (!matched) return false;
      }
      return true;
    });
  }, [logList, q, actionFilter]);

  const actionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act === "INSERT" || act === "CREATE") {
      return (
        <span className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider bg-st-green/10 text-st-green border border-st-green/30">
          {t("audit_insert")}
        </span>
      );
    }
    if (act === "UPDATE") {
      return (
        <span className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/30">
          {t("audit_update")}
        </span>
      );
    }
    if (act === "DELETE") {
      return (
        <span className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive/30">
          {t("audit_delete")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border">
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-4 p-2 sm:p-3 md:px-4 md:py-3 w-full max-w-none">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">{t("audit_title")}</h1>
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              <History className="size-3" /> {t("audit_system_logs")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{t("audit_subtitle")}</p>
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          {t("showing")} <strong>{filteredLogs.length}</strong> {t("of")}{" "}
          <strong>{logList.length}</strong> {t("audit_showing_events")}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border bg-card p-3 shadow-panel">
        <div className="relative flex-1 min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder={t("audit_search_placeholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 text-xs pl-8 rtl:pl-3 rtl:pr-8 pr-8"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <select
          className="h-9 rounded-md border border-input bg-background px-2.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="">{t("audit_all_actions")}</option>
          <option value="INSERT">{t("audit_insert")}</option>
          <option value="UPDATE">{t("audit_update")}</option>
          <option value="DELETE">{t("audit_delete")}</option>
        </select>

        {(q || actionFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              setActionFilter("");
            }}
            className="h-9 text-xs text-muted-foreground hover:text-destructive px-2"
          >
            <X className="mr-1 size-3.5" /> {t("clear_filters")}
          </Button>
        )}
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto rounded-lg border bg-card shadow-panel">
        <table className="w-full text-xs min-w-[700px]">
          <thead className="bg-table-head text-left rtl:text-right text-muted-foreground border-b select-none">
            <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:font-semibold">
              <th className="w-36">{t("audit_timestamp")}</th>
              <th className="w-48">{t("audit_actor")}</th>
              <th className="w-24">{t("audit_action")}</th>
              <th className="w-24">{t("audit_record_no")}</th>
              <th>{t("audit_changes")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  <div className="inline-block size-5 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
                  <div>{t("audit_loading")}</div>
                </td>
              </tr>
            )}

            {!isLoading && filteredLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  {t("audit_no_logs")}
                </td>
              </tr>
            )}

            {filteredLogs.map((a) => (
              <tr
                key={a.id}
                className="border-t align-top hover:bg-row-hover/50 [&>td]:px-3 [&>td]:py-2.5"
              >
                <td className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()}
                </td>
                <td className="font-mono text-[11px] text-foreground font-medium">
                  {a.actor_email ?? (
                    <span className="italic text-muted-foreground">{t("system_user")}</span>
                  )}
                </td>
                <td>{actionBadge(a.action)}</td>
                <td>
                  {a.serial_no != null ? (
                    <span className="font-mono font-bold text-primary">#{a.serial_no}</span>
                  ) : (
                    <span className="text-muted-foreground font-mono">—</span>
                  )}
                </td>
                <td>
                  {a.changes && typeof a.changes === "object" ? (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(
                        a.changes as Record<string, { from?: unknown; to?: unknown } | unknown>,
                      ).map(([k, v]) => (
                        <div
                          key={k}
                          className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-1 font-mono text-[11px] border"
                        >
                          <span className="font-semibold text-muted-foreground">{k}:</span>{" "}
                          {v && typeof v === "object" && "to" in v ? (
                            <span>
                              <span className="line-through text-destructive/80 opacity-70">
                                {String(v.from ?? "—")}
                              </span>{" "}
                              <span className="text-primary font-bold">→</span>{" "}
                              <span className="text-st-green font-bold">{String(v.to ?? "—")}</span>
                            </span>
                          ) : (
                            <span className="text-foreground">{String(v ?? "—")}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">{t("no_payload")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
