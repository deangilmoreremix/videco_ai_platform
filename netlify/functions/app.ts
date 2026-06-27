import { createClient } from "@supabase/supabase-js";
import { v2 as cloudinary } from "cloudinary";
import { Inngest } from "inngest";
import Stripe from "stripe";

export const config = {
  api: {
    bodyParser: { sizeLimit: "500mb" },
  },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-tenant-id",
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const inngest = new Inngest({ id: "videco", name: "Videco AI" });
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, "") || "/";
  const segments = path.split("/").filter(Boolean);

  try {
    if (path.startsWith("/v1/videos")) {
      return handleVideoRoutes(req, segments.slice(2));
    }

    if (path.startsWith("/v1/auth")) {
      return handleAuthRoutes(req, segments.slice(2));
    }

    if (path.startsWith("/v1/leads")) {
      return handleLeadsRoutes(req, segments.slice(2));
    }

    if (path.startsWith("/v1/submissions")) {
      return handleSubmissionRoutes(req, segments.slice(1));
    }

    if (path.startsWith("/brevo")) {
      return handleBrevoRoutes(req, segments.slice(1));
    }

    if (path.startsWith("/webhooks")) {
      return handleWebhookRoutes(req, segments.slice(1));
    }

    if (path.startsWith("/stripe")) {
      return handleStripeRoutes(req, segments.slice(1));
    }

    if (path.startsWith("/credits")) {
      return handleCreditsRoutes(req);
    }

    if (path.startsWith("/mail")) {
      return handleMailRoutes(req, segments.slice(1));
    }

    if (path.startsWith("/feedback")) {
      return handleFeedbackRoutes(req, segments.slice(1));
    }

    if (path.startsWith("/upload")) {
      return handleUploadRoutes(req);
    }

    if (path.startsWith("/inngest")) {
      return handleInngest(req);
    }

    if (path.startsWith("/video/send")) {
      return handleVideoSend(req, segments.slice(1));
    }

    return jsonResponse({ error: "Not Found" }, 404);
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 500);
  }
};

