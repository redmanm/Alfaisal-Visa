import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Languages,
} from "lucide-react";
import { neonAuth } from "@/lib/neon-client";
import { Button } from "@/components/ui/button";
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
  username: z.string().trim().min(2, "Enter a valid username or email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
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
  const { t, isAr, toggleLang } = useI18n();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const handleRedirect = (
      s: { user?: { role?: string; user_metadata?: { role?: string } } } | null,
    ) => {
      if (!s?.user) return;
      const role = normalizeRole(s.user.role || s.user.user_metadata?.role);
      navigate({ to: role === "SUPER_ADMIN" ? "/executive" : "/records", replace: true });
    };

    neonAuth.getSession().then(({ data }) => handleRedirect(data.session));
    const { data } = neonAuth.onAuthStateChange((_e, s) => handleRedirect(s));
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ username, password });
    if (!parsed.success) {
      toast.error(t("auth_invalid_input"));
      return;
    }

    const resolvedEmail = username.trim().includes("@")
      ? username.trim()
      : `${username.trim().toLowerCase()}@falfaisal.com`;

    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await neonAuth.signInWithPassword({
          email: resolvedEmail,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success(t("auth_welcome_back"));
      } else {
        const { data, error } = await neonAuth.signUp({
          email: resolvedEmail,
          password: parsed.data.password,
          options: { data: { full_name: fullName.trim() || username.trim() } },
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
    setUsername(account.email);
    setPassword(account.password);
    setFullName(isAr ? account.name_ar : account.name_en);
    try {
      // First attempt sign-in
      const { data: signInData, error: signInErr } = await neonAuth.signInWithPassword({
        email: account.email,
        password: account.password,
      });

      if (!signInErr && signInData.session) {
        toast.success(`${t("auth_welcome_back")} (${account.email})`);
        navigate({
          to: account.role === "SUPER_ADMIN" ? "/executive" : "/records",
          replace: true,
        });
        return;
      }

      // If user does not exist yet, auto-provision
      const { data: signUpData, error: signUpErr } = await neonAuth.signUp({
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
        navigate({
          to: account.role === "SUPER_ADMIN" ? "/executive" : "/records",
          replace: true,
        });
      } else {
        const retry = await neonAuth.signInWithPassword({
          email: account.email,
          password: account.password,
        });
        if (retry.error) throw retry.error;
        toast.success(`${t("auth_welcome_back")} (${account.email})`);
        navigate({
          to: account.role === "SUPER_ADMIN" ? "/executive" : "/records",
          replace: true,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row relative overflow-hidden bg-[#F0F4F7]">
      {/* Top Floating Language Switcher */}
      <div className="absolute top-4 start-4 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLang}
          className="h-8 px-3 rounded-full text-xs font-medium gap-1.5 shadow-xs bg-white/90 hover:bg-white text-slate-700 backdrop-blur-md border border-slate-200/90 transition-all cursor-pointer"
        >
          <Languages className="size-3.5 text-[#0F765E]" />
          <span className="font-semibold">{t("lang_switch_label")}</span>
        </Button>
      </div>

      {/* Mobile Subtle Background Image */}
      <div
        className="lg:hidden absolute inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{ backgroundImage: "url('/login-hero.jpg')" }}
      >
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" />
      </div>

      {/* 1. Left Side: Centered Login Card (~40-45% Desktop Width) */}
      <div className="w-full lg:w-[45%] xl:w-[42%] min-h-screen flex flex-col justify-center items-center p-4 sm:p-8 z-10">
        <div className="w-full max-w-[380px] sm:max-w-[400px] rounded-3xl bg-white p-7 sm:p-9 shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-white/80 transition-all">
          {/* Company Official Logo */}
          <div className="flex justify-center mb-1">
            <img
              src="/logo.png"
              alt="Fan AlFaisal Logo"
              className="h-20 sm:h-24 w-auto object-contain select-none"
            />
          </div>

          {/* Portal Title */}
          <h1 className="text-center text-xl sm:text-[22px] font-bold text-slate-800 tracking-tight mt-2 mb-6 font-arabic">
            {t("auth_portal_title") || "Visa Processing Portal"}
          </h1>

          {/* Form Inputs */}
          <form onSubmit={submit} className="space-y-4">
            {mode === "up" && (
              <div className="relative flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-2xs transition-all duration-200 focus-within:border-[#0F765E] focus-within:ring-2 focus-within:ring-[#0F765E]/20">
                <User className="size-4.5 text-slate-400 shrink-0 me-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t("auth_full_name") || "Full Name"}
                  className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            )}

            {/* Username Field */}
            <div className="relative flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-2xs transition-all duration-200 focus-within:border-[#0F765E] focus-within:ring-2 focus-within:ring-[#0F765E]/20">
              <User className="size-4.5 text-slate-400 shrink-0 me-3" />
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t("auth_username_placeholder") || "Username"}
                className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            {/* Password Field */}
            <div className="relative flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-2xs transition-all duration-200 focus-within:border-[#0F765E] focus-within:ring-2 focus-within:ring-[#0F765E]/20">
              <Lock className="size-4.5 text-slate-400 shrink-0 me-3" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "in" ? "current-password" : "new-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("auth_password_placeholder") || "Password"}
                className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none p-0.5 cursor-pointer"
                tabIndex={-1}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[#0F765E] hover:bg-[#0A5C48] active:bg-[#074737] text-white font-semibold py-3.5 text-sm sm:text-base transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {busy ? (
                <div className="size-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                t("auth_sign_in_btn") || "Sign In"
              )}
            </button>

            {/* Quick Demo Logins Strip */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500">
                  {t("auth_quick_roles") || "Quick Demo Logins"}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">1-Click</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {DEMO_ACCOUNTS_DATA.map((acc, idx) => (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={busy}
                    onClick={() => handleDemoLogin(acc)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/90 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-[11px] font-medium text-slate-700 transition-colors text-start cursor-pointer"
                  >
                    {idx === 0 ? (
                      <ShieldCheck className="size-3 text-amber-500 shrink-0" />
                    ) : idx === 1 || idx === 2 ? (
                      <ShieldAlert className="size-3 text-blue-500 shrink-0" />
                    ) : (
                      <UserCheck className="size-3 text-emerald-600 shrink-0" />
                    )}
                    <span className="truncate">{isAr ? acc.badge_ar : acc.badge_en}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode switch */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setMode(mode === "in" ? "up" : "in")}
                className="text-xs text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer"
              >
                {mode === "in" ? t("auth_switch_to_up") : t("auth_switch_to_in")}
              </button>
            </div>
          </form>
        </div>

        {/* Security badge beneath the card */}
        <p className="mt-4 text-center text-xs text-slate-500/80 flex items-center justify-center gap-1.5">
          <ShieldCheck className="size-3.5 text-emerald-600" />
          <span>{t("auth_secure_badge")}</span>
        </p>
      </div>

      {/* 2. Right Side: Exactly the provided photo */}
      <div className="hidden lg:relative lg:flex lg:w-[55%] xl:w-[58%] min-h-screen items-center justify-center overflow-hidden bg-slate-950 select-none p-4 lg:p-6 xl:p-8">
        {/* Ambient backdrop of the exact photo filling edge-to-edge */}
        <img
          src="/login-hero.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center blur-2xl scale-125 opacity-35 pointer-events-none"
        />

        {/* Corporate emerald gradient overlay (#065F46 / emerald tint) */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#064E3B]/40 via-transparent to-[#047857]/25 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/30 via-transparent to-transparent pointer-events-none" />

        {/* The exact photo prominently displayed: building sign at top to branded van at bottom */}
        <div className="relative z-10 h-full max-h-[95vh] w-full flex items-center justify-center">
          <img
            src="/login-hero.jpg"
            alt="Fan AlFaisal Recruitment Company Office and Van"
            className="h-full w-auto max-w-full object-contain rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/10"
          />
        </div>
      </div>
    </div>
  );
}
