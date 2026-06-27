// Netlify Function: stack-only API router
// Stack: Supabase (DB/Auth/Storage/Edge) + OpenAI (Responses API) + Muapi (video/image)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-tenant-id",
  "Content-Type": "application/json",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const MUAPI_API_KEY = Deno.env.get("MUAPI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: corsHeaders });

// -----------------------------------------------------------------------------
// Muapi helpers
// -----------------------------------------------------------------------------
async function muapiSubmit(model: string, payload: Record<string, unknown>) {
  const res = await fetch(`https://api.muapi.ai/api/v1/${model}`, {
    method: "POST",
    headers: {
      "x-api-key": MUAPI_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function muapiPoll(requestId: string) {
  const res = await fetch(
    `https://api.muapi.ai/api/v1/predictions/${requestId}/result`,
    { headers: { "x-api-key": MUAPI_API_KEY } }
  );
  return res.json();
}

async function muapiUpload(fileUrl: string) {
  const fileRes = await fetch(fileUrl);
  const blob = await fileRes.blob();
  const formData = new FormData();
  formData.append("file", blob, "input.bin");
  const res = await fetch("https://api.muapi.ai/api/v1/upload_file", {
    method: "POST",
    headers: { "x-api-key": MUAPI_API_KEY },
    body: formData,
  });
  return res.json();
}

// -----------------------------------------------------------------------------
// OpenAI helper (Responses API + chat)
// -----------------------------------------------------------------------------
async function openai(prompt: string, opts: Record<string, unknown> = {}) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input: prompt, ...opts }),
  });
  return res.json();
}

