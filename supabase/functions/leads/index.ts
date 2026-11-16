// Retired. The browser uses the `api` Edge Function for everything this
// function used to do. The previous code trusted a caller-supplied
// x-tenant-id header (or, for ai-orchestrator, an x-muapi-webhook header)
// while holding the service-role key, so anyone could read or write any
// tenant's data or spend the Muapi/OpenAI credits. Kept deployed as a stub so
// the old public URL stops working instead of serving that code.
Deno.serve(() =>
  new Response(
    JSON.stringify({ error: "Gone: use /functions/v1/api instead" }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  )
);
