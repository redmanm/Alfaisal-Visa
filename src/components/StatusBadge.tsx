import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export interface StatusBadgeProps {
  value: string | null | undefined;
  paymentState?: string | null | undefined;
  className?: string;
  showDot?: boolean;
}

/**
 * High-contrast, color-coded visual badge / pill component.
 * Strict language separation: Pure Arabic in 'ar' mode, Pure English in 'en' mode.
 * Follows 5 core status color rules:
 * 1. Visa Stamped -> Yellow (#FEF3C7, text: #92400E, border: #FCD34D)
 * 2. TRIB (Completed) -> Green (#DCFCE7, text: #166534, border: #86EFAC)
 * 3. Wekala Paid / PAID -> Blue (#DBEAFE, text: #1E40AF, border: #93C5FD)
 * 4. Wekala Not Paid / PENDING / UNPAID -> Cyan (#CFFAFE, text: #155E75, border: #67E8F9)
 * 5. Canceled -> Red (#FEE2E2, text: #991B1B, border: #FCA5A5)
 */
export function StatusBadge({ value, paymentState, className, showDot = true }: StatusBadgeProps) {
  const { isAr, t } = useI18n();

  if (!value) return null;

  const valUpper = value.trim().toUpperCase();
  const payUpper = paymentState ? paymentState.trim().toUpperCase() : "";

  // 1. Rule 1: Visa Stamped
  if (valUpper === "VISA STAMP" || valUpper === "VISA STAMPED" || valUpper === "STAMPED") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap shadow-xs transition-colors",
          "status-pill-visa-stamped",
          className,
        )}
      >
        {showDot && <span className="size-1.5 rounded-full bg-current shrink-0" />}
        <span>{isAr ? "تأشيرة صادرة" : "Visa Stamped"}</span>
      </span>
    );
  }

  // 2. Rule 2: TRIB (Embassy / Wekala completed)
  if (valUpper === "TRIB") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap shadow-xs transition-colors",
          "status-pill-trib",
          className,
        )}
      >
        {showDot && <span className="size-1.5 rounded-full bg-current shrink-0" />}
        <span>{isAr ? "تدريب مهني معتمد" : "TRIB Completed"}</span>
      </span>
    );
  }

  // 3 & 4. Wekala issued checks (Wekala Paid vs Wekala Not Paid)
  if (valUpper === "WKALA" || valUpper === "WEKALA") {
    const isPaid = payUpper === "PAID";
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap shadow-xs transition-colors",
          isPaid ? "status-pill-wekala-paid" : "status-pill-wekala-unpaid",
          className,
        )}
      >
        {showDot && <span className="size-1.5 rounded-full bg-current shrink-0" />}
        <span>
          {isPaid
            ? isAr
              ? "وكالة مسددة"
              : "Wekala Paid"
            : isAr
              ? "وكالة بانتظار السداد"
              : "Wekala Not Paid"}
        </span>
      </span>
    );
  }

  // 5. Rule 5: Canceled
  if (valUpper === "CANCELLED" || valUpper === "CANCELED") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap shadow-xs transition-colors",
          "status-pill-canceled",
          className,
        )}
      >
        {showDot && <span className="size-1.5 rounded-full bg-current shrink-0" />}
        <span>{isAr ? "ملغية" : "Canceled"}</span>
      </span>
    );
  }

  // Payment states:
  // Rule 3: Wekala Paid / PAID -> Blue
  if (valUpper === "PAID") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap shadow-xs transition-colors",
          "status-pill-wekala-paid",
          className,
        )}
      >
        {showDot && <span className="size-1.5 rounded-full bg-current shrink-0" />}
        <span>{isAr ? "مدفوع" : "Paid"}</span>
      </span>
    );
  }

  // Rule 4: Wekala Not Paid / PENDING / UNPAID -> Cyan
  if (valUpper === "PENDING" || valUpper === "UNPAID") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap shadow-xs transition-colors",
          "status-pill-wekala-unpaid",
          className,
        )}
      >
        {showDot && <span className="size-1.5 rounded-full bg-current shrink-0" />}
        <span>
          {valUpper === "PENDING" ? (isAr ? "معلق" : "Pending") : isAr ? "غير مدفوع" : "Unpaid"}
        </span>
      </span>
    );
  }

  // Medical states:
  if (valUpper === "FIT") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap shadow-xs transition-colors",
          "status-pill-trib",
          className,
        )}
      >
        {showDot && <span className="size-1.5 rounded-full bg-current shrink-0" />}
        <span>{isAr ? "لائق طبياً" : "Fit"}</span>
      </span>
    );
  }

  if (valUpper === "UNFIT") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap shadow-xs transition-colors",
          "status-pill-canceled",
          className,
        )}
      >
        {showDot && <span className="size-1.5 rounded-full bg-current shrink-0" />}
        <span>{isAr ? "غير لائق" : "Unfit"}</span>
      </span>
    );
  }

  // Other visa stages:
  if (valUpper === "EMBASSY") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap shadow-xs transition-colors",
          "bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950/40 dark:text-purple-200 dark:border-purple-600",
          className,
        )}
      >
        {showDot && <span className="size-1.5 rounded-full bg-current shrink-0" />}
        <span>{isAr ? "بالسفارة" : "In Embassy"}</span>
      </span>
    );
  }

  if (valUpper === "BIOMETRIC") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap shadow-xs transition-colors",
          "bg-orange-100 text-orange-800 border border-orange-300 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-600",
          className,
        )}
      >
        {showDot && <span className="size-1.5 rounded-full bg-current shrink-0" />}
        <span>{isAr ? "بصمة حيوية" : "Biometrics"}</span>
      </span>
    );
  }

  if (valUpper === "ARRIVED") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap shadow-xs transition-colors",
          "bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-600",
          className,
        )}
      >
        {showDot && <span className="size-1.5 rounded-full bg-current shrink-0" />}
        <span>{isAr ? "تم الوصول" : "Arrived"}</span>
      </span>
    );
  }

  if (valUpper === "PARTIAL") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap shadow-xs transition-colors",
          "bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-600",
          className,
        )}
      >
        {showDot && <span className="size-1.5 rounded-full bg-current shrink-0" />}
        <span>{isAr ? "سداد جزئي" : "Partial"}</span>
      </span>
    );
  }

  // Fallback neutral badge - check if translation key exists
  const translatedVal = t(
    `visa_${valUpper.replace(/ /g, "_")}`,
    t(`pay_${valUpper}`, t(`med_${valUpper}`, value)),
  );

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide whitespace-nowrap shadow-xs transition-colors",
        "bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800/40 dark:text-slate-200 dark:border-slate-600",
        className,
      )}
    >
      {showDot && <span className="size-1.5 rounded-full bg-current shrink-0" />}
      <span>{translatedVal}</span>
    </span>
  );
}
