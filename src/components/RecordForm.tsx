import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Lock, Globe, Building2 } from "lucide-react";
import { neonDb } from "@/lib/neon-client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CURRENCIES,
  MEDICAL_STATES,
  VISA_STATUSES,
  PAYMENT_STATES,
  allowedPaymentStates,
  canEditFinancials,
  isSuperAdmin,
  isAdmin,
  recordSchema,
  type AppRole,
  type RecordRow,
  type CountryRow,
  type AgencyRow,
} from "@/lib/records";
import { useI18n } from "@/lib/i18n";

const empty = {
  sponsor_name: "",
  sponsor_id: "",
  phone: "",
  worker_name: "",
  passport_no: "",
  visa_no: "",
  musaned_no: "",
  city: "",
  country_id: "",
  agency_id: "",
  medical: "PENDING",
  payment_state: "PENDING",
  visa_status: "WKALA",
  amount: "0",
  currency: "SAR",
  transaction_date: new Date().toISOString().slice(0, 10),
  processing_date: "",
  airport: "",
  reserved: "",
  notes: "",
};
type FormState = typeof empty;

function toForm(r: RecordRow): FormState {
  const f = {} as Record<string, string>;
  for (const k of Object.keys(empty)) {
    const val = (r as unknown as Record<string, unknown>)[k];
    f[k] = val == null ? "" : String(val);
  }
  return f as FormState;
}

const selectCls =
  "h-9 w-full rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

