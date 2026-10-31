import React from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export type ExportFormat = "CSV" | "Excel" | "PDF";

interface ConfirmExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  format: ExportFormat;
  recordsCount: number;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function ConfirmExportDialog({
  open,
  onOpenChange,
  format,
  recordsCount,
  onConfirm,
  loading = false,
}: ConfirmExportDialogProps) {
  const { t, isAr } = useI18n();

  const getFormatIcon = () => {
    switch (format) {
      case "Excel":
        return <FileSpreadsheet className="size-6 text-emerald-600 dark:text-emerald-400" />;
      case "PDF":
        return <FileText className="size-6 text-rose-600 dark:text-rose-400" />;
      case "CSV":
      default:
        return <Download className="size-6 text-primary" />;
    }
  };

  const getFormatBadge = () => {
    switch (format) {
      case "Excel":
        return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
      case "PDF":
        return "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";
      case "CSV":
      default:
        return "bg-primary/15 text-primary border-primary/30";
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto max-h-[90vh] overflow-y-auto rounded-2xl border-primary/30 shadow-2xl p-4 sm:p-6 bg-card text-card-foreground">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3.5 sm:gap-4">
          <div className="flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/25 shadow-xs">
            {getFormatIcon()}
          </div>

          <div className="flex-1 text-center sm:text-left rtl:sm:text-right space-y-2 min-w-0">
            <AlertDialogTitle className="text-base sm:text-lg font-bold text-foreground font-arabic flex flex-wrap items-center justify-center sm:justify-start rtl:sm:justify-start gap-2 break-words text-wrap">
              <span>{t("confirm_export_title")}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${getFormatBadge()}`}
              >
                {format}
              </span>
            </AlertDialogTitle>

            <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words text-wrap">
              {isAr
                ? `هل أنت متأكد من رغبتك في تصدير البيانات الحالية بصيغة [${format}]؟`
                : `Are you sure you want to export the current view to [${format}]?`}
            </AlertDialogDescription>

            {/* Scope / Records count badge */}
            <div className="mt-2.5 rounded-lg border bg-muted/40 p-2.5 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
              <span>{t("export_scope_label")}:</span>
              <strong className="text-foreground font-mono font-semibold">
                {recordsCount} {t("records_count")}
              </strong>
            </div>
          </div>
        </div>

        <AlertDialogFooter className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-2 pt-1">
          <AlertDialogCancel
            disabled={loading}
            className="w-full sm:w-auto h-10 sm:h-9 text-xs font-semibold justify-center cursor-pointer"
          >
            {t("confirm_delete_cancel")}
          </AlertDialogCancel>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto h-10 sm:h-9 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm justify-center cursor-pointer"
          >
            {loading ? (
              <div className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Download className="size-3.5" />
            )}
            <span>{t("confirm_download_btn")}</span>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
