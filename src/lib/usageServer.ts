// Server-side usage logger for Edge/Netlify functions
const fetch = globalThis.fetch;

export async function logUsageServer({ supabaseUrl, supabaseServiceKey, user_id, model, provider, action, details, cost_estimate }) {
  try {
    await fetch(`${supabaseUrl}/rest/v1/usage`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id, model, provider, action, details, cost_estimate })
    });
  } catch (e) {
    console.error('Server usage log failed', e);
  }
}