export function RecordForm({
  open,
  onOpenChange,
  record,
  role,
  assignedCountryIds,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  record: RecordRow | null;
  role: AppRole | null;
  assignedCountryIds?: string[];
  onSaved: () => void;
}) {
  const { t, isAr } = useI18n();
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [countries, setCountries] = useState<CountryRow[]>([]);

  const finLocked = !!record && !canEditFinancials(role, record);
  const payOptions = finLocked ? PAYMENT_STATES : allowedPaymentStates(role);

  // Load countries & agencies
  useEffect(() => {
    async function fetchCountries() {
      const { data } = await neonDb.from("countries").select("*");
      if (data) {
        setCountries(data);
      }
    }
    if (open) {
      fetchCountries();
    }
  }, [open]);

  // Territories accessible to this user
  const availableCountries = useMemo(() => {
    if (isSuperAdmin(role)) return countries;
    if (isAdmin(role) && assignedCountryIds && assignedCountryIds.length > 0) {
      return countries.filter((c) => assignedCountryIds.includes(c.id));
    }
    return countries;
  }, [countries, role, assignedCountryIds]);

  // Current selected country's agencies
  const currentAgencies = useMemo(() => {
    if (!form.country_id) return [];
    const c = countries.find((item) => item.id === form.country_id);
    return c?.agencies || [];
  }, [countries, form.country_id]);

  useEffect(() => {
    if (record) {
      setForm(toForm(record));
    } else {
      // Default to the first available country if only 1 is assigned to Admin
      const initialCountryId =
        isAdmin(role) && assignedCountryIds && assignedCountryIds.length === 1
          ? assignedCountryIds[0]
          : "";

      setForm({
        ...empty,
        country_id: initialCountryId || "",
        transaction_date: new Date().toISOString().slice(0, 10),
      });
    }
    setErrors({});
  }, [record, open, role, assignedCountryIds]);

  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const val = e.target.value;
      setForm((f) => {
        const next = { ...f, [k]: val };
        // Reset agency selection if country changes
        if (k === "country_id" && val !== f.country_id) {
          next.agency_id = "";
        }
        return next;
      });
      if (errors[k]) setErrors((errs) => ({ ...errs, [k]: "" }));
    };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = recordSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      return;
    }
    const payload = Object.fromEntries(
      Object.entries(parsed.data).map(([k, v]) => [k, v === "" ? null : v]),
    );
    if (finLocked) {
      delete payload["payment_state"];
      delete payload["amount"];
      delete payload["currency"];
    }
    setSaving(true);
    const { error } = record
      ? await neonDb
          .from("records")
          .update(payload as never)
          .eq("id", record.id)
      : await neonDb.from("records").insert(payload as never);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      record ? `${t("form_success_update")} #${record.serial_no}` : t("form_success_create"),
    );
    onSaved();
    onOpenChange(false);
  }

  const F = ({
    k,
    label,
    children,
    span,
  }: {
    k: string;
    label: string;
    children?: React.ReactNode;
    span?: boolean;
  }) => (
    <div className={span ? "space-y-1 sm:col-span-2" : "space-y-1"}>
      <Label htmlFor={k} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children ?? (
        <Input
          id={k}
          value={form[k as keyof FormState]}
          onChange={set(k as keyof FormState)}
          aria-invalid={!!errors[k]}
          className="text-xs h-9"
        />
      )}
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {record ? `${t("form_edit_title")} #${record.serial_no}` : t("form_new_title")}
          </DialogTitle>
          {record && (
            <DialogDescription className="text-xs">
              {t("form_added_by")} {record.created_by_email ?? t("system_user")} ·{" "}
              {new Date(record.created_at).toLocaleString(isAr ? "ar-SA" : "en-US")}
              {record.updated_by_email &&
                ` — ${t("form_last_updated")} ${record.updated_by_email} · ${new Date(record.updated_at).toLocaleString(isAr ? "ar-SA" : "en-US")}`}
            </DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={save} className="space-y-5">
          {/* Multi-Tenant Country & Agency Section */}
          <section className="grid gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3.5 sm:grid-cols-2">
            <div className="sm:col-span-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <Globe className="size-3.5" /> {t("form_scope_title")}
              </h3>
              {isAdmin(role) && (
                <span className="text-[10px] text-muted-foreground bg-background px-2 py-0.5 rounded border">
                  {t("form_scope_admin_badge")}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="country_id" className="text-xs font-medium">
                {t("form_country_label")}
              </Label>
              <select
                id="country_id"
                className={selectCls}
                value={form.country_id}
                onChange={set("country_id")}
                aria-invalid={!!errors["country_id"]}
              >
                <option value="">{t("form_select_country")}</option>
                {availableCountries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.country_code})
                  </option>
                ))}
              </select>
              {errors["country_id"] && (
                <p className="text-xs text-destructive">{errors["country_id"]}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="agency_id" className="text-xs font-medium">
                {t("form_agency_label")}
              </Label>
              <select
                id="agency_id"
                className={selectCls}
                value={form.agency_id}
                onChange={set("agency_id")}
                aria-invalid={!!errors["agency_id"]}
                disabled={!form.country_id}
              >
                <option value="">{t("form_select_agency")}</option>
                {currentAgencies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} {a.license_no ? `[${a.license_no}]` : ""}
                  </option>
                ))}
              </select>
              {errors["agency_id"] && (
                <p className="text-xs text-destructive">{errors["agency_id"]}</p>
              )}
            </div>
          </section>

          {/* Sponsor Details */}
          <section className="grid gap-3 sm:grid-cols-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:col-span-3">
              {t("sec_sponsor")}
            </h3>
            <div className="sm:col-span-2">
              {F({
                k: "sponsor_name",
                label: t("form_sponsor_name"),
                children: (
                  <Input
                    id="sponsor_name"
                    dir="auto"
                    value={form.sponsor_name}
                    onChange={set("sponsor_name")}
                    aria-invalid={!!errors["sponsor_name"]}
                    className="text-xs h-9"
                  />
                ),
              })}
            </div>
            {F({ k: "sponsor_id", label: t("form_sponsor_id") })}
            {F({ k: "phone", label: t("form_phone") })}
            {F({
              k: "city",
              label: t("form_city"),
              children: (
                <Input
                  id="city"
                  dir="auto"
                  value={form.city}
                  onChange={set("city")}
                  className="text-xs h-9"
                />
              ),
            })}
          </section>

          {/* Worker & Visa Details */}
          <section className="grid gap-3 sm:grid-cols-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:col-span-3">
              {t("sec_worker")}
            </h3>
            <div className="sm:col-span-2">
              {F({ k: "worker_name", label: t("form_worker_name") })}
            </div>
            {F({ k: "passport_no", label: t("form_passport_no") })}
            {F({ k: "visa_no", label: t("form_visa_no") })}
            {F({ k: "musaned_no", label: t("form_musaned_no") })}
            {F({
              k: "visa_status",
              label: t("form_visa_status"),
              children: (
                <select
                  id="visa_status"
                  className={selectCls}
                  value={form.visa_status}
                  onChange={set("visa_status")}
                >
                  {VISA_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`visa_${s.replace(/ /g, "_")}`, s)}
                    </option>
                  ))}
                </select>
              ),
            })}
            {F({
              k: "medical",
              label: t("form_medical"),
              children: (
                <select
                  id="medical"
                  className={selectCls}
                  value={form.medical}
                  onChange={set("medical")}
                >
                  {MEDICAL_STATES.map((s) => (
                    <option key={s} value={s}>
                      {t(`med_${s}`, s)}
                    </option>
                  ))}
                </select>
              ),
            })}
            {F({ k: "airport", label: t("form_airport") })}
            {F({ k: "reserved", label: t("form_reserved") })}
          </section>

          {/* Financial Section */}
          <section className="grid gap-3 rounded-md border bg-muted/40 p-3 sm:grid-cols-3">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:col-span-3">
              {t("sec_financial")}{" "}
              {finLocked && (
                <span className="inline-flex items-center gap-1 normal-case tracking-normal text-amber-500">
                  <Lock className="size-3" /> {t("form_financial_locked")}
                </span>
              )}
            </h3>
            {F({
              k: "payment_state",
              label: t("form_payment_state"),
              children: (
                <select
                  id="payment_state"
                  className={selectCls}
                  value={form.payment_state}
                  onChange={set("payment_state")}
                  disabled={finLocked}
                >
                  {payOptions.map((s) => (
                    <option key={s} value={s}>
                      {t(`pay_${s}`, s)}
                    </option>
                  ))}
                </select>
              ),
            })}
            {F({
              k: "amount",
              label: t("form_amount"),
              children: (
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={set("amount")}
                  disabled={finLocked}
                  aria-invalid={!!errors["amount"]}
                  className="text-xs h-9"
                />
              ),
            })}
            {F({
              k: "currency",
              label: t("form_currency"),
              children: (
                <select
                  id="currency"
                  className={selectCls}
                  value={form.currency}
                  onChange={set("currency")}
                  disabled={finLocked}
                >
                  {CURRENCIES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              ),
            })}
            {F({
              k: "transaction_date",
              label: t("form_tx_date"),
              children: (
                <Input
                  id="transaction_date"
                  type="date"
                  value={form.transaction_date}
                  onChange={set("transaction_date")}
                  className="text-xs h-9"
                />
              ),
            })}
            {F({
              k: "processing_date",
              label: t("form_proc_date"),
              children: (
                <Input
                  id="processing_date"
                  type="date"
                  value={form.processing_date}
                  onChange={set("processing_date")}
                  className="text-xs h-9"
                />
              ),
            })}
          </section>

          {F({
            k: "notes",
            label: t("form_notes"),
            span: true,
            children: (
              <Textarea
                id="notes"
                dir="auto"
                rows={3}
                value={form.notes}
                onChange={set("notes")}
                maxLength={2000}
                className="text-xs"
              />
            ),
          })}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("form_cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t("saving") : record ? t("form_submit_save") : t("form_submit_create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
