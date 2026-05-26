const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfigured' }) };
  }

  const authHeader = event.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const jwt = authHeader.slice(7);

  // Verify caller is a coach using their own JWT (anon key, not service role)
  const userClient = createClient(supabaseUrl, process.env.VITE_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid session' }) };
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !['coach', 'admin'].includes(profile.role)) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Must be a coach or admin' }) };
  }

  let body;
  try { body = JSON.parse(event.body); } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { email, coachId } = body;
  if (!email || !coachId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'email and coachId required' }) };
  }

  // Coaches can only invite for themselves; admins can invite for any coach
  if (profile.role === 'coach' && coachId !== user.id) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Coaches can only invite for their own roster' }) };
  }

  const siteUrl = process.env.URL || 'https://mhsbrainbowl.com';

  const { error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: siteUrl,
    data: { invited_by_coach: coachId },
  });

  if (inviteErr) {
    // "User already registered" is not a hard failure — they just need to sign in
    const alreadyExists = inviteErr.message?.toLowerCase().includes('already');
    return {
      statusCode: alreadyExists ? 200 : 400,
      body: JSON.stringify(
        alreadyExists
          ? { success: true, note: 'User already registered — they will be assigned on next sign-in' }
          : { error: inviteErr.message }
      ),
    };
  }

  return { statusCode: 200, body: JSON.stringify({ success: true }) };
};
