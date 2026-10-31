import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { User, Lock, Languages } from "lucide-react";
import { neonAuth } from "@/lib/neon-client";
import { Button } from "@/components/ui/button";
import { normalizeRole } from "@/lib/records";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Visa Processing Portal — Fan AlFaisal Recruitment Company" },
      {
        name: "description",
        content: "تسجيل الدخول للنظام الداخلي لإدارة المعاملات — شركة فن الفيصل للإستقدام",
      },
      { property: "og:title", content: "Visa Processing Portal — Fan AlFaisal" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  username: z.string().trim().min(2, "Enter a valid username or email").max(255),
  password: z.string().min(6, "At least 6 characters").max(72),
});

// Preserved for test compatibility
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
  const { toggleLang, lang } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
      toast.error("Please enter a valid username and password");
      return;
    }

    const resolvedEmail = username.trim().includes("@")
      ? username.trim()
      : `${username.trim().toLowerCase()}@falfaisal.com`;

    setBusy(true);
    try {
      const { error } = await neonAuth.signInWithPassword({
        email: resolvedEmail,
        password: parsed.data.password,
      });
      if (error) throw error;
      toast.success("Welcome back!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row relative overflow-hidden bg-[#EDF2F4]">
      {/* Subtle Top Language Switcher */}
      <div className="absolute top-4 start-4 z-40 opacity-70 hover:opacity-100 transition-opacity">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLang}
          className="h-7 px-2.5 rounded-full text-xs font-medium gap-1 shadow-2xs bg-white/80 hover:bg-white text-slate-600 backdrop-blur-md border border-slate-200/80 cursor-pointer"
        >
          <Languages className="size-3 text-[#146C53]" />
          <span>{lang === "ar" ? "English" : "العربية"}</span>
        </Button>
      </div>

      {/* Mobile Background Fallback */}
      <div
        className="lg:hidden absolute inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{ backgroundImage: "url('/login-hero.jpg')" }}
      >
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" />
      </div>

      {/* 1. Left Side: Centered Minimalist Login Card */}
      <div className="w-full lg:w-[48%] xl:w-[45%] min-h-screen flex flex-col justify-center items-center p-6 sm:p-10 z-10">
        <div className="w-full max-w-[360px] sm:max-w-[380px] rounded-3xl bg-white p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-white/60">
          {/* Fan AlFaisal Official Logo */}
          <div className="flex justify-center mb-1">
            <img
              src="/logo.png"
              alt="Fan AlFaisal Recruitment Company"
              className="h-24 sm:h-28 w-auto object-contain select-none"
            />
          </div>

          {/* Portal Title */}
          <h1 className="text-center text-xl sm:text-[22px] font-bold text-slate-800 tracking-tight mt-1 mb-6 font-arabic">
            Visa Processing Portal
          </h1>

          {/* Login Form */}
          <form onSubmit={submit} className="space-y-3.5">
            {/* Username Input Field */}
            <div className="relative flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-2xs transition-all focus-within:border-[#146C53] focus-within:ring-2 focus-within:ring-[#146C53]/20">
              <User className="size-4.5 text-slate-400 shrink-0 me-3" />
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            {/* Password Input Field */}
            <div className="relative flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-2xs transition-all focus-within:border-[#146C53] focus-within:ring-2 focus-within:ring-[#146C53]/20">
              <Lock className="size-4.5 text-slate-400 shrink-0 me-3" />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[#146C53] hover:bg-[#0f5742] active:bg-[#0b4232] text-white font-medium py-3 text-sm transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2 mt-2"
            >
              {busy ? (
                <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>

      {/* 2. Right Side: Full-Bleed Storefront & Van Banner */}
      <div className="hidden lg:block lg:w-[52%] xl:w-[55%] min-h-screen relative overflow-hidden bg-slate-900 select-none">
        <img
          src="/login-hero.jpg"
          alt="Fan AlFaisal Recruitment Company"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      </div>
    </div>
  );
}