async function handleVideoRoutes(req: Request, segments: string[]) {
  if (segments.length === 0 && req.method === "GET") {
    const { data } = await supabase.from("videos").select("*");
    return jsonResponse(data);
  }

  if (segments.length === 0 && req.method === "POST") {
    const body = await req.json();
    const { data } = await supabase.from("videos").insert(body);
    return jsonResponse(data);
  }

  if (segments[0] === "create-intro" && req.method === "POST") {
    const body = await req.json();
    const { greeting, language, video_id: videoId, audio, text, email, userId, userName } = body;

    const { data: job } = await supabase
      .from("jobs")
      .insert([{ job_details: { video_id: videoId }, status: "pending" }])
      .select("id")
      .single();

    await inngest.send({
      name: "ai/intro",
      data: { video_id: videoId, job_id: job.id, audio, text, language, userId, userName, email, greeting },
    });

    return jsonResponse({ success: true, job_id: job.id });
  }

  if (segments[0] === "process" && req.method === "POST") {
    const body = await req.json();
    const { greeting, language, ai_video_id: aiVideoId, voice_id: voiceId, text, background, website, voiceCloningEnabled = true, og_video_public_id: ogVideoPublicId } = body;

    const { data: job } = await supabase
      .from("jobs")
      .insert([{ job_details: { ai_video_id: aiVideoId }, status: "pending" }])
      .select("id")
      .single();

    await inngest.send({
      name: "ai/process",
      data: { ai_video_id: aiVideoId, job_id: job.id, text, language, voice_id: voiceId, greeting, background, og_video_public_id: ogVideoPublicId, website, voiceCloningEnabled },
    });

    return jsonResponse({ success: true, event: { job_id: job.id } });
  }

  if (segments[0] === "clone" && req.method === "POST") {
    const body = await req.json();
    const { video_url: videoUrl, language, ai_video_id: aiVideoId, voice_id: voiceId, text, video_id: videoId } = body;

    const { data: job } = await supabase
      .from("jobs")
      .insert([{ job_details: { ai_video_id: aiVideoId }, status: "pending" }])
      .select("id")
      .single();

    await inngest.send({
      name: "ai/clone",
      data: { ai_video_id: aiVideoId, job_id: job.id, text, language, voice_id: voiceId, video_url: videoUrl, video_id: videoId },
    });

    return jsonResponse({ success: true, event: { job_id: job.id } });
  }

  if (segments[0] === "combine" && req.method === "POST") {
    const body = await req.json();
    const { blobPublicId, newVideoPublicId } = body;

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const combinedResult = cloudinary.url(blobPublicId, {
      resource_type: "video",
      transformation: [
        { flags: "splice", overlay: `video:${newVideoPublicId}` },
        { flags: "layer_apply" },
      ],
    });

    return jsonResponse(combinedResult);
  }

  if (segments[0] === "cloudinary" && req.method === "POST") {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("user_id") as string;
    const videoId = formData.get("video_id") as string;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_large(
        buffer,
        { resource_type: "video", chunk_size: 6000000 },
        (error: any, result: any) => (error ? reject(error) : resolve(result))
      );
    });

    if (videoId && userId) {
      await supabase.from("videos").update({ training_audio: (result as any).secure_url }).eq("user_id", userId).eq("id", videoId);
    }

    return jsonResponse(result);
  }

  if (segments[0] === "create-preview" && req.method === "POST") {
    const body = await req.json();
    const muxTokenId = process.env.MUX_TOKEN_ID;
    const muxTokenSecret = process.env.MUX_TOKEN_SECRET;

    const res = await fetch("https://api.mux.com/video/v1/assets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${muxTokenId}:${muxTokenSecret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        input: [{ url: body.aws_url }],
        playback_policy: ["public"],
        encoding_tier: "baseline",
        passthrough: `${Date.now()}`,
      }),
    });

    const data = await res.json();
    return jsonResponse({ result: data });
  }

  if (segments[0] === "get-clone" && req.method === "POST") {
    const body = await req.json();
    const { id } = body;
    const { data: getVideo } = await supabase.from("videos").select("ai_preview, media_status, url").eq("id", id).single();

    if (getVideo?.media_status === "in_progress") {
      const syncRes = await fetch(`https://api.sync.so/v2/generate/${getVideo.ai_preview}`, {
        headers: { "x-api-key": process.env.SYNC_API_KEY, "Content-Type": "application/json" },
      });
      const syncData = await syncRes.json();

      if (syncData?.outputUrl && !syncData?.error) {
        const uploadData = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload_large(
            syncData.outputUrl,
            { resource_type: "video", chunk_size: 6000000 },
            (error: any, result: any) => (error ? reject(error) : resolve(result))
          );
        });

        if ((uploadData as any).playback_url) {
          const { data } = await supabase
            .from("videos")
            .update({ url: (uploadData as any).playback_url, media_status: "ready" })
            .eq("id", id)
            .select("ai_preview, media_status, url");

          return jsonResponse({ status: data?.[0]?.media_status, ai_preview: data?.[0]?.ai_preview, url: data?.[0]?.url });
        }
      }
    }

    return jsonResponse({ status: getVideo?.media_status });
  }

  if (segments[0] === "endpoint" && req.method === "POST") {
    const muxTokenId = process.env.MUX_TOKEN_ID;
    const muxTokenSecret = process.env.MUX_TOKEN_SECRET;

    const res = await fetch("https://api.mux.com/video/v1/uploads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${muxTokenId}:${muxTokenSecret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        cors_origin: "*",
        new_asset_settings: {
          passthrough: `${Date.now()}`,
          playback_policy: "public",
          mp4_support: "standard",
        },
      }),
    });

    const data = await res.json();
    return jsonResponse({ result: data });
  }

  if (segments[0] === "onboarding" && req.method === "POST") {
    const body = await req.json();
    const { greeting, language, user_id: userId, voice_id: voiceId, text, background, website, voiceCloningEnabled = true, og_video_public_id } = body;

    const { data: job } = await supabase
      .from("jobs")
      .insert([{ job_details: { user_id: userId }, status: "pending" }])
      .select("id")
      .single();

    await inngest.send({
      name: "ai/onboarding",
      data: { user_id: userId, job_id: job.id, text, language, voice_id: voiceId, greeting, background, og_video_public_id, website, voiceCloningEnabled },
    });

    return jsonResponse({ success: true, event: { job_id: job.id } });
  }

  if (segments.length > 0 && segments[segments.length - 1] === "assets") {
    const body = await req.json();
    const { data: assetData, type } = body;

    if (type !== "video.asset.ready") {
      return jsonResponse({ result: "not-used" });
    }

    await supabase
      .from("videos")
      .update({
        url: `https://stream.mux.com/${assetData.playback_ids?.[0]?.id}.m3u8`,
        status: "ready",
        playback_id: assetData.playback_ids?.[0]?.id,
      })
      .eq("passthrough_id", assetData.passthrough);

    return jsonResponse({ result: "success" });
  }

  return jsonResponse({ error: "Not Found" }, 404);
}

