import "./lib/error-capture";

import { isRedirect, isNotFound } from "@tanstack/react-router";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  const captured = consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`);
  console.error(captured);
  return new Response(renderErrorPage(captured), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      if (isRedirect(error)) {
        const errObj = error as Record<string, unknown>;
        const opts = (errObj.options || {}) as Record<string, unknown>;
        const resHeaders = error instanceof Response ? error.headers : undefined;
        const to =
          (typeof opts.to === "string" ? opts.to : null) ||
          (typeof opts.href === "string" ? opts.href : null) ||
          (typeof errObj.href === "string" ? errObj.href : null) ||
          (typeof errObj.to === "string" ? errObj.to : null) ||
          resHeaders?.get("Location") ||
          resHeaders?.get("location") ||
          "/auth";
        const headers = new Headers(resHeaders || {});
        headers.set("Location", to);
        const status = typeof errObj.status === "number" ? errObj.status : 307;
        return new Response(null, {
          status,
          headers,
        });
      }
      if (error instanceof Response) {
        if (error.status >= 300 && error.status < 400 && !error.headers.has("Location")) {
          const errObj = error as unknown as Record<string, unknown>;
          const opts = (errObj.options || {}) as Record<string, unknown>;
          const to =
            (typeof opts.to === "string" ? opts.to : null) ||
            (typeof opts.href === "string" ? opts.href : null) ||
            "/auth";
          const headers = new Headers(error.headers);
          headers.set("Location", to);
          return new Response(null, { status: error.status, headers });
        }
        return error;
      }
      if (isNotFound(error)) {
        return new Response("Not Found", { status: 404 });
      }
      console.error(error);
      return new Response(renderErrorPage(error), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
