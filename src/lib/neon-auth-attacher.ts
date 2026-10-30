import { createMiddleware } from "@tanstack/react-start";
import { neonAuth } from "./neon-client";

// Must be registered as a global `functionMiddleware` in `src/start.ts`
export const attachNeonAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { data } = await neonAuth.getSession();
  const token = data.session?.access_token;
  return next({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
});