async function handleAuthRoutes(req: Request, segments: string[]) {
  if (segments[0] === "login" && req.method === "POST") {
    const body = await req.json();
    const { api_key } = body;

    const validateAPIKey = (str: string) => /^api_.*_videco\.io$/.test(str);
    if (!api_key || !validateAPIKey(api_key)) {
      return jsonResponse({ error: "Not authorized" }, 500);
    }

    const { data: apikeyData } = await supabase.from("apikey").select("user_id").eq("key", api_key).single();

    if (!apikeyData) {
      return jsonResponse({ error: "Not authorized" }, 500);
    }

    return jsonResponse({ token: api_key });
  }

  return jsonResponse({ error: "Not Found" }, 404);
}

async function handleLeadsRoutes(req: Request, segments: string[]) {
  if (segments.length === 0) {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const userId = url.searchParams.get("user_id");
      const { data } = await supabase.from("leads").select("*").eq("user_id", userId);
      return jsonResponse(data);
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { user_id: userId } = body;
      const { data } = await supabase.from("leads").select("*").eq("user_id", userId);
      return jsonResponse(data);
    }
  }

  return jsonResponse({ error: "Not Found" }, 404);
}

async function handleSubmissionRoutes(req: Request, segments: string[]) {
  if (segments.length === 0 && req.method === "POST") {
    const body = await req.json();
    const { form_id, form_name, video_id, user_id: userId, data: formData } = body;
    const { data } = await supabase.from("leads").insert({ form_id, form_name, video_id, user_id: userId, data: formData });
    return jsonResponse({ result: data });
  }

  return jsonResponse({ error: "Not Found" }, 404);
}

async function handleStripeRoutes(req: Request, segments: string[]) {
  if (segments[0] === "webhook") {
    return handleStripeWebhook(req);
  }

  if (segments[0] === "checkout" && req.method === "POST") {
    const body = await req.json();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: body.priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
      metadata: { userId: body.userId },
    });
    return jsonResponse({ url: session.url });
  }

  if (segments[0] === "subscribe" && req.method === "GET") {
    const sessionId = new URL(req.url).searchParams.get("session_id");
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return jsonResponse(session);
  }

  if (segments[0] === "portal" && req.method === "POST") {
    const body = await req.json();
    const session = await stripe.billingPortal.sessions.create({
      customer: body.customerId,
      return_url: process.env.NEXT_PUBLIC_SITE_URL,
    });
    return jsonResponse({ url: session.url });
  }

  if (segments[0] === "customer" && req.method === "POST") {
    const body = await req.json();
    const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", body.userId).single();

    if (profile?.stripe_customer_id) {
      return jsonResponse({ customerId: profile.stripe_customer_id });
    }

    const customer = await stripe.customers.create({ metadata: { userId: body.userId } });
    await supabase.from("profiles").update({ stripe_customer_id: customer.id }).eq("id", body.userId);
    return jsonResponse({ customerId: customer.id });
  }

  if (segments[0] === "payment" && req.method === "POST") {
    const body = await req.json();
    const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", body.userId).single();
    const paymentIntents = await stripe.paymentIntents.list({ customer: profile.stripe_customer_id, limit: 10 });
    return jsonResponse({ paymentIntents: paymentIntents.data });
  }

  return jsonResponse({ error: "Not Found" }, 404);
}

