import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  History,
  LogOut,
  Users,
  Globe,
  ShieldCheck,
  ShieldAlert,
  Eye,
  MapPin,
  Menu,
  X,
  Languages,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { neonAuth, getStoredSession, type AuthSession } from "@/lib/neon-client";
import { type AppRole, normalizeRole, isSuperAdmin, isAdmin } from "@/lib/records";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

interface SessionUser {
  id: string;
  email?: string;
  role?: string;
  assigned_country_ids?: string[];
  assigned_countries?: Array<{ id: string; name: string; country_code: string }>;
  user_metadata?: {
    role?: string;
    assigned_country_ids?: string[];
  };
}

interface AuthenticatedContext {
  user: SessionUser | null;
  role: AppRole;
  assignedCountryIds: string[];
  assignedCountries: Array<{ id: string; name: string; country_code: string }>;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // If running in SSR, return safe placeholders so client can hydrate and verify localStorage auth
    if (typeof window === "undefined") {
      return {
        user: null as unknown as SessionUser,
        role: "STAFF" as AppRole,
        assignedCountryIds: [] as string[],
        assignedCountries: [] as Array<{ id: string; name: string; country_code: string }>,
      };
    }

    const { data } = await neonAuth.getUser();
    if (!data?.user) {
      return {
        user: null as unknown as SessionUser,
        role: "STAFF" as AppRole,
        assignedCountryIds: [] as string[],
        assignedCountries: [] as Array<{ id: string; name: string; country_code: string }>,
      };
    }

    const u = data.user as unknown as SessionUser;
    const rawRole = u.role || u.user_metadata?.role;
    const role: AppRole | null = normalizeRole(rawRole) ?? "STAFF";

    const assignedCountryIds: string[] =
      u.assigned_country_ids || u.user_metadata?.assigned_country_ids || [];

    const assignedCountries = u.assigned_countries || [];

    return { user: data.user, role, assignedCountryIds, assignedCountries };
  },
  component: Layout,
});

