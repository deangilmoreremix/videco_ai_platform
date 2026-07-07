import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-tenant-id",
  "Content-Type": "application/json",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const tenantId = req.headers.get("x-tenant-id");
  if (!tenantId) return new Response(JSON.stringify({ error: "x-tenant-id required" }), { status: 400, headers: corsHeaders });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");

  try {
    if (req.method === "GET" && !id) {
      const { data, error } = await supabase.from("images").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { data, error } = await supabase.from("images").insert({ ...body, tenant_id: tenantId }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify(data), { status: 201, headers: corsHeaders });
    }

    if (req.method === "DELETE" && id) {
      const { error } = await supabase.from("images").delete().eq("id", id).eq("tenant_id", tenantId);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});