// "My themes": saved in a secret gist on the signed-in user's GitHub account.
import { gh, user } from './auth.js';

const FILE = 'ytmusic-themes.json';
const DESC = 'YouTube Music themes (saved by the theme maker)';
const key = () => `ytm.gist.${(user() || {}).login}`;

function cachedId() { try { return localStorage.getItem(key()); } catch { return null; } }
function cacheId(id) { try { id ? localStorage.setItem(key(), id) : localStorage.removeItem(key()); } catch {} }

async function findGist() {
  const id = cachedId();
  if (id) {
    try { return await gh(`/gists/${id}`); }
    catch (e) { if (e.status !== 404) throw e; cacheId(null); }
  }
  for (let page = 1; page <= 5; page++) {
    const list = await gh(`/gists?per_page=100&page=${page}`);
    const hit = list.find((g) => g.description === DESC && g.files && g.files[FILE]);
    if (hit) { cacheId(hit.id); return gh(`/gists/${hit.id}`); }
    if (list.length < 100) break;
  }
  return null;
}

async function contentOf(gist) {
  const f = gist.files[FILE];
  const text = f.truncated ? await (await fetch(f.raw_url)).text() : f.content;
  try {
    const data = JSON.parse(text);
    return Array.isArray(data.themes) ? data.themes : [];
  } catch { return []; }
}

// Returns [{ key, updated, theme }]
export async function loadCloud() {
  const g = await findGist();
  return g ? contentOf(g) : [];
}

async function write(list) {
  const content = JSON.stringify({ version: 1, themes: list }, null, 1);
  const id = cachedId() || (await findGist())?.id;
  if (id) {
    await gh(`/gists/${id}`, { method: 'PATCH', body: { files: { [FILE]: { content } } } });
  } else {
    const g = await gh('/gists', { method: 'POST', body: { description: DESC, public: false, files: { [FILE]: { content } } } });
    cacheId(g.id);
  }
}

// Merges with what's stored (newest copy of each theme wins), then writes.
export async function saveToCloud(entry) {
  const list = await loadCloud();
  const i = list.findIndex((x) => x.key === entry.key);
  if (i >= 0) {
    if ((list[i].updated || '') > entry.updated) return list;
    list[i] = entry;
  } else list.unshift(entry);
  await write(list);
  return list;
}

export async function deleteFromCloud(k) {
  const list = (await loadCloud()).filter((x) => x.key !== k);
  await write(list);
  return list;
}
