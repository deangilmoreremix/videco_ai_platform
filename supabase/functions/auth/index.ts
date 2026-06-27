import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method === "POST") {
      const body = await req.json();
      const { tenant_id, email, password, full_name } = body;

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, tenant_id },
      });
      if (error) throw error;

      await supabase.from("profiles").insert({
        id: data.user.id,
        tenant_id,
        email,
        full_name,
      });

      return new Response(JSON.stringify({ user: data.user }), { headers: corsHeaders });
    }

    if (req.method === "GET") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      const token = authHeader.replace("Bearer ", "");
      const { data, error } = await supabase.auth.getUser(token);
      if (error) throw error;
      return new Response(JSON.stringify({ user: data.user }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});