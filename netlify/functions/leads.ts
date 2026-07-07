import { Handler } from '@netlify/functions';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tenant-id',
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

  const tenantId = event.headers['x-tenant-id'] || event.headers['X-Tenant-Id'];
  if (!tenantId) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'x-tenant-id required' }) };
  }

  try {
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { data, error } = await supabase
        .from('leads')
        .insert({ ...body, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 201, headers: corsHeaders, body: JSON.stringify(data) };
    }

    if (event.httpMethod === 'GET') {
      const params = event.queryStringParameters || {};
      const userId = params.user_id;
      let query = supabase
        .from('leads')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) throw error;
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(data) };
    }

    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: (err as Error).message }) };
  }
};
