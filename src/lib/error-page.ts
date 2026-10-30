export function renderErrorPage(error?: unknown): string {
  const isAr =
    typeof window !== "undefined" ? localStorage.getItem("falfaisal_lang") !== "en" : true;
  const title = isAr ? "تعذر تحميل هذه الصفحة" : "This page didn't load";
  const desc = isAr
    ? "حدث خطأ غير متوقع في الخادم. يمكنك محاولة تحديث الصفحة أو العودة للرئيسية."
    : "Something went wrong on our end. You can try refreshing or head back home.";
  const tryAgain = isAr ? "إعادة المحاولة" : "Try again";
  const goHome = isAr ? "العودة للرئيسية" : "Go home";

  let detail = "";
  if (error instanceof Error) {
    detail = `${error.name}: ${error.message}\n${error.stack ?? ""}`;
  } else if (error) {
    detail = typeof error === "object" ? JSON.stringify(error, null, 2) : String(error);
  }

  const esc = (str: string) =>
    str.replace(
      /[&<>'"]/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[c] || c,
    );

  return `<!doctype html>
<html lang="${isAr ? "ar" : "en"}" dir="${isAr ? "rtl" : "ltr"}">
  <head>
    <meta charset="utf-8" />
    <title>${esc(title)}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 14px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #1e293b; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; direction: ${isAr ? "rtl" : "ltr"}; }
      .card { max-width: 32rem; width: 100%; text-align: center; padding: 2.25rem 2rem; background: #ffffff; border-radius: 0.75rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px -2px rgba(0,0,0,0.06); }
      h1 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem; color: #0f172a; }
      p { color: #64748b; margin: 0 0 1.5rem; font-size: 0.875rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1.25rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; font-size: 0.875rem; font-weight: 600; transition: opacity 0.15s; }
      .primary { background: #0f766e; color: #ffffff; }
      .primary:hover { opacity: 0.9; }
      .secondary { background: #f8fafc; color: #334155; border-color: #cbd5e1; }
      .secondary:hover { background: #f1f5f9; }
      .detail { margin-top: 1.5rem; text-align: left; direction: ltr; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 0.375rem; padding: 0.75rem; font-family: ui-monospace, monospace; font-size: 0.75rem; color: #9f1239; overflow-x: auto; max-height: 140px; white-space: pre-wrap; word-break: break-all; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${esc(title)}</h1>
      <p>${esc(desc)}</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">${esc(tryAgain)}</button>
        <a class="secondary" href="/">${esc(goHome)}</a>
      </div>
      ${detail ? `<div class="detail">${esc(detail)}</div>` : ""}
    </div>
  </body>
</html>`;
}
