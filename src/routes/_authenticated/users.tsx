import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Search,
  Plus,
  Trash2,
  Globe,
  Settings,
} from "lucide-react";
import {
  getAdminsServerFn,
  createAdminServerFn,
  updateAdminCountriesServerFn,
  deleteAdminServerFn,
  getCountriesServerFn,
} from "@/lib/server-api";
import {
  isSuperAdmin,
  normalizeRole,
  type AppRole,
  type CountryRow,
  type AdminUser,
} from "@/lib/records";
import { getStoredSession } from "@/integrations/supabase/client";
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

export const Route = createFileRoute("/_authenticated/users")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "إدارة المشرفين والصلاحيات | Access Controls — Fan AlFaisal" },
      { name: "description", content: "إدارة حسابات المشرفين وتخصيص الدول في المنظومة." },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const context = (Route.useRouteContext() || {}) as Record<string, unknown>;
  const session = getStoredSession();
  const user = session?.user || (context.user as AdminUser | undefined);
  const rawRole = user?.role || user?.user_metadata?.role || (context.role as string | undefined);
  const role: AppRole = normalizeRole(rawRole) ?? "STAFF";
  const { t } = useI18n();
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [editCountryOpen, setEditCountryOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);

  // Form states for creating Admin
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "STAFF">("ADMIN");
  const [newSelectedCountryIds, setNewSelectedCountryIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form state for editing countries
  const [editCountryIds, setEditCountryIds] = useState<string[]>([]);

  // Delete confirmation modal state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<AdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Admins list
  const { data: adminList = [], isLoading } = useQuery({
    queryKey: ["admins-list"],
    queryFn: async () => {
      const res = await getAdminsServerFn({ data: { userRole: role } });
      if (res.error) throw new Error(res.error);
      return res.data as AdminUser[];
    },
    enabled: isSuperAdmin(role),
  });

  // Fetch Countries list
  const { data: countries = [] } = useQuery({
    queryKey: ["countries-list"],
    queryFn: async () => {
      const res = await getCountriesServerFn();
      if (res.error) throw new Error(res.error);
      return res.data as CountryRow[];
    },
    enabled: isSuperAdmin(role),
  });

  const userList = useMemo(() => (Array.isArray(adminList) ? adminList : []), [adminList]);
  const countryList = useMemo(() => (Array.isArray(countries) ? countries : []), [countries]);

  const filteredUsers = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return userList;
    return userList.filter(
      (p) =>
        (p.full_name && p.full_name.toLowerCase().includes(s)) ||
        (p.email && p.email.toLowerCase().includes(s)) ||
        (p.role && p.role.toLowerCase().includes(s)),
    );
  }, [userList, q]);

  if (!isSuperAdmin(role)) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
        <ShieldAlert className="size-12 text-destructive mb-3" />
        <h2 className="text-lg font-bold">{t("access_restricted")}</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-md">
          {t("access_restricted_users_desc")}
        </p>
      </div>
    );
  }

  // Handle Create Admin Submission
  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast.error(t("fill_required_err"));
      return;
    }
    if (newRole === "ADMIN" && newSelectedCountryIds.length === 0) {
      toast.error(t("admin_requires_country"));
      return;
    }

    setSubmitting(true);
    const res = await createAdminServerFn({
      data: {
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
        countryIds: newSelectedCountryIds,
        userRole: role,
      },
    });
    setSubmitting(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    toast.success(t("user_created_success"));
    setCreateOpen(false);
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setNewSelectedCountryIds([]);
    qc.invalidateQueries({ queryKey: ["admins-list"] });
  }

  // Handle Update Country Assignment
  async function handleUpdateCountries(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAdmin) return;
    if (editCountryIds.length === 0) {
      toast.error(t("admin_requires_country"));
      return;
    }

    setSubmitting(true);
    const res = await updateAdminCountriesServerFn({
      data: {
        userId: selectedAdmin.id,
        countryIds: editCountryIds,
        userRole: role,
      },
    });
    setSubmitting(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    toast.success(t("assignment_updated_success"));
    setEditCountryOpen(false);
    qc.invalidateQueries({ queryKey: ["admins-list"] });
  }

  function requestDeleteAdmin(adminUser: AdminUser) {
    if (adminUser.id === user.id) {
      toast.error(t("cannot_delete_self"));
      return;
    }
    setAdminToDelete(adminUser);
    setDeleteDialogOpen(true);
  }

  async function handleConfirmDeleteAdmin() {
    if (!adminToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteAdminServerFn({
        data: { userId: adminToDelete.id, userRole: role },
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(t("user_deleted_success"));
      setDeleteDialogOpen(false);
      setAdminToDelete(null);
      qc.invalidateQueries({ queryKey: ["admins-list"] });
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsDeleting(false);
    }
  }

  const superAdminCount = userList.filter((u) => u.role === "SUPER_ADMIN").length;
  const adminCount = userList.filter((u) => u.role === "ADMIN").length;
  const staffCount = userList.filter((u) => u.role === "STAFF").length;

  return (
    <div className="space-y-5 p-2 sm:p-3 md:px-4 md:py-3 w-full max-w-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight font-arabic">
              {t("admins_title")}
            </h1>
            <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20">
              <ShieldCheck className="size-3" /> {t("role_super_admin")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{t("admins_subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-md border bg-card px-2.5 py-1 shadow-xs">
            {t("super_admins_count")}{" "}
            <strong className="font-mono text-amber-500">{superAdminCount}</strong>
          </span>
          <span className="rounded-md border bg-card px-2.5 py-1 shadow-xs">
            {t("admins_count")} <strong className="font-mono text-blue-500">{adminCount}</strong>
          </span>
          <span className="rounded-md border bg-card px-2.5 py-1 shadow-xs">
            {t("staff_count")} <strong className="font-mono text-emerald-500">{staffCount}</strong>
          </span>
          <Button
            size="sm"
            onClick={() => {
              setNewSelectedCountryIds(countryList[0] ? [countryList[0].id] : []);
              setCreateOpen(true);
            }}
            className="gap-1.5 h-8 text-xs shadow-panel w-full sm:w-auto mt-1 sm:mt-0"
          >
            <Plus className="size-3.5" /> {t("new_admin")}
          </Button>
        </div>
      </div>

      {/* Hierarchy Rule Callout Box */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <div className="flex items-center gap-1.5 font-bold text-amber-500">
            <ShieldCheck className="size-4" /> {t("role_card_super_title")}
          </div>
          <p className="text-muted-foreground mt-1 leading-relaxed">{t("role_card_super_desc")}</p>
        </div>

        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
          <div className="flex items-center gap-1.5 font-bold text-blue-500">
            <Shield className="size-4" /> {t("role_card_admin_title")}
          </div>
          <p className="text-muted-foreground mt-1 leading-relaxed">{t("role_card_admin_desc")}</p>
        </div>

        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="flex items-center gap-1.5 font-bold text-emerald-500">
            <UserCheck className="size-4" /> {t("role_card_staff_title")}
          </div>
          <p className="text-muted-foreground mt-1 leading-relaxed">{t("role_card_staff_desc")}</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder={t("users_search_placeholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 text-xs pl-8 rtl:pl-3 rtl:pr-8"
          />
        </div>
      </div>

      {/* Users Responsive List / Table */}
      <div className="space-y-3">
        {isLoading && (
          <div className="p-8 text-center text-xs text-muted-foreground">{t("users_loading")}</div>
        )}

        {/* 1. Mobile Card View (Phones & Small Tablets) */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {filteredUsers.map((p) => {
            const isSelf = user?.id ? p.id === user.id : false;
            const initials = (p.full_name || p.email || "U").slice(0, 2).toUpperCase();

            return (
              <div
                key={p.id}
                className="rounded-xl border bg-card p-3.5 space-y-3 shadow-panel text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary font-mono text-xs">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground truncate">
                        <span>{p.full_name || p.email}</span>
                        {isSelf && (
                          <span className="rounded bg-muted px-1.5 py-0.2 text-[9px] text-muted-foreground font-semibold">
                            {t("badge_your_account")}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono truncate">
                        {p.email}
                      </div>
                    </div>
                  </div>

                  <div>
                    {p.role === "SUPER_ADMIN" ? (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-500 border border-amber-500/30">
                        <ShieldCheck className="size-2.5" /> {t("role_super_admin")}
                      </span>
                    ) : p.role === "ADMIN" ? (
                      <span className="inline-flex items-center gap-1 rounded bg-blue-500/15 px-1.5 py-0.5 text-[9px] font-bold text-blue-500 border border-blue-500/30">
                        <Shield className="size-2.5" /> {t("role_admin")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-500 border border-emerald-500/30">
                        <UserCheck className="size-2.5" /> {t("role_staff")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Country scope tags */}
                <div className="rounded-lg bg-muted/40 p-2 space-y-1">
                  <div className="text-[10px] text-muted-foreground font-medium">
                    {t("assigned_countries_label")}:
                  </div>
                  {p.role === "SUPER_ADMIN" ? (
                    <span className="text-[11px] text-amber-500 font-medium">
                      {t("scope_all_full")}
                    </span>
                  ) : p.role === "STAFF" ? (
                    <span className="text-[11px] text-emerald-500 font-medium">
                      {t("scope_all_readonly")}
                    </span>
                  ) : p.assigned_countries && p.assigned_countries.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {p.assigned_countries.map((c) => (
                        <span
                          key={c.id}
                          className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-500 border border-blue-500/20"
                        >
                          <Globe className="size-2.5" />
                          {(c.name || "").split(" ")[0]} ({c.country_code || ""})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-destructive font-semibold">
                      {t("scope_warning_no_country")}
                    </span>
                  )}
                </div>

                {/* Mobile Card Actions */}
                <div className="flex items-center justify-between border-t pt-2 gap-2">
                  {p.role === "ADMIN" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedAdmin(p);
                        setEditCountryIds(p.assigned_country_ids ?? []);
                        setEditCountryOpen(true);
                      }}
                      className="h-8 text-xs gap-1.5 flex-1"
                    >
                      <Settings className="size-3.5" /> {t("assign_countries")}
                    </Button>
                  )}

                  {!isSelf && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => requestDeleteAdmin(p)}
                      className="h-8 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5 mr-1" /> {t("delete_user_btn")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 2. Desktop Table View (Desktop screens >= md) */}
        <div className="hidden md:block overflow-hidden rounded-lg border bg-card shadow-panel">
          <div className="bg-table-head px-4 py-2.5 border-b text-xs font-semibold text-muted-foreground grid grid-cols-12 gap-2 select-none">
            <div className="col-span-4 sm:col-span-3">{t("col_user_email")}</div>
            <div className="col-span-2">{t("col_role")}</div>
            <div className="col-span-4 sm:col-span-5">{t("col_assigned_countries")}</div>
            <div className="col-span-2 text-right rtl:text-left">{t("col_admin_actions")}</div>
          </div>

          <div className="divide-y divide-border">
            {filteredUsers.map((p) => {
              const isSelf = user?.id ? p.id === user.id : false;
              const initials = (p.full_name || p.email || "U").slice(0, 2).toUpperCase();

              return (
                <div
                  key={p.id}
                  className="grid grid-cols-12 items-center px-4 py-3 text-xs gap-2 transition-colors hover:bg-row-hover/50"
                >
                  {/* User info */}
                  <div className="col-span-4 sm:col-span-3 flex items-center gap-2.5 min-w-0 pr-1">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary font-mono text-xs">
                      {initials}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-medium truncate text-foreground">
                        <span>{p.full_name || p.email}</span>
                        {isSelf && (
                          <span className="rounded bg-muted px-1.5 py-0.2 text-[9px] text-muted-foreground font-semibold">
                            {t("badge_your_account")}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate font-mono">
                        {p.email}
                      </div>
                    </div>
                  </div>

                  {/* Role */}
                  <div className="col-span-2">
                    {p.role === "SUPER_ADMIN" ? (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/30">
                        <ShieldCheck className="size-3" /> {t("role_super_admin")}
                      </span>
                    ) : p.role === "ADMIN" ? (
                      <span className="inline-flex items-center gap-1 rounded bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-500 border border-blue-500/30">
                        <Shield className="size-3" /> {t("role_admin")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-500 border border-emerald-500/30">
                        <UserCheck className="size-3" /> {t("role_staff")}
                      </span>
                    )}
                  </div>

                  {/* Assigned Countries */}
                  <div className="col-span-4 sm:col-span-5">
                    {p.role === "SUPER_ADMIN" ? (
                      <span className="text-[11px] text-amber-500 font-medium">
                        {t("scope_all_full")}
                      </span>
                    ) : p.role === "STAFF" ? (
                      <span className="text-[11px] text-emerald-500 font-medium">
                        {t("scope_all_readonly")}
                      </span>
                    ) : p.assigned_countries && p.assigned_countries.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.assigned_countries.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-500 border border-blue-500/20"
                          >
                            <Globe className="size-2.5" />
                            {(c.name || "").split(" ")[0]} ({c.country_code || ""})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-destructive font-semibold">
                        {t("scope_warning_no_country")}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 text-right rtl:text-left flex items-center justify-end gap-1.5">
                    {p.role === "ADMIN" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedAdmin(p);
                          setEditCountryIds(p.assigned_country_ids ?? []);
                          setEditCountryOpen(true);
                        }}
                        className="h-7 text-[11px] gap-1 px-2"
                        title={t("assign_countries")}
                      >
                        <Settings className="size-3" /> {t("assign_countries")}
                      </Button>
                    )}

                    {!isSelf && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => requestDeleteAdmin(p)}
                        className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title={t("delete")}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal 1: Create New Admin (Responsive) */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("user_dialog_title")}</DialogTitle>
            <DialogDescription className="text-xs">{t("user_dialog_desc")}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAdmin} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">{t("auth_full_name")} *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t("auth_full_name")}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t("auth_email")} *</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="admin.office@falfaisal.com"
                className="text-xs h-9 font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t("user_password_label")} *</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="text-xs h-9 font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">{t("user_role_label")} *</Label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "ADMIN" | "STAFF")}
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs focus-visible:outline-none"
              >
                <option value="ADMIN">{t("role_admin")}</option>
                <option value="STAFF">{t("role_staff")}</option>
              </select>
            </div>

            {/* Country Assignment Checkboxes if ADMIN */}
            {newRole === "ADMIN" && (
              <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Globe className="size-3.5" /> {t("select_countries_prompt")}
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {newSelectedCountryIds.length} {t("admin_scope_count")}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {countryList.map((c) => {
                    const checked = newSelectedCountryIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-background/80 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          className="size-4 rounded border accent-primary cursor-pointer"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewSelectedCountryIds((prev) => [...prev, c.id]);
                            } else {
                              setNewSelectedCountryIds((prev) => prev.filter((id) => id !== c.id));
                            }
                          }}
                        />
                        <span className="font-medium text-foreground">
                          {c.name} ({c.country_code})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2 sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("saving") : t("new_admin")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Edit Country Access (Responsive) */}
      <Dialog open={editCountryOpen} onOpenChange={setEditCountryOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("edit_territory_title")}</DialogTitle>
            <DialogDescription className="text-xs">
              {t("edit_territory_desc")} (
              <strong>{selectedAdmin?.full_name || selectedAdmin?.email}</strong>)
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateCountries} className="space-y-4 pt-2">
            <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">
                  {t("select_countries_prompt")}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {t("selected_count_label")} {editCountryIds.length}
                </span>
              </div>

              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {countryList.map((c) => {
                  const checked = editCountryIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-background/80 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        className="size-4 rounded border accent-primary cursor-pointer"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditCountryIds((prev) => [...prev, c.id]);
                          } else {
                            if (editCountryIds.length <= 1) {
                              toast.warning(t("min_one_country_warning"));
                              return;
                            }
                            setEditCountryIds((prev) => prev.filter((id) => id !== c.id));
                          }
                        }}
                      />
                      <span className="font-medium text-foreground">
                        {c.name} ({c.country_code})
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setEditCountryOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("saving") : t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal for Permanent Account Deletion */}
      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemName={
          adminToDelete ? `${adminToDelete.full_name || ""} (${adminToDelete.email})` : null
        }
        onConfirm={handleConfirmDeleteAdmin}
        loading={isDeleting}
      />
    </div>
  );
}
