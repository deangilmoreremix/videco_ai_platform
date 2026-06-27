import crypto from "crypto";

export default async (req: Request) => {
  const body = await req.text();
  const signature = req.headers.get("mux-signature");

  const muxSecret = process.env.MUX_WEBHOOK_SECRET;
  if (!muxSecret || !signature) {
    return new Response("Unauthorized", { status: 401 });
  }

  const expected = crypto
    .createHmac("sha256", muxSecret)
    .update(body)
    .digest("hex");

  if (signature !== expected) {
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(body);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  await fetch(`${supabaseUrl}/rest/v1/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
      "Prefer": "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      type: event.type,
      data: event.data,
    }),
  });

  return new Response("OK", { status: 200 });
};