function Layout() {
  const context = (Route.useRouteContext() || {}) as Partial<AuthenticatedContext>;
  const { lang, toggleLang, t, isAr } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("falfaisal_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("falfaisal_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Client-side session state for reliable hydration across page refreshes
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession());

  const activeUser = (session?.user || context?.user || null) as SessionUser | null;
  const rawRole = activeUser?.role || activeUser?.user_metadata?.role;
  const role: AppRole = normalizeRole(rawRole) ?? context?.role ?? "STAFF";
  const assignedCountries = activeUser?.assigned_countries || context?.assignedCountries || [];
  const user = activeUser;

  // If on client and no user session, navigate cleanly to /auth in an effect
  useEffect(() => {
    const cur = getStoredSession();
    setSession(cur);
    if (!cur?.user && !context?.user) {
      navigate({ to: "/auth", replace: true });
    }

    const { data: authSub } = neonAuth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession?.user) {
        navigate({ to: "/auth", replace: true });
      }
    });

    return () => {
      authSub?.subscription?.unsubscribe?.();
    };
  }, [context?.user, navigate]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await neonAuth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const nav = [
    ...(isSuperAdmin(role)
      ? [{ to: "/executive", label: t("nav_executive"), icon: LayoutDashboard }]
      : []),
    { to: "/records", label: t("nav_records"), icon: FileSpreadsheet },
    ...(isSuperAdmin(role)
      ? [
          { to: "/countries", label: t("nav_hierarchy"), icon: Globe },
          { to: "/users", label: t("nav_admins"), icon: Users },
        ]
      : []),
    { to: "/audit", label: t("nav_audit"), icon: History },
  ] as const;

  const roleBadge = () => {
    if (isSuperAdmin(role)) {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/30">
          <ShieldCheck className="size-3" />
          {t("role_super_admin")}
        </span>
      );
    }
    if (isAdmin(role)) {
      return (
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1 rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-bold text-blue-500 border border-blue-500/30">
            <ShieldAlert className="size-3" />
            {t("role_admin")}
          </span>
          {assignedCountries && assignedCountries.length > 0 && (
            <div className="flex flex-wrap gap-1 text-[9px] text-muted-foreground items-center">
              <MapPin className="size-2.5 text-primary" />
              <span>
                {assignedCountries
                  .map((c) => {
                    const countryName =
                      c?.name || (c as unknown as { country_name?: string })?.country_name || "";
                    return countryName ? countryName.split(" ")[0] : "";
                  })
                  .filter(Boolean)
                  .join(isAr ? "، " : ", ")}
              </span>
            </div>
          )}
        </div>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500 border border-emerald-500/30">
        <Eye className="size-3" />
        {t("role_read_only")}
      </span>
    );
  };

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* 1. Mobile Header (Phones & Tablets) */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-sidebar px-3 py-2 text-sidebar-foreground md:hidden shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="size-8 text-sidebar-foreground hover:bg-sidebar-accent"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
          <img
            src="/logo.png"
            alt="Logo"
            className="size-7 rounded bg-white object-contain p-0.5 shrink-0"
          />
          <div className="min-w-0">
            <div className="font-arabic text-xs font-bold truncate leading-tight">
              {t("company_name")}
            </div>
            <div className="text-[9px] text-sidebar-foreground/75 truncate">{t("app_desk")}</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Quick Language Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLang}
            className="h-7 px-2 text-[11px] gap-1 text-sidebar-foreground hover:bg-sidebar-accent font-medium"
            title={lang === "ar" ? "Switch to English" : "التحويل للغة العربية"}
          >
            <Languages className="size-3 text-primary" />
            <span>{t("lang_switch_label")}</span>
          </Button>

          {/* Compact Role Badge */}
          <div className="scale-90 origin-right">
            {isSuperAdmin(role) ? (
              <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-400 border border-amber-400/30">
                <ShieldCheck className="size-2.5" /> {t("role_super_admin")}
              </span>
            ) : isAdmin(role) ? (
              <span className="inline-flex items-center gap-1 rounded bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-bold text-blue-400 border border-blue-400/30">
                <ShieldAlert className="size-2.5" /> {t("role_admin")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-400/30">
                <Eye className="size-2.5" /> {t("role_staff")}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* 2. Mobile Drawer Navigation Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute top-0 bottom-0 rtl:right-0 rtl:left-auto ltr:left-0 ltr:right-auto w-[min(300px,85vw)] bg-sidebar p-4 text-sidebar-foreground shadow-2xl flex flex-col justify-between overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between border-b border-sidebar-border pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/logo.png"
                    alt="Logo"
                    className="size-8 rounded bg-white object-contain p-0.5"
                  />
                  <div>
                    <div className="font-arabic text-xs font-bold">{t("company_name")}</div>
                    <div className="text-[10px] text-sidebar-foreground/70">{t("app_desk")}</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  className="size-7 text-sidebar-foreground hover:bg-sidebar-accent"
                >
                  <X className="size-4" />
                </Button>
              </div>

              {/* User info in mobile menu */}
              <div className="mb-4 rounded-lg bg-sidebar-accent/50 p-2.5 text-xs space-y-1.5">
                <div className="font-mono text-[11px] text-sidebar-foreground/90 truncate">
                  {user?.email || ""}
                </div>
                <div>{roleBadge()}</div>
              </div>

              {/* Navigation links */}
              <nav className="space-y-1">
                {nav.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium opacity-85 transition hover:bg-sidebar-accent hover:opacity-100"
                    activeProps={{
                      className:
                        "bg-sidebar-accent !opacity-100 text-sidebar-primary font-bold shadow-xs",
                    }}
                  >
                    <n.icon className="size-4 shrink-0 text-sidebar-primary" />
                    <span>{n.label}</span>
                  </Link>
                ))}
              </nav>
            </div>

            {/* Bottom actions in mobile drawer */}
            <div className="border-t border-sidebar-border pt-3 space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleLang}
                className="w-full justify-start text-xs border-sidebar-border bg-sidebar-accent/30 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <Languages className="size-4 mr-2 text-primary" />
                <span>{lang === "ar" ? "English Version" : "النسخة العربية"}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="w-full justify-start text-xs text-destructive hover:bg-destructive/10"
              >
                <LogOut className="size-4 mr-2" />
                <span>{t("nav_sign_out")}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Desktop Sidebar */}
      <aside
        className={`hidden shrink-0 flex-col items-stretch bg-sidebar text-sidebar-foreground md:flex ${
          isCollapsed ? "md:w-16 p-2" : "md:w-64 p-3"
        } border-e border-sidebar-border shadow-xs transition-[width,padding] duration-200 select-none`}
      >
        {/* Company Header & Minimization Toggle */}
        <div
          className={`flex items-center mb-4 ${
            isCollapsed ? "flex-col gap-2 justify-center" : "justify-between px-1 py-1"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/logo.png"
              alt="Fan AlFaisal Logo"
              className="size-9 shrink-0 rounded-md bg-white object-contain p-0.5 shadow-xs"
            />
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="font-arabic text-xs font-bold leading-tight tracking-tight text-sidebar-foreground block truncate">
                  {t("company_name")}
                </span>
                <span className="text-[10px] text-sidebar-foreground/70 block truncate">
                  {t("app_desk")}
                </span>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="size-7 text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent shrink-0"
            title={isCollapsed ? t("expand_sidebar") : t("collapse_sidebar")}
            aria-label={isCollapsed ? t("expand_sidebar") : t("collapse_sidebar")}
          >
            {isAr ? (
              isCollapsed ? (
                <PanelRightOpen className="size-4" />
              ) : (
                <PanelRightClose className="size-4" />
              )
            ) : isCollapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              title={isCollapsed ? n.label : undefined}
              className={`flex items-center gap-2.5 rounded-md text-xs font-medium opacity-80 transition hover:bg-sidebar-accent hover:opacity-100 ${
                isCollapsed ? "justify-center p-2.5" : "px-2.5 py-2"
              }`}
              activeProps={{
                className: `bg-sidebar-accent !opacity-100 text-sidebar-primary font-semibold shadow-2xs ${
                  isCollapsed ? "justify-center p-2.5" : ""
                }`,
              }}
            >
              <n.icon className={`${isCollapsed ? "size-5" : "size-4"} shrink-0`} />
              {!isCollapsed && <span className="truncate">{n.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Desktop Sidebar Footer */}
        <div className="space-y-2 border-t border-sidebar-border pt-3">
          {/* Language Switcher Button */}
          {isCollapsed ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLang}
              className="w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 justify-center"
              title={lang === "ar" ? "English Version" : "النسخة العربية"}
              aria-label={lang === "ar" ? "English Version" : "النسخة العربية"}
            >
              <Languages className="size-4 text-primary" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLang}
              className="w-full justify-between text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-xs h-8 px-2"
            >
              <span className="flex items-center gap-1.5">
                <Languages className="size-3.5 text-primary" />
                <span>{lang === "ar" ? "اللغة:" : "Language:"}</span>
              </span>
              <span className="font-semibold text-primary">
                {lang === "ar" ? "🇸🇦 العربية" : "🇬🇧 English"}
              </span>
            </Button>
          )}

          {/* User info card */}
          {isCollapsed ? (
            <div
              className="flex justify-center rounded-md bg-sidebar-accent/40 p-2 text-xs"
              title={`${user?.email || ""} (${role})`}
            >
              {isSuperAdmin(role) ? (
                <ShieldCheck className="size-4 text-amber-500" />
              ) : isAdmin(role) ? (
                <ShieldAlert className="size-4 text-blue-500" />
              ) : (
                <Eye className="size-4 text-emerald-500" />
              )}
            </div>
          ) : (
            <div className="rounded-md bg-sidebar-accent/40 p-2 text-xs space-y-1">
              <div className="truncate font-medium text-sidebar-foreground/90 text-[11px] font-mono">
                {user?.email || ""}
              </div>
              <div>{roleBadge()}</div>
            </div>
          )}

          {/* Sign Out Button */}
          <Button
            variant="ghost"
            size={isCollapsed ? "icon" : "sm"}
            onClick={signOut}
            className={`w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-xs h-8 ${
              isCollapsed ? "justify-center" : "justify-start"
            }`}
            title={t("nav_sign_out")}
            aria-label={t("nav_sign_out")}
          >
            <LogOut className={`size-4 shrink-0 ${isCollapsed ? "" : "mr-1.5"}`} />
            {!isCollapsed && <span>{t("nav_sign_out")}</span>}
          </Button>
        </div>
      </aside>

      {/* 4. Main Page View - Expands to 100% width */}
      <main className="min-w-0 flex-1 bg-background pb-20 md:pb-6 transition-all duration-200 w-full overflow-x-hidden">
        <Outlet />
      </main>

      {/* 5. Mobile Bottom Quick Bar (Optimized for Mobile/Touch Navigation) */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex items-center justify-around border-t bg-card/95 backdrop-blur-md py-1.5 px-2 md:hidden shadow-lg">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "!text-primary font-bold" }}
          >
            <n.icon className="size-4" />
            <span className="truncate max-w-[65px]">{(n.label || "").split(" ")[0]}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