async function handleCreditsRoutes(req: Request) {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const body = await req.json();
  const { user_id: userId } = body;

  const { data: videos } = await supabase.from("videos").select().eq("user_id", userId);
  const { data: aiVideos } = await supabase.from("ai_videos").select().eq("user_id", userId);
  const { data: subAccounts } = await supabase.from("sub_accounts").select().eq("main_account", userId);
  const { data: currentPlan } = await supabase.from("plan").select().eq("user_id", userId).single();

  const resetExpired = isResetExpired(currentPlan.last_reset_date);

  const { data, error } = await supabase
    .from("plan")
    .update({
      dynamic_videos_limit: resetExpired
        ? planUsage(currentPlan.plan_name).dynamicVideos[1]
        : planUsage(currentPlan.plan_name).dynamicVideos[1] - (aiVideos?.length || 0),
      video_limit: resetExpired
        ? planUsage(currentPlan.plan_name).videos[1]
        : Number(planUsage(currentPlan.plan_name).videos[1]) - (videos?.length || 0),
      seat_limit: resetExpired
        ? planUsage(currentPlan.plan_name).seat[1]
        : planUsage(currentPlan.plan_name).seat[1] - (subAccounts?.length || 0),
      credits: 0,
      last_reset_date: resetExpired ? new Date().toISOString().slice(0, 10) : currentPlan.last_reset_date,
    })
    .eq("user_id", userId)
    .select();

  return jsonResponse({ data });
}

async function handleMailRoutes(req: Request, segments: string[]) {
  const brevoApiKey = process.env.BREVO_API_KEY;

  if (segments[0] === "invite" && req.method === "POST") {
    const { email, name } = await req.json();
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json", "api-key": brevoApiKey },
      body: JSON.stringify({
        sender: { name: "Malith from Videco", email: "no-reply@videco.io" },
        to: [{ email, name }],
        templateId: 1,
      }),
    });
    return jsonResponse({ result: "invite sent" });
  }

  if (segments[0] === "welcome" && req.method === "POST") {
    const { email } = await req.json();
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json", "api-key": brevoApiKey },
      body: JSON.stringify({
        sender: { name: "Malith from Videco", email: "no-reply@videco.io" },
        to: [{ email }],
        templateId: 2,
      }),
    });
    return jsonResponse({ result: "welcome sent" });
  }

  if (segments[0] === "delete" && req.method === "POST") {
    const { email } = await req.json();
    await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json", "api-key": brevoApiKey },
      body: JSON.stringify({
        sender: { name: "Malith from Videco", email: "no-reply@videco.io" },
        to: [{ email }],
        templateId: 3,
      }),
    });
    return jsonResponse({ result: "delete sent" });
  }

  if (segments[0] === "send" && req.method === "POST") {
    const { to, subject, html, text } = await req.json();
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { apiKey: brevoApiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: "Videco", email: "noreply@videco.io" },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });
    return jsonResponse(await res.json());
  }

  return jsonResponse({ error: "Not Found" }, 404);
}

async function handleFeedbackRoutes(req: Request, segments: string[]) {
  if (segments[0] === "submit" && req.method === "POST") {
    const body = await req.json();
    const { question, answer, user_id: userId, video_id: videoId, session_id: sessionId, key } = body;

    if (process.env.FEEDBACK_SECRET_KEY !== key) {
      return jsonResponse({ result: "Not authorized" }, 403);
    }

    const { data } = await supabase
      .from("feedback")
      .insert({ question, answer, user_id: userId, video_id: videoId, session_id: sessionId });

    return jsonResponse({ result: data });
  }

  return jsonResponse({ error: "Not Found" }, 404);
}

async function handleUploadRoutes(req: Request) {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const tenantId = formData.get("tenant_id") as string;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const path = `${tenantId}/${file.name}`;
  const { error } = await supabase.storage.from("videco-assets").upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) {
    return jsonResponse({ error: "Upload failed" }, 500);
  }

  return jsonResponse({ success: true, path });
}

async function handleVideoSend(req: Request, segments: string[]) {
  return jsonResponse({ message: "Video send endpoint" });
}

