import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeRole } from "@/lib/records";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
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
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        navigate({ to: "/auth", replace: true });
        return;
      }
      const role = normalizeRole(data.session.user.role || data.session.user.user_metadata?.role);
      navigate({ to: role === "SUPER_ADMIN" ? "/executive" : "/records", replace: true });
    });
  }, [navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
