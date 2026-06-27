import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export default async (req: Request) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-tenant-id",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) {
    return new Response(JSON.stringify({ error: "Missing tenant" }), {
      status: 400,
      headers,
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    if (req.method === "POST") {
      const body = await req.json();
      const { form_id, form_name, video_id, user_id, data } = body;

      const { data: result, error } = await supabase
        .from("leads")
        .insert({
          form_id,
          form_name,
          video_id,
          user_id,
          data,
          tenant_id: tenantId,
        })
        .select();

      if (error) throw error;
      return new Response(JSON.stringify({ result }), { headers });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers,
    });
  }
};
