// GitHub login and API helpers. The access token is kept in localStorage so people stay signed in.
import { AUTH, REPO } from './config.js';

const TOKEN_KEY = 'ytm.gh.token';
const USER_KEY = 'ytm.gh.user';
const STATE_KEY = 'ytm.gh.state';
const RETURN_KEY = 'ytm.gh.return';

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
const session = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch {} },
  del(k) { try { sessionStorage.removeItem(k); } catch {} },
};

export const loginEnabled = Boolean(AUTH.clientId && AUTH.tokenUrl);

export function token() { return store.get(TOKEN_KEY); }
export function user() { try { return JSON.parse(store.get(USER_KEY)); } catch { return null; } }
export function signedIn() { return Boolean(token()); }

function siteBase() {
  return new URL('.', location.href).href;
}

export function login(returnTo = location.href) {
  if (!loginEnabled) return;
  const state = crypto.getRandomValues(new Uint32Array(4)).join('-');
  session.set(STATE_KEY, state);
  session.set(RETURN_KEY, returnTo);
  const u = new URL('https://github.com/login/oauth/authorize');
  u.searchParams.set('client_id', AUTH.clientId);
  u.searchParams.set('redirect_uri', siteBase() + 'auth.html');
  u.searchParams.set('scope', AUTH.scope);
  u.searchParams.set('state', state);
  u.searchParams.set('allow_signup', 'true');
  location.href = u.href;
}

export function logout() {
  store.del(TOKEN_KEY);
  store.del(USER_KEY);
  window.dispatchEvent(new Event('ytm-auth'));
}

// Called by auth.html after GitHub redirects back with ?code=…&state=…
export async function finishLogin() {
  const p = new URLSearchParams(location.search);
  const code = p.get('code'), state = p.get('state');
  const back = session.get(RETURN_KEY) || siteBase();
  if (p.get('error')) throw new Error(p.get('error_description') || 'Sign-in was cancelled.');
  if (!code || !state || state !== session.get(STATE_KEY)) throw new Error('Sign-in link expired. Try again.');
  session.del(STATE_KEY);
  const res = await fetch(AUTH.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(data.error_description || data.error || 'GitHub did not return a login token.');
  store.set(TOKEN_KEY, data.access_token);
  const me = await gh('/user');
  store.set(USER_KEY, JSON.stringify({ login: me.login, name: me.name, avatar: me.avatar_url }));
  session.del(RETURN_KEY);
  return back;
}

export class GitHubError extends Error {
  constructor(message, status, body) { super(message); this.status = status; this.body = body; }
}

// REST call with the user's token.
export async function gh(path, { method = 'GET', body, headers = {} } = {}) {
  const t = token();
  const res = await fetch(path.startsWith('http') ? path : `https://api.github.com${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) { logout(); throw new GitHubError('Your GitHub sign-in expired. Sign in again.', 401); }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new GitHubError((data && data.message) || `GitHub error ${res.status}`, res.status, data);
  return data;
}

export async function gql(query, variables = {}) {
  const data = await gh('/graphql', { method: 'POST', body: { query, variables } });
  if (data.errors && data.errors.length) throw new GitHubError(data.errors[0].message, 200, data);
  return data.data;
}

// Header widget: "Sign in with GitHub" or avatar + menu.
export function mountAccount(el) {
  if (!el) return;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const render = () => {
    if (!loginEnabled) { el.innerHTML = ''; return; }
    const u = user();
    if (!signedIn() || !u) {
      el.innerHTML = `<button type="button" class="btn btn-small" data-login>Sign in with GitHub</button>`;
      return;
    }
    el.innerHTML = `
      <details class="account">
        <summary aria-label="Account menu for ${esc(u.login)}"><img src="${esc(u.avatar)}&s=64" alt="" width="28" height="28"><span>${esc(u.login)}</span></summary>
        <div class="account-menu">
          <a href="editor.html#my-themes">My themes</a>
          <a href="https://github.com/${esc(u.login)}" rel="noopener">Your GitHub profile</a>
          <button type="button" data-logout>Sign out</button>
        </div>
      </details>`;
  };
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-login]')) login();
    if (e.target.closest('[data-logout]')) logout();
  });
  window.addEventListener('ytm-auth', render);
  render();
}

export const repoPath = `/repos/${REPO.owner}/${REPO.name}`;
