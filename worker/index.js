// Exchanges a GitHub OAuth "code" for an access token.
// GitHub requires the client secret for this step, so it can't happen in the browser.
// Deploy: see ../README.md "Set up GitHub login".
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const cors = allowed.includes(origin)
      ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', Vary: 'Origin' }
      : { Vary: 'Origin' };
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors } });

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    if (url.pathname !== '/token' || request.method !== 'POST') return json({ error: 'not_found' }, 404);
    if (!cors['Access-Control-Allow-Origin']) return json({ error: 'origin_not_allowed' }, 403);

    let code;
    try { ({ code } = await request.json()); } catch {}
    if (typeof code !== 'string' || !/^[\w-]{4,100}$/.test(code)) return json({ error: 'bad_request' }, 400);

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'ytm-theme-auth' },
      body: JSON.stringify({ client_id: String(env.GITHUB_CLIENT_ID || '').trim(), client_secret: String(env.GITHUB_CLIENT_SECRET || '').trim(), code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.access_token) {
      // Diagnostics only: shows which Client ID was used and how long the stored secret is, never the secret itself.
      const secret = String(env.GITHUB_CLIENT_SECRET || '');
      const hint = data.error === 'incorrect_client_credentials'
        ? ` (worker used client ID "${env.GITHUB_CLIENT_ID || '(empty)'}", stored secret is ${secret.length} characters${secret !== secret.trim() ? ' and has spaces around it' : ''}; a GitHub client secret is 40 characters)`
        : '';
      return json({ error: data.error || 'exchange_failed', error_description: (data.error_description || '') + hint }, 400);
    }
    return json({ access_token: data.access_token, scope: data.scope, token_type: data.token_type });
  },
};
