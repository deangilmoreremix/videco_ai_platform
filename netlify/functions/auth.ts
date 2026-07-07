import { Handler } from '@netlify/functions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const supabase = (await import('@supabase/supabase-js')).createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: 'ok' };
  }

  try {
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { tenant_id, email, password, full_name } = body;

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, tenant_id },
      });
      if (error) throw error;

      await supabase.from('profiles').insert({
        id: data.user.id,
        tenant_id,
        email,
        full_name,
      });

      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ user: data.user }) };
    }

    if (event.httpMethod === 'GET') {
      const authHeader = event.headers.Authorization || event.headers.authorization;
      if (!authHeader) return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
      const token = authHeader.replace('Bearer ', '');
      const { data, error } = await supabase.auth.getUser(token);
      if (error) throw error;
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ user: data.user }) };
    }

    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: (err as Error).message }) };
  }
};
