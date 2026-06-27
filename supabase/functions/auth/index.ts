import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/v1\/auth/, "") || "/";
  const method = req.method;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    if (path === "/login" && method === "POST") {
      const { api_key } = await req.json();

      const regex = /^api_.*_videco\.io$/;
      if (!api_key || !regex.test(api_key)) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 500,
          headers,
        });
      }

      const { data: apikeyData } = await supabase
        .from("apikey")
        .select("user_id, tenant_id")
        .eq("key", api_key)
        .single();

      if (!apikeyData) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 500,
          headers,
        });
      }

      const jwt = await supabase.auth.admin.generateLink({
        email: apikeyData.user_id,
        type: "magiclink",
      });

      return new Response(
        JSON.stringify({ token: jwt.properties?.action_link || api_key }),
        { headers }
      );
    }

    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers,
    });
  }
};
