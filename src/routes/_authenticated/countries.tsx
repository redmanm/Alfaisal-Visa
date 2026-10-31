import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Globe,
  Building2,
  Plus,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Phone,
  Mail,
  Award,
} from "lucide-react";
import {
  getCountriesServerFn,
  createCountryServerFn,
  deleteCountryServerFn,
  createAgencyServerFn,
  deleteAgencyServerFn,
} from "@/lib/server-api";
import {
  isSuperAdmin,
  normalizeRole,
  type AppRole,
  type CountryRow,
  type AgencyRow,
} from "@/lib/records";
import { getStoredSession } from "@/lib/neon-client";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/countries")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "الدول والوكالات | Countries & Agencies — Fan AlFaisal" },
      { name: "description", content: "إدارة الهيكل الهرمي للدول والوكالات الخارجية للاستقدام." },
    ],
  }),
  component: CountriesPage,
});

function CountriesPage() {
  const context = (Route.useRouteContext() || {}) as Record<string, unknown>;
  const session = getStoredSession();
  const rawRole =
    session?.user?.role ||
    session?.user?.user_metadata?.role ||
    (context.role as string | undefined);
  const role: AppRole = normalizeRole(rawRole) ?? "STAFF";
  const { t } = useI18n();
  const qc = useQueryClient();

  // Modals state
  const [createCountryOpen, setCreateCountryOpen] = useState(false);
  const [createAgencyOpen, setCreateAgencyOpen] = useState(false);
  const [targetCountry, setTargetCountry] = useState<CountryRow | null>(null);

  // Form states for Country creation
  const [countryName, setCountryName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [initialAgencyName, setInitialAgencyName] = useState("");
  const [initialAgencyLicense, setInitialAgencyLicense] = useState("");
  const [initialAgencyPhone, setInitialAgencyPhone] = useState("");
  const [initialAgencyEmail, setInitialAgencyEmail] = useState("");

  // Form states for Agency creation
  const [agencyName, setAgencyName] = useState("");
  const [agencyLicense, setAgencyLicense] = useState("");
  const [agencyPhone, setAgencyPhone] = useState("");
  const [agencyEmail, setAgencyEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Fetch Countries with their Agencies
  const { data: countries = [], isLoading } = useQuery({
    queryKey: ["countries-hierarchy"],
    queryFn: async () => {
      const res = await getCountriesServerFn();
      if (res.error) throw new Error(res.error);
      return res.data as CountryRow[];
    },
    enabled: isSuperAdmin(role),
  });

  const countryList = useMemo(() => (Array.isArray(countries) ? countries : []), [countries]);
  const totalAgencies = useMemo(
    () => countryList.reduce((acc, c) => acc + (c.agencies?.length ?? 0), 0),
    [countryList],
  );

  // Delete Country Modal State
  const [deleteCountryOpen, setDeleteCountryOpen] = useState(false);
  const [countryToDelete, setCountryToDelete] = useState<CountryRow | null>(null);
  const [isDeletingCountry, setIsDeletingCountry] = useState(false);

  // Delete Agency Modal State
  const [deleteAgencyOpen, setDeleteAgencyOpen] = useState(false);
  const [agencyToDelete, setAgencyToDelete] = useState<{
    agency: AgencyRow;
    country: CountryRow;
  } | null>(null);
  const [isDeletingAgency, setIsDeletingAgency] = useState(false);

  if (!isSuperAdmin(role)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="size-12 text-destructive mb-3" />
        <h2 className="text-lg font-bold">{t("access_restricted")}</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-md">
          {t("access_restricted_countries_desc")}
        </p>
      </div>
    );
  }

  // Handle Add Country Submission
  async function handleCreateCountry(e: React.FormEvent) {
    e.preventDefault();
    if (!countryName.trim() || !countryCode.trim() || !initialAgencyName.trim()) {
      toast.error(t("fill_required_err"));
      return;
    }

    setSubmitting(true);
    const res = await createCountryServerFn({
      data: {
        name: countryName,
        countryCode: countryCode,
        initialAgencyName: initialAgencyName,
        initialAgencyLicense: initialAgencyLicense,
        initialAgencyPhone: initialAgencyPhone,
        initialAgencyEmail: initialAgencyEmail,
        userRole: role,
      },
    });
    setSubmitting(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    toast.success(t("country_created_success"));
    setCreateCountryOpen(false);
    setCountryName("");
    setCountryCode("");
    setInitialAgencyName("");
    setInitialAgencyLicense("");
    setInitialAgencyPhone("");
    setInitialAgencyEmail("");
    qc.invalidateQueries({ queryKey: ["countries-hierarchy"] });
  }

  // Handle Add Agency Submission
  async function handleCreateAgency(e: React.FormEvent) {
    e.preventDefault();
    if (!targetCountry || !agencyName.trim()) {
      toast.error(t("fill_required_err"));
      return;
    }

    setSubmitting(true);
    const res = await createAgencyServerFn({
      data: {
        name: agencyName,
        countryId: targetCountry.id,
        licenseNo: agencyLicense,
        phone: agencyPhone,
        email: agencyEmail,
        userRole: role,
      },
    });
    setSubmitting(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    toast.success(t("agency_created_success"));
    setCreateAgencyOpen(false);
    setAgencyName("");
    setAgencyLicense("");
    setAgencyPhone("");
    setAgencyEmail("");
    qc.invalidateQueries({ queryKey: ["countries-hierarchy"] });
  }

  function requestDeleteCountry(country: CountryRow) {
    setCountryToDelete(country);
    setDeleteCountryOpen(true);
  }

  async function handleConfirmDeleteCountry() {
    if (!countryToDelete) return;
    setIsDeletingCountry(true);
    try {
      const res = await deleteCountryServerFn({
        data: { id: countryToDelete.id, userRole: role },
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(t("country_deleted_success"));
      setDeleteCountryOpen(false);
      setCountryToDelete(null);
      qc.invalidateQueries({ queryKey: ["countries-hierarchy"] });
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsDeletingCountry(false);
    }
  }

  function requestDeleteAgency(agency: AgencyRow, country: CountryRow) {
    if (country.agencies && country.agencies.length <= 1) {
      toast.error(t("country_agency_rule_err"));
      return;
    }
    setAgencyToDelete({ agency, country });
    setDeleteAgencyOpen(true);
  }

  async function handleConfirmDeleteAgency() {
    if (!agencyToDelete) return;
    setIsDeletingAgency(true);
    try {
      const res = await deleteAgencyServerFn({
        data: {
          id: agencyToDelete.agency.id,
          countryId: agencyToDelete.country.id,
          userRole: role,
        },
      });

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(t("agency_deleted_success"));
      setDeleteAgencyOpen(false);
      setAgencyToDelete(null);
      qc.invalidateQueries({ queryKey: ["countries-hierarchy"] });
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsDeletingAgency(false);
    }
  }

  return (
    <div className="space-y-5 px-2 sm:px-4 md:px-6 py-3 sm:py-4 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight font-arabic">
              {t("hierarchy_title")}
            </h1>
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              <Globe className="size-3" /> {t("multi_tenant_badge")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{t("hierarchy_subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-md border bg-card px-2.5 py-1 shadow-xs">
            {t("countries_count")}:{" "}
            <strong className="font-mono text-primary">{countryList.length}</strong>
          </span>
          <span className="rounded-md border bg-card px-2.5 py-1 shadow-xs">
            {t("agencies_count")}:{" "}
            <strong className="font-mono text-foreground">{totalAgencies}</strong>
          </span>
          <Button
            size="sm"
            onClick={() => setCreateCountryOpen(true)}
            className="gap-1.5 h-8 text-xs shadow-panel w-full sm:w-auto mt-1 sm:mt-0"
          >
            <Plus className="size-3.5" /> {t("new_country")}
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="p-12 text-center text-xs text-muted-foreground">{t("loading")}</div>
      )}

      {/* Grid of Countries and their Agencies */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {countryList.map((c) => (
          <div
            key={c.id}
            className="flex flex-col justify-between rounded-xl border bg-card shadow-panel overflow-hidden"
          >
            {/* Country Header */}
            <div className="flex items-center justify-between border-b bg-muted/30 px-3 sm:px-4 py-3 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="grid size-8 place-items-center rounded-lg bg-primary/10 font-bold text-primary font-mono text-xs shrink-0">
                  {c.country_code}
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm text-foreground truncate">
                    {c.name}
                  </h3>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {t("country_code_title")}{" "}
                    <span className="font-mono font-semibold">{c.country_code}</span> ·{" "}
                    {c.agencies?.length ?? 0} {t("agencies_count")}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTargetCountry(c);
                    setCreateAgencyOpen(true);
                  }}
                  className="h-7 text-[11px] gap-1 px-2"
                >
                  <Plus className="size-3" /> {t("new_agency")}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => requestDeleteCountry(c)}
                  className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title={t("delete_country_tooltip")}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Agencies List */}
            <div className="p-3 sm:p-4 flex-1 space-y-2.5">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="size-3.5" /> {t("linked_agencies_label")}
              </div>

              <div className="space-y-2">
                {c.agencies?.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-start justify-between rounded-lg border bg-background p-2.5 text-xs transition-colors hover:border-primary/30 gap-2"
                  >
                    <div className="space-y-1 min-w-0 pr-1">
                      <div className="font-semibold text-foreground text-xs leading-snug">
                        {a.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                        {a.license_no && (
                          <span className="flex items-center gap-1">
                            <Award className="size-2.5 text-primary" /> {a.license_no}
                          </span>
                        )}
                        {a.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="size-2.5" /> {a.phone}
                          </span>
                        )}
                        {a.email && (
                          <span className="flex items-center gap-1 font-mono">
                            <Mail className="size-2.5" /> {a.email}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => requestDeleteAgency(a, c)}
                      className="size-6 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title={t("delete_agency_tooltip")}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom info */}
            <div className="border-t bg-muted/10 px-3 sm:px-4 py-2 text-[10px] text-muted-foreground flex items-center justify-between">
              <span>{t("rule_country_agency")}</span>
              <span className="font-mono text-primary font-bold">{t("country_status_active")}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal 1: Create Country (With Initial Agency) */}
      <Dialog open={createCountryOpen} onOpenChange={setCreateCountryOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold break-words text-wrap">
              {t("new_country")}
            </DialogTitle>
            <DialogDescription className="text-xs break-words text-wrap leading-relaxed">
              {t("country_dialog_desc")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCountry} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("country_name_label")} *</Label>
                <Input
                  value={countryName}
                  onChange={(e) => setCountryName(e.target.value)}
                  placeholder={t("country_name_label")}
                  className="text-xs h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("country_code_label")} *</Label>
                <Input
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                  placeholder="LK"
                  maxLength={5}
                  className="text-xs h-9 font-mono uppercase"
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/40 p-3 space-y-2.5">
              <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Building2 className="size-3.5" /> {t("initial_agency_required")}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{t("agency_name_label")} *</Label>
                <Input
                  value={initialAgencyName}
                  onChange={(e) => setInitialAgencyName(e.target.value)}
                  placeholder={t("agency_name_label")}
                  className="text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{t("license_no")}</Label>
                  <Input
                    value={initialAgencyLicense}
                    onChange={(e) => setInitialAgencyLicense(e.target.value)}
                    placeholder="LK-REC-2025"
                    className="text-xs h-9 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("phone")}</Label>
                  <Input
                    value={initialAgencyPhone}
                    onChange={(e) => setInitialAgencyPhone(e.target.value)}
                    placeholder="+94 11 234 5678"
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{t("email")}</Label>
                <Input
                  type="email"
                  value={initialAgencyEmail}
                  onChange={(e) => setInitialAgencyEmail(e.target.value)}
                  placeholder="contact@agency.lk"
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateCountryOpen(false)}
                className="w-full sm:w-auto h-10 sm:h-9 text-xs font-semibold cursor-pointer"
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto h-10 sm:h-9 text-xs font-bold cursor-pointer"
              >
                {submitting ? t("saving") : t("new_country")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Create Additional Agency */}
      <Dialog open={createAgencyOpen} onOpenChange={setCreateAgencyOpen}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg font-bold break-words text-wrap">
              {t("new_agency")}
            </DialogTitle>
            <DialogDescription className="text-xs break-words text-wrap leading-relaxed">
              {t("col_country")}: <strong>{targetCountry?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAgency} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">{t("agency_name_label")} *</Label>
              <Input
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                placeholder={t("agency_name_label")}
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("license_no")}</Label>
                <Input
                  value={agencyLicense}
                  onChange={(e) => setAgencyLicense(e.target.value)}
                  placeholder="REC-XXXX-YY"
                  className="text-xs h-9 font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("phone")}</Label>
                <Input
                  value={agencyPhone}
                  onChange={(e) => setAgencyPhone(e.target.value)}
                  placeholder="+251 11 ..."
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t("email")}</Label>
              <Input
                type="email"
                value={agencyEmail}
                onChange={(e) => setAgencyEmail(e.target.value)}
                placeholder="ops@agency.com"
                className="text-xs h-9 font-mono"
              />
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateAgencyOpen(false)}
                className="w-full sm:w-auto h-10 sm:h-9 text-xs font-semibold cursor-pointer"
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto h-10 sm:h-9 text-xs font-bold cursor-pointer"
              >
                {submitting ? t("saving") : t("new_agency")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Safety Confirmation Modal: Country Deletion */}
      <ConfirmDeleteDialog
        open={deleteCountryOpen}
        onOpenChange={setDeleteCountryOpen}
        title={t("confirm_delete_title")}
        description={t("confirm_delete_country")}
        itemName={
          countryToDelete ? `${countryToDelete.name} (${countryToDelete.country_code})` : null
        }
        onConfirm={handleConfirmDeleteCountry}
        loading={isDeletingCountry}
      />

      {/* Safety Confirmation Modal: Agency Deletion */}
      <ConfirmDeleteDialog
        open={deleteAgencyOpen}
        onOpenChange={setDeleteAgencyOpen}
        title={t("confirm_delete_title")}
        description={t("confirm_delete_agency")}
        itemName={
          agencyToDelete ? `${agencyToDelete.agency.name} — ${agencyToDelete.country.name}` : null
        }
        onConfirm={handleConfirmDeleteAgency}
        loading={isDeletingAgency}
      />
    </div>
  );
}
