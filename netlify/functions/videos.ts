import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-tenant-id',
  'Content-Type': 'application/json',
} as const;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const tenantClient = (tenantId: string) =>
  createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { headers: { 'x-tenant-id': tenantId } } }
  );

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: 'ok' };
  }

  const tenantId = event.headers['x-tenant-id'] || event.headers['X-Tenant-Id'];
  if (!tenantId) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'x-tenant-id required' }) };
  }

  const url = new URL(event.rawUrl || `https://example.com${event.path}`);
  const id = url.searchParams.get('id');
  const client = tenantClient(tenantId);

  try {
    if (event.httpMethod === 'GET' && !id) {
      const { data, error } = await client
        .from('videos')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(data) };
    }

    if (event.httpMethod === 'GET' && id) {
      const { data, error } = await client
        .from('videos')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();
      if (error) throw error;
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(data) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { data, error } = await client
        .from('videos')
        .insert({ ...body, tenant_id: tenantId })
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 201, headers: corsHeaders, body: JSON.stringify(data) };
    }

    if (event.httpMethod === 'PUT' && id) {
      const body = JSON.parse(event.body || '{}');
      const { data, error } = await client
        .from('videos')
        .update(body)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();
      if (error) throw error;
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(data) };
    }

    if (event.httpMethod === 'DELETE' && id) {
      const { error } = await client
        .from('videos')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: (err as Error).message }) };
  }
};