// -----------------------------------------------------------------------------
// Router
// -----------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/?/, "");

  try {
    // ---------- Auth ----------
    if (route === "auth/login" && req.method === "POST") {
      const { email, password } = await req.json();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return json({ error: error.message }, 401);
      return json({ session: data.session, user: data.user });
    }

    if (route === "auth/signup" && req.method === "POST") {
      const { email, password, full_name } = await req.json();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name } },
      });
      if (error) return json({ error: error.message }, 400);
      return json({ user: data.user });
    }

    if (route === "auth/logout" && req.method === "POST") {
      const token = req.headers.get("Authorization")?.replace("Bearer ", "");
      if (!token) return json({ error: "Unauthorized" }, 401);
      await supabase.auth.admin.signOut(token);
      return json({ ok: true });
    }

    // ---------- Videos ----------
    if (route === "videos" && req.method === "GET") {
      const tenantId = url.searchParams.get("tenant_id");
      const userId = url.searchParams.get("user_id");
      let query = supabase.from("videos").select("*").order("created_at", { ascending: false });
      if (tenantId) query = query.eq("tenant_id", tenantId);
      if (userId) query = query.eq("user_id", userId);
      const { data, error } = await query;
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    if (route === "videos" && req.method === "POST") {
      const body = await req.json();
      const { data, error } = await supabase.from("videos").insert(body).select().single();
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    if (route === "videos/text-to-video" && req.method === "POST") {
      const { prompt, model = "veo3-fast-text-to-video", tenant_id, user_id } = await req.json();
      if (!prompt) return json({ error: "prompt required" }, 400);

      const submit = await muapiSubmit(model, { prompt });
      if (!submit.request_id) return json({ error: "Muapi submit failed", detail: submit }, 502);

      const { data: job, error: jobErr } = await supabase
        .from("jobs")
        .insert({
          tenant_id,
          user_id,
          type: "text-to-video",
          model,
          provider: "muapi",
          request_id: submit.request_id,
          status: "processing",
          input: { prompt },
        })
        .select()
        .single();
      if (jobErr) return json({ error: jobErr.message }, 500);

      return json({ job });
    }

    if (route === "videos/image-to-video" && req.method === "POST") {
      const { prompt, image_url, model = "kling-o1-standard-image-to-video", tenant_id, user_id } = await req.json();
      if (!prompt || !image_url) return json({ error: "prompt and image_url required" }, 400);

      const submit = await muapiSubmit(model, { prompt, image_url });
      if (!submit.request_id) return json({ error: "Muapi submit failed", detail: submit }, 502);

      const { data: job, error: jobErr } = await supabase
        .from("jobs")
        .insert({
          tenant_id,
          user_id,
          type: "image-to-video",
          model,
          provider: "muapi",
          request_id: submit.request_id,
          status: "processing",
          input: { prompt, image_url },
        })
        .select()
        .single();
      if (jobErr) return json({ error: jobErr.message }, 500);

      return json({ job });
    }

    if (route.startsWith("videos/") && route.endsWith("/poll") && req.method === "POST") {
      const id = route.split("/")[1];
      const { data: job, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !job) return json({ error: "job not found" }, 404);

      const result = await muapiPoll(job.request_id);
      if (result.status === "completed") {
        await supabase
          .from("jobs")
          .update({ status: "completed", output: result, completed_at: new Date().toISOString() })
          .eq("id", id);

        // Persist output URLs to videos table
        const outputs: string[] = result.outputs || [];
        if (outputs.length && job.user_id) {
          await supabase.from("videos").insert({
            tenant_id: job.tenant_id,
            user_id: job.user_id,
            url: outputs[0],
            type: job.type,
            job_id: job.id,
            source: "muapi",
          });
        }
        return json({ status: "completed", outputs });
      }

      if (result.status === "failed") {
        await supabase
          .from("jobs")
          .update({ status: "failed", error: result.error, completed_at: new Date().toISOString() })
          .eq("id", id);
      }

      return json({ status: result.status, result });
    }

    // ---------- Images ----------
    if (route === "images/text-to-image" && req.method === "POST") {
      const { prompt, model = "flux-schnell", tenant_id, user_id } = await req.json();
      if (!prompt) return json({ error: "prompt required" }, 400);

      const submit = await muapiSubmit(model, { prompt });
      if (!submit.request_id) return json({ error: "Muapi submit failed", detail: submit }, 502);

      const { data: job, error: jobErr } = await supabase
        .from("jobs")
        .insert({
          tenant_id,
          user_id,
          type: "text-to-image",
          model,
          provider: "muapi",
          request_id: submit.request_id,
          status: "processing",
          input: { prompt },
        })
        .select()
        .single();
      if (jobErr) return json({ error: jobErr.message }, 500);

      return json({ job });
    }

    if (route === "images/upload" && req.method === "POST") {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      const tenantId = formData.get("tenant_id") as string;

      const ext = file.name.split(".").pop() || "bin";
      const path = `${tenantId}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage.from("uploads").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) return json({ error: error.message }, 500);

      const { data: pub } = supabase.storage.from("uploads").getPublicUrl(path);
      return json({ url: pub.publicUrl, path });
    }

    // ---------- AI Script (OpenAI Responses API) ----------
    if (route === "ai/script" && req.method === "POST") {
      const { prompt, tenant_id, user_id } = await req.json();
      if (!prompt) return json({ error: "prompt required" }, 400);

      const result = await openai(prompt);
      const text = result.output_text || result.output?.[0]?.content?.[0]?.text || "";

      const { data: saved, error } = await supabase
        .from("scripts")
        .insert({ tenant_id, user_id, prompt, output: text })
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      return json(saved);
    }

    // ---------- Leads / Form Submissions ----------
    if (route === "leads" && req.method === "POST") {
      const body = await req.json();
      const { data, error } = await supabase.from("leads").insert(body).select().single();
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    if (route === "leads" && req.method === "GET") {
      const tenantId = url.searchParams.get("tenant_id");
      const userId = url.searchParams.get("user_id");
      let query = supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (tenantId) query = query.eq("tenant_id", tenantId);
      if (userId) query = query.eq("user_id", userId);
      const { data, error } = await query;
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    if (route === "submissions" && req.method === "POST") {
      const body = await req.json();
      const { data, error } = await supabase.from("submissions").insert(body).select().single();
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    if (route === "feedback" && req.method === "POST") {
      const body = await req.json();
      const { data, error } = await supabase.from("feedback").insert(body).select().single();
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    // ---------- Jobs ----------
    if (route === "jobs" && req.method === "GET") {
      const userId = url.searchParams.get("user_id");
      const tenantId = url.searchParams.get("tenant_id");
      let query = supabase.from("jobs").select("*").order("created_at", { ascending: false });
      if (userId) query = query.eq("user_id", userId);
      if (tenantId) query = query.eq("tenant_id", tenantId);
      const { data, error } = await query;
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    if (route.startsWith("jobs/") && req.method === "GET") {
      const id = route.split("/")[1];
      const { data, error } = await supabase.from("jobs").select("*").eq("id", id).single();
      if (error) return json({ error: error.message }, 404);
      return json(data);
    }

    // ---------- Storage helpers ----------
    if (route === "storage/signed-url" && req.method === "POST") {
      const { bucket, path, expiresIn = 3600 } = await req.json();
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);
      if (error) return json({ error: error.message }, 500);
      return json(data);
    }

    if (route === "storage/upload" && req.method === "POST") {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      const bucket = formData.get("bucket") as string || "uploads";
      const tenantId = formData.get("tenant_id") as string;
      const path = `${tenantId}/${crypto.randomUUID()}-${file.name}`;

      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) return json({ error: error.message }, 500);

      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      return json({ url: pub.publicUrl, path });
    }

    return json({ error: "Not found", route }, 404);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});