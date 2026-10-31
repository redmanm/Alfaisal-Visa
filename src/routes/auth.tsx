import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { User, Lock, Eye, EyeOff, Languages } from "lucide-react";
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
  const { toggleLang, isAr, lang } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
      toast.error(
        isAr
          ? "يرجى إدخال اسم مستخدم وكلمة مرور صحيحة"
          : "Please enter a valid username and password",
      );
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
      toast.success(isAr ? "مرحباً بعودتك!" : "Welcome back!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : isAr ? "فشل تسجيل الدخول" : "Sign-in failed",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-cover bg-center bg-no-repeat p-4 sm:p-6 md:p-8 select-none"
      style={{
        backgroundImage: "url('/login-bg.svg')",
        backgroundColor: "#001D38",
      }}
    >
      {/* Subtle Top Language Switcher */}
      <div className="absolute top-4 start-4 z-40 opacity-80 hover:opacity-100 transition-opacity">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLang}
          className="h-8 px-3 rounded-full text-xs font-medium gap-1.5 shadow-md bg-black/40 hover:bg-black/60 text-white border-white/20 backdrop-blur-md cursor-pointer transition-all"
        >
          <Languages className="size-3.5 text-teal-300" />
          <span>{lang === "ar" ? "English" : "العربية"}</span>
        </Button>
      </div>

      {/* Centered Responsive White Card */}
      <div className="relative z-10 w-full max-w-[340px] sm:max-w-[390px] md:max-w-[420px] bg-white rounded-2xl sm:rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.4)] p-6 sm:p-9 md:p-10 transition-all">
        {/* Official Fan AlFaisal Logo & Company Name */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <img
            src="/logo.png"
            alt="Fan AlFaisal Recruitment Company"
            className="h-28 sm:h-36 w-auto object-contain select-none"
          />
        </div>

        {/* Login Form with Underline Inputs */}
        <form onSubmit={submit} className="space-y-6 sm:space-y-7">
          {/* Username Field */}
          <div className="group relative flex items-center gap-3 border-b-2 border-teal-600/40 pb-2 focus-within:border-[#006D6C] transition-colors">
            <User className="size-5 text-[#006D6C]/80 group-focus-within:text-[#006D6C] shrink-0 transition-colors" />
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isAr ? "اسم المستخدم" : "Username"}
              className="w-full bg-transparent text-sm sm:text-base text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          {/* Password Field */}
          <div className="group relative flex items-center gap-3 border-b-2 border-teal-600/40 pb-2 focus-within:border-[#006D6C] transition-colors">
            <Lock className="size-5 text-[#006D6C]/80 group-focus-within:text-[#006D6C] shrink-0 transition-colors" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isAr ? "كلمة المرور" : "Password"}
              className="w-full bg-transparent text-sm sm:text-base text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-600 focus:outline-none p-1 cursor-pointer shrink-0"
              tabIndex={-1}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {/* Centered Teal Pill Button */}
          <div className="pt-2 flex justify-center">
            <button
              type="submit"
              disabled={busy}
              className="w-44 sm:w-52 py-2.5 sm:py-3 rounded-full bg-gradient-to-r from-[#006D6C] to-[#0A7A7E] hover:from-[#005857] hover:to-[#08676B] text-white font-semibold text-sm sm:text-base shadow-md hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {busy ? (
                <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : isAr ? (
                "تسجيل الدخول"
              ) : (
                "Sign-In"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
