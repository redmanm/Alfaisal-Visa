import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ShieldCheck, Shield, User, Sparkles, Copy, Check, Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeRole } from "@/lib/records";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — شركة فن الفيصل للإستقدام | Sign In — Fan AlFaisal" },
      {
        name: "description",
        content: "تسجيل الدخول للنظام الداخلي لإدارة المعاملات — شركة فن الفيصل للإستقدام",
      },
      { property: "og:title", content: "تسجيل الدخول — شركة فن الفيصل للإستقدام" },
      {
        property: "og:description",
        content: "تسجيل الدخول للنظام الداخلي لإدارة المعاملات — شركة فن الفيصل للإستقدام",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
});

export const DEMO_ACCOUNTS_DATA = [
  {
    role: "SUPER_ADMIN",
    title_ar: "المدير العام",
    title_en: "Super Admin",
    email: "admin@falfaisal.com",
    password: "Faisal@Admin#9841&Secure",
    name_ar: "المدير العام",
    name_en: "Super Admin",
    badge_ar: "المدير العام",
    badge_en: "Super Admin",
    description_ar:
      "صلاحيات كاملة على كافة الدول والوكالات وتعيين المشرفين وإدارة المنظومة بالكامل",
    description_en:
      "Full global visibility across all countries, agencies, admins, and candidate records",
  },
  {
    role: "ADMIN",
    title_ar: "أدمن مكتب إثيوبيا",
    title_en: "Admin (Ethiopia)",
    email: "admin.eth@falfaisal.com",
    password: "Faisal@AdminEth#4821&Secure",
    name_ar: "أدمن مكتب إثيوبيا",
    name_en: "Ethiopia Territory Admin",
    badge_ar: "إثيوبيا",
    badge_en: "Admin (ET)",
    description_ar: "معزول لدولة إثيوبيا: يرى ويدير فقط معاملات إثيوبيا ووكالاتها المعتمدة",
    description_en:
      "Isolated to Ethiopia territory: manages records and agencies for Ethiopia only",
  },
  {
    role: "ADMIN",
    title_ar: "أدمن أوغندا وكينيا",
    title_en: "Admin (Uganda & Kenya)",
    email: "admin.multi@falfaisal.com",
    password: "Faisal@AdminMulti#7634&Secure",
    name_ar: "أدمن شرق إفريقيا",
    name_en: "East Africa Territory Admin",
    badge_ar: "أوغندا + كينيا",
    badge_en: "Admin (UG+KE)",
    description_ar: "مخصص لدولتين: يرى ويدير معاملات أوغندا وكينيا ووكالاتهما فقط",
    description_en:
      "Assigned to two territories: manages records and agencies for Uganda & Kenya only",
  },
  {
    role: "STAFF",
    title_ar: "موظف عمليات",
    title_en: "Operations Staff",
    email: "staff@falfaisal.com",
    password: "Faisal@Staff#3172&Secure",
    name_ar: "موظف عمليات",
    name_en: "Operations Staff",
    badge_ar: "اطلاع فقط",
    badge_en: "Staff (Read-Only)",
    description_ar: "اطلاع وقراءة كاملة لجميع المعاملات والدول بدون صلاحية تعديل أو حذف",
    description_en:
      "Read-only access across all records, countries, and agencies without edit permissions",
  },
] as const;

