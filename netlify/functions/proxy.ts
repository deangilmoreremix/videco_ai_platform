export default async (req: Request) => {
  const { action, payload } = await req.json();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (action === "openai") {
    const openaiKey = process.env.OPENAI_API_KEY!;
    headers["Authorization"] = `Bearer ${openaiKey}`;

    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  if (action === "mux_upload") {
    const muxId = process.env.MUX_TOKEN_ID!;
    const muxSecret = process.env.MUX_TOKEN_SECRET!;
    headers["Authorization"] = `Basic ${Buffer.from(`${muxId}:${muxSecret}`).toString("base64")}`;

    const res = await fetch("https://api.mux.com/video/v1/uploads", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), {
    status: 400,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
};
