// Usage logger for Muapi/OpenAI usage tracking
// Client-side usage logger (best-effort). Server-side logging uses src/lib/usageServer.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const supabase = createClientComponentClient();

export async function logUsage({ user_id, model, provider, action, details, cost_estimate }) {
  try {
    await supabase.from('usage').insert([{ user_id, model, provider, action, details, cost_estimate }]);
  } catch (e) {
    console.error('Usage log failed', e);
  }
}