function AuthPage() {
  const navigate = useNavigate();
  const { t, isAr, lang, toggleLang } = useI18n();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const handleRedirect = (
      s: { user?: { role?: string; user_metadata?: { role?: string } } } | null,
    ) => {
      if (!s?.user) return;
      const role = normalizeRole(s.user.role || s.user.user_metadata?.role);
      navigate({ to: role === "SUPER_ADMIN" ? "/executive" : "/records", replace: true });
    };

    supabase.auth.getSession().then(({ data }) => handleRedirect(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => handleRedirect(s));
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(t("auth_invalid_input"));
      return;
    }
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
        toast.success(t("auth_welcome_back"));
      } else {
        const { data, error } = await supabase.auth.signUp({
          ...parsed.data,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success(t("auth_acc_created"));
        } else {
          toast.success(t("auth_acc_created"));
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  // Quick Sign In for Demo Accounts
  async function handleDemoLogin(account: (typeof DEMO_ACCOUNTS_DATA)[number]) {
    setBusy(true);
    setEmail(account.email);
    setPassword(account.password);
    setName(isAr ? account.name_ar : account.name_en);
    try {
      // First attempt sign-in
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });

      if (!signInErr && signInData.session) {
        toast.success(`${t("auth_welcome_back")} (${account.email})`);
        navigate({ to: "/records", replace: true });
        return;
      }

      // If user does not exist yet, create it automatically
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: account.email,
        password: account.password,
        options: {
          data: {
            full_name: isAr ? account.name_ar : account.name_en,
            role: account.role,
          },
        },
      });

      if (signUpErr) throw signUpErr;

      if (signUpData.session) {
        toast.success(`${t("auth_welcome_back")} (${account.email})`);
        navigate({ to: "/records", replace: true });
      } else {
        // Retry sign in
        const retry = await supabase.auth.signInWithPassword({
          email: account.email,
          password: account.password,
        });
        if (retry.error) throw retry.error;
        toast.success(`${t("auth_welcome_back")} (${account.email})`);
        navigate({ to: "/records", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  const copyCreds = (val: string, key: string, label: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    toast.success(`${t("copied")}: ${label}`);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  async function google() {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error(error.message);
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 relative bg-background">
      {/* Top Floating Language Switcher */}
      <div className="absolute top-4 rtl:left-4 ltr:right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLang}
          className="h-8 px-3 text-xs gap-1.5 shadow-xs bg-card/80 backdrop-blur-xs hover:bg-accent"
        >
          <Languages className="size-3.5 text-primary" />
          <span className="font-semibold">{t("lang_switch_label")}</span>
        </Button>
      </div>

      {/* Left Marketing & Brand Showcase */}
      <div className="hidden lg:flex flex-col justify-between p-10 bg-sidebar text-sidebar-foreground border-e border-sidebar-border relative overflow-hidden">
        <div className="flex items-center gap-3 font-semibold tracking-tight">
          <img
            src="/logo.png"
            alt="Fan AlFaisal Logo"
            className="size-12 rounded-xl bg-white object-contain p-1 shadow-md"
          />
          <div>
            <div className="font-arabic text-base font-bold text-sidebar-foreground">
              {t("company_name")}
            </div>
            <div className="text-xs text-sidebar-foreground/75 font-normal tracking-wide">
              {t("company_subtitle")}
            </div>
          </div>
        </div>

        <div className="max-w-md space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xs">
            <img
              src="/logo.png"
              alt="Fan AlFaisal"
              className="mx-auto mb-4 size-28 rounded-2xl bg-white object-contain p-2 shadow-lg"
            />
            <h1 className="text-center font-arabic text-2xl font-bold leading-snug">
              {t("auth_platform_title")}
            </h1>
            <p className="mt-2 text-center text-xs opacity-75 leading-relaxed">
              {t("auth_platform_desc")}
            </p>
          </div>

          <div className="space-y-2 text-xs opacity-80">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-st-teal" />
              <span>{t("auth_bullet_1")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-st-green" />
              <span>{t("auth_bullet_2")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-primary" />
              <span>{t("auth_bullet_3")}</span>
            </div>
          </div>
        </div>

        <p className="flex items-center gap-2 text-xs opacity-60">
          <ShieldCheck className="size-4" /> {t("auth_secure_badge")}
        </p>
      </div>

      {/* Right Login & Demo Form */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-5">
          {/* Logo on small screens */}
          <div className="text-center lg:hidden">
            <img
              src="/logo.png"
              alt="Fan AlFaisal Logo"
              className="mx-auto mb-2 size-16 rounded-xl bg-white object-contain p-1 shadow-xs border"
            />
            <h2 className="font-arabic text-lg font-bold">{t("company_name")}</h2>
            <p className="text-xs text-muted-foreground">{t("company_subtitle")}</p>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {mode === "in" ? t("auth_title_signin") : t("auth_title_signup")}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === "in" ? t("auth_subtitle_signin") : t("auth_subtitle_signup")}
            </p>
          </div>

          {/* Quick Demo Login Box */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <Sparkles className="size-3.5" /> {t("auth_demo_box")}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase font-mono">
                {t("auth_demo_click")}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_ACCOUNTS_DATA.map((acc, idx) => (
                <Button
                  key={acc.email}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => handleDemoLogin(acc)}
                  className={`h-auto flex flex-col items-start p-2.5 text-left rtl:text-right transition-all ${
                    idx === 0
                      ? "border-amber-500/40 hover:border-amber-500 hover:bg-amber-500/10"
                      : idx === 1 || idx === 2
                        ? "border-blue-500/40 hover:border-blue-500 hover:bg-blue-500/10"
                        : "border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-500/10"
                  }`}
                >
                  <div className="flex items-center gap-1.5 w-full justify-between">
                    <span className="flex items-center gap-1 font-semibold text-xs text-foreground truncate">
                      {idx === 0 ? (
                        <Shield className="size-3 text-amber-500 shrink-0" />
                      ) : idx === 1 || idx === 2 ? (
                        <ShieldCheck className="size-3 text-blue-500 shrink-0" />
                      ) : (
                        <User className="size-3 text-emerald-500 shrink-0" />
                      )}
                      <span className="truncate">{isAr ? acc.badge_ar : acc.badge_en}</span>
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 truncate w-full font-mono">
                    {acc.email}
                  </span>
                  <span className="text-[9px] text-muted-foreground/80 line-clamp-1 mt-0.5 w-full">
                    {isAr ? acc.description_ar : acc.description_en}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Standard Auth Form */}
          <form onSubmit={submit} className="space-y-4">
            {mode === "up" && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs">
                  {t("auth_full_name")}
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  className="h-9 text-xs"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="email" className="text-xs">
                  {t("auth_email")}
                </Label>
                {email && (
                  <button
                    type="button"
                    onClick={() => copyCreds(email, "email", t("auth_email"))}
                    className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {copiedKey === "email" ? (
                      <Check className="size-3 text-st-green" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    {t("copy_label")}
                  </button>
                )}
              </div>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="name@falfaisal.com"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs">
                  {t("auth_password")}
                </Label>
                {password && (
                  <button
                    type="button"
                    onClick={() => copyCreds(password, "pass", t("auth_password"))}
                    className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {copiedKey === "pass" ? (
                      <Check className="size-3 text-st-green" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    {t("copy_label")}
                  </button>
                )}
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "in" ? "current-password" : "new-password"}
                className="h-9 text-xs"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-9 text-xs font-semibold shadow-panel"
              disabled={busy}
            >
              {busy ? t("saving") : mode === "in" ? t("auth_sign_in_btn") : t("auth_sign_up_btn")}
            </Button>

            <div className="relative text-center text-xs text-muted-foreground">
              <span className="bg-background px-2">
                {isAr ? "أو المتابعة عبر" : "Or continue with"}
              </span>
            </div>

            <Button type="button" variant="outline" className="w-full h-9 text-xs" onClick={google}>
              {isAr ? "تسجيل الدخول عبر Google" : "Continue with Google"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              {mode === "in" ? t("auth_switch_to_up") : t("auth_switch_to_in")}{" "}
              <button
                type="button"
                className="font-semibold text-primary hover:underline"
                onClick={() => setMode(mode === "in" ? "up" : "in")}
              >
                {mode === "in" ? t("auth_sign_up_btn") : t("auth_sign_in_btn")}
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
