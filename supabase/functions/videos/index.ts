import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/v1\/videos/, "") || "/";
  const method = req.method;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-tenant-id",
  };

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const tenantId = req.headers.get("x-tenant-id");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!tenantId) {
    return new Response(JSON.stringify({ error: "Missing x-tenant-id" }), {
      status: 400,
      headers,
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    if (path === "/" && method === "GET") {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("tenant_id", tenantId);

      if (error) throw error;
      return new Response(JSON.stringify(data), { headers });
    }

    if (path === "/clone" && method === "POST") {
      const body = await req.json();
      const { data, error } = await supabase.functions.invoke("video", {
        body: { action: "clone_video", payload: { ...body, tenant_id: tenantId } },
      });
      return new Response(JSON.stringify(data), { headers });
    }

    if (path === "/get-clone" && method === "POST") {
      const body = await req.json();
      const { data, error } = await supabase.functions.invoke("video", {
        body: { action: "get_clone", payload: { ...body, tenant_id: tenantId } },
      });
      return new Response(JSON.stringify(data), { headers });
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