async function handleInngest(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const contentType = req.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await req.json() : {};

  const events = Array.isArray(body) ? body : [body];

  for (const event of events) {
    if (event.name === "ai/process") {
      const { ai_video_id, job_id, text, language, voice_id, greeting, background, og_video_public_id, website, voiceCloningEnabled } = event.data;
      await supabase.from("ai_videos").update({ status: "pending" }).eq("id", ai_video_id);
      await supabase.from("jobs").update({ job_details: event, status: "processing" }).eq("id", job_id);
    }

    if (event.name === "ai/onboarding") {
      const { user_id, job_id, text, language, voice_id, greeting, background, og_video_public_id, website, voiceCloningEnabled } = event.data;
      await supabase.from("ai_videos").update({ status: "pending" }).eq("id", user_id);
      await supabase.from("jobs").update({ job_details: event, status: "processing" }).eq("id", job_id);
    }

    if (event.name === "ai/intro") {
      const { video_id, job_id, audio, text, language, userId, userName, email, greeting } = event.data;
      await supabase.from("jobs").update({ job_details: event, status: "processing" }).eq("id", job_id);
    }

    if (event.name === "ai/clone") {
      const { ai_video_id, job_id, text, language, voice_id, video_url, video_id } = event.data;
      await supabase.from("jobs").update({ job_details: event, status: "processing" }).eq("id", job_id);
    }
  }

  return jsonResponse({ received: events.map(e => e.name) });
}

async function handleStripeWebhook(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOKS_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return jsonResponse(`Webhook Error: ${(err as Error).message}`, 400);
  }

  const session = event.data.object;
  if (event.type === "invoice.payment_succeeded" || event.type === "payment_intent.succeeded") {
    const userId =
      event.type === "payment_intent.succeeded"
        ? session.metadata?.userId
        : session.subscription_details?.metadata?.userId;

    await supabase
      .from("plan")
      .update({
        free_trial_start_date: event.type === "payment_intent.succeeded" ? new Date().toISOString().slice(0, 10) : null,
        free_trial_ended: true,
        plan_name: session.subscription_details?.metadata?.plan_name,
        status: event.type === "payment_intent.succeeded" ? "free_trial" : "active",
      })
      .eq("user_id", userId);

    await supabase.from("profiles").update({ onboard_completed: true }).eq("id", userId);
  }

  return new Response("OK", { status: 200 });
}

function isResetExpired(dateString: string) {
  if (!dateString) return true;
  const lastReset = new Date(dateString);
  const now = new Date();
  const diffDays = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 30;
}

function planUsage(planName: string) {
  const plans = {
    lite: { videos: [5, 5], dynamicVideos: [5, 5], seat: [1, 1] },
    growth: { videos: [20, 20], dynamicVideos: [20, 20], seat: [3, 3] },
    scale: { videos: [50, 50], dynamicVideos: [50, 50], seat: [10, 10] },
  };
  return plans[planName] || plans.lite;
}

async function handleBrevoRoutes(req: Request, segments: string[]) {
  if (segments[0] === "start-trial" && req.method === "POST") {
    const body = await req.json();
    const brevoApiKey = process.env.BREVO_API_KEY;

    if (process.env.BREVO_SECRET_KEY !== body.key) {
      return jsonResponse({ result: "Not authorized" }, 403);
    }

    let listIds = [21];
    switch (body.plan_name) {
      case "light":
        listIds = [21];
        break;
      case "growth":
        listIds = [22];
        break;
      case "scale":
        listIds = [23];
        break;
      default:
        listIds = [21];
    }

    await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify({
        email: body.user_email,
        listIds,
      }),
    });

    return jsonResponse({ result: "invite sent" });
  }

  return jsonResponse({ error: "Not Found" }, 404);
}

async function handleWebhookRoutes(req: Request, segments: string[]) {
  if (segments[0] === "sync") {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method Not Allowed" }, 405);
    }

    const body = await req.json();

    await supabase
      .from("videos")
      .update({
        url: body.outputUrl,
        media_status: "ready",
      })
      .eq("ai_preview", body.id);

    return jsonResponse({ message: "Webhook processed" });
  }

  return jsonResponse({ error: "Not Found" }, 404);
}
