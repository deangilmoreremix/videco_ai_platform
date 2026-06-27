import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-tenant-id",
  "Content-Type": "application/json",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const MUAPI_API_KEY = Deno.env.get("MUAPI_API_KEY");

async function muapiSubmit(model: string, payload: Record<string, unknown>) {
  const res = await fetch(`https://api.muapi.ai/api/v1/${model}`, {
    method: "POST",
    headers: { "x-api-key": MUAPI_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function muapiPoll(requestId: string) {
  const res = await fetch(`https://api.muapi.ai/api/v1/predictions/${requestId}/result`, {
    headers: { "x-api-key": MUAPI_API_KEY },
  });
  return res.json();
}

async function openaiGenerate(prompt: string, opts: Record<string, unknown> = {}) {
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const id = url.searchParams.get("id");

  try {
    // Submit a video generation job
    if (action === "text-to-video" && req.method === "POST") {
      const { tenant_id, user_id, prompt, model = "veo3-fast-text-to-video" } = await req.json();
      if (!prompt || !tenant_id) return new Response(JSON.stringify({ error: "prompt and tenant_id required" }), { status: 400, headers: corsHeaders });

      const submit = await muapiSubmit(model, { prompt });
      if (!submit.request_id) return new Response(JSON.stringify({ error: "Muapi submit failed", detail: submit }), { status: 502, headers: corsHeaders });

      const { data, error } = await supabase.from("jobs").insert({
        tenant_id,
        user_id,
        type: "text-to-video",
        model,
        provider: "muapi",
        request_id: submit.request_id,
        status: "processing",
        input: { prompt },
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify(data), { status: 201, headers: corsHeaders });
    }

    if (action === "image-to-video" && req.method === "POST") {
      const { tenant_id, user_id, prompt, image_url, model = "kling-o1-standard-image-to-video" } = await req.json();
      if (!prompt || !image_url || !tenant_id) return new Response(JSON.stringify({ error: "prompt, image_url, tenant_id required" }), { status: 400, headers: corsHeaders });

      const submit = await muapiSubmit(model, { prompt, image_url });
      if (!submit.request_id) return new Response(JSON.stringify({ error: "Muapi submit failed", detail: submit }), { status: 502, headers: corsHeaders });

      const { data, error } = await supabase.from("jobs").insert({
        tenant_id,
        user_id,
        type: "image-to-video",
        model,
        provider: "muapi",
        request_id: submit.request_id,
        status: "processing",
        input: { prompt, image_url },
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify(data), { status: 201, headers: corsHeaders });
    }

    if (action === "text-to-image" && req.method === "POST") {
      const { tenant_id, user_id, prompt, model = "flux-schnell" } = await req.json();
      if (!prompt || !tenant_id) return new Response(JSON.stringify({ error: "prompt and tenant_id required" }), { status: 400, headers: corsHeaders });

      const submit = await muapiSubmit(model, { prompt });
      if (!submit.request_id) return new Response(JSON.stringify({ error: "Muapi submit failed", detail: submit }), { status: 502, headers: corsHeaders });

      const { data, error } = await supabase.from("jobs").insert({
        tenant_id,
        user_id,
        type: "text-to-image",
        model,
        provider: "muapi",
        request_id: submit.request_id,
        status: "processing",
        input: { prompt },
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify(data), { status: 201, headers: corsHeaders });
    }

    if (action === "ai-script" && req.method === "POST") {
      const { tenant_id, user_id, prompt, model = "gpt-4o-mini" } = await req.json();
      if (!prompt || !tenant_id) return new Response(JSON.stringify({ error: "prompt and tenant_id required" }), { status: 400, headers: corsHeaders });

      const result = await openaiGenerate(prompt, { model });
      const text = result.output_text || result.output?.[0]?.content?.[0]?.text || "";

      const { data, error } = await supabase.from("scripts").insert({
        tenant_id,
        user_id,
        prompt,
        output: text,
        model,
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify(data), { status: 201, headers: corsHeaders });
    }

    // Poll a job's status
    if (action === "poll" && id) {
      const { data: job, error } = await supabase.from("jobs").select("*").eq("id", id).single();
      if (error || !job) return new Response(JSON.stringify({ error: "job not found" }), { status: 404, headers: corsHeaders });

      const result = await muapiPoll(job.request_id);

      if (result.status === "completed") {
        const outputs: string[] = result.outputs || [];
        await supabase.from("jobs").update({
          status: "completed",
          output: result,
          completed_at: new Date().toISOString(),
        }).eq("id", id);

        // Persist outputs into appropriate resource table
        if (outputs.length && job.tenant_id) {
          if (job.type === "text-to-video" || job.type === "image-to-video") {
            await supabase.from("videos").insert({
              tenant_id: job.tenant_id,
              user_id: job.user_id,
              url: outputs[0],
              type: job.type,
              job_id: job.id,
              source: "muapi",
            });
          } else if (job.type === "text-to-image") {
            await supabase.from("images").insert({
              tenant_id: job.tenant_id,
              user_id: job.user_id,
              url: outputs[0],
              job_id: job.id,
              source: "muapi",
            });
          }
        }
        return new Response(JSON.stringify({ status: "completed", outputs }), { headers: corsHeaders });
      }

      if (result.status === "failed") {
        await supabase.from("jobs").update({
          status: "failed",
          error: result.error,
          completed_at: new Date().toISOString(),
        }).eq("id", id);
      }

      return new Response(JSON.stringify({ status: result.status, result }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});