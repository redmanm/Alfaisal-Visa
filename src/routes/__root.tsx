import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  isRedirect,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { neonAuth } from "@/lib/neon-client";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/lib/i18n";

function isArabicLocale() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("falfaisal_lang") !== "en";
}

function NotFoundComponent() {
  const isAr = isArabicLocale();
  return (
    <div
      className={`flex min-h-screen items-center justify-center bg-background px-4 ${isAr ? "font-arabic" : ""}`}
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          {isAr ? "الصفحة غير موجودة" : "Page not found"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {isAr
            ? "الصفحة التي تبحث عنها غير موجودة أو تم نقلها."
            : "The page you're looking for doesn't exist or has been moved."}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {isAr ? "العودة للرئيسية" : "Go home"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error("Root ErrorComponent error:", error);
  const router = useRouter();
  const isAr = isArabicLocale();

  // If this error is a TanStack Router redirect or HTTP redirect response, perform it immediately
  if (
    isRedirect(error) ||
    (error instanceof Response && error.status >= 300 && error.status < 400) ||
    (typeof error === "object" &&
      error !== null &&
      ("statusCode" in error || "href" in error || "options" in error || "to" in error))
  ) {
    const errObj = error as Record<string, unknown>;
    const opts = (errObj.options || {}) as Record<string, unknown>;
    const headers = error instanceof Response ? error.headers : undefined;
    const to =
      (typeof opts.to === "string" ? opts.to : null) ||
      (typeof opts.href === "string" ? opts.href : null) ||
      (typeof errObj.href === "string" ? errObj.href : null) ||
      (typeof errObj.to === "string" ? errObj.to : null) ||
      headers?.get("Location") ||
      headers?.get("location") ||
      "/auth";
    if (typeof window !== "undefined") {
      window.location.replace(to);
    }
    return null;
  }

  return (
    <div
      className={`flex min-h-screen items-center justify-center bg-background px-4 ${isAr ? "font-arabic" : ""}`}
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {isAr ? "تعذر تحميل هذه الصفحة" : "This page didn't load"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isAr
            ? "حدث خطأ غير متوقع. يمكنك محاولة تحديث الصفحة أو العودة للرئيسية."
            : "Something went wrong on our end. You can try refreshing or head back home."}
        </p>

        {error ? (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-left dir-ltr text-xs font-mono text-destructive max-h-48 overflow-auto whitespace-pre-wrap">
            {error instanceof Error
              ? `${error.name}: ${error.message}\n${error.stack ?? ""}`
              : String(error)}
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {isAr ? "إعادة المحاولة" : "Try again"}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {isAr ? "العودة للرئيسية" : "Go home"}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "شركة فن الفيصل للإستقدام — Fan AlFaisal Recruitment" },
      {
        name: "description",
        content: "النظام الداخلي لإدارة وتتبع المعاملات والتأشيرات — شركة فن الفيصل للإستقدام",
      },
      { property: "og:title", content: "شركة فن الفيصل للإستقدام — Fan AlFaisal Recruitment" },
      {
        property: "og:description",
        content: "النظام الداخلي لإدارة وتتبع المعاملات والتأشيرات — شركة فن الفيصل للإستقدام",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/logo.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/logo.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    const { data } = neonAuth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => data.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <Toaster richColors position="top-right" />
      </I18nProvider>
    </QueryClientProvider>
  );
}
