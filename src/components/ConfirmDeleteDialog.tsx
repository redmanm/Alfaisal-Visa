import React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
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

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  itemName?: string | null;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  itemName,
  onConfirm,
  loading = false,
}: ConfirmDeleteDialogProps) {
  const { t } = useI18n();

  const modalTitle = title || t("confirm_delete_title");
  const modalDescription = description || t("confirm_delete_desc");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[92vw] max-w-md border-destructive/30 shadow-2xl p-6 bg-card text-card-foreground">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive border border-destructive/25 shadow-xs">
            <AlertTriangle className="size-6 text-destructive animate-in zoom-in-75" />
          </div>

          <div className="flex-1 text-center sm:text-left rtl:sm:text-right space-y-2">
            <AlertDialogTitle className="text-base sm:text-lg font-bold text-foreground font-arabic">
              {modalTitle}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {modalDescription}
            </AlertDialogDescription>

            {itemName && (
              <div className="mt-2.5 rounded-md bg-muted/60 p-2.5 text-xs font-mono font-medium text-foreground/90 border border-border/80 truncate select-all">
                {itemName}
              </div>
            )}
          </div>
        </div>

        <AlertDialogFooter className="mt-5 gap-2 sm:gap-2">
          <AlertDialogCancel disabled={loading} className="text-xs font-medium h-9">
            {t("confirm_delete_cancel")}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
            className="text-xs font-bold gap-1.5 h-9 bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm"
          >
            {loading ? (
              <div className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            <span>{t("confirm_delete_btn")}</span>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
