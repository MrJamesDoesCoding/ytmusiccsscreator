// Auto-approves a theme pull request when it is safe to do so, otherwise labels it for manual review.
// Runs from .github/workflows/auto-approve.yml (pull_request_target). It only ever runs code from the
// main branch; the submitted theme file is read as plain data, never executed.
import { readFile } from 'node:fs/promises';
import { validateTheme } from '../js/theme.js';

const { GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, HEAD_SHA } = process.env;
const API = `https://api.github.com/repos/${GITHUB_REPOSITORY}`;
const LABEL = 'needs review';

async function gh(path, { method = 'GET', body } = {}) {
  const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'ytm-theme-auto-approve',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${data && data.message ? data.message : ''}`);
  return data;
}

async function blockedWords() {
  try {
    return (await readFile(new URL('./blocked-words.txt', import.meta.url), 'utf8'))
      .split('\n').map((l) => l.trim().toLowerCase()).filter((l) => l && !l.startsWith('#'));
  } catch { return []; }
}

async function reasonsNotToMerge() {
  const files = await gh(`/pulls/${PR_NUMBER}/files?per_page=100`);
  if (files.length !== 1) return ['It changes more than one file.'];
  const f = files[0];
  const m = /^themes\/([a-z0-9][a-z0-9-]{0,59})\.json$/.exec(f.filename);
  if (!m) return [`It changes \`${f.filename}\`, which isn't a theme file.`];
  if (f.status !== 'added') return ['It changes an existing theme (only new themes are approved automatically).'];

  const res = await fetch(f.raw_url);
  const text = await res.text();
  if (text.length > 40000) return ['The theme file is larger than 40 KB.'];
  let theme;
  try { theme = JSON.parse(text); } catch { return ['The theme file is not valid JSON.']; }

  const reasons = validateTheme(theme);
  if (typeof theme.customCss === 'string' && theme.customCss.trim()) reasons.push('It uses custom CSS.');
  const words = await blockedWords();
  const textToCheck = `${theme.name || ''} ${theme.author || ''} ${theme.description || ''}`.toLowerCase();
  const hit = words.find((w) => new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`, 'i').test(textToCheck));
  if (hit) reasons.push('The name, author or description contains a blocked word.');
  return reasons;
}

const pr = await gh(`/pulls/${PR_NUMBER}`);
if (pr.state !== 'open' || pr.head.sha !== HEAD_SHA) {
  console.log('PR changed or closed since this run started; skipping.');
  process.exit(0);
}

const reasons = await reasonsNotToMerge();
if (reasons.length) {
  console.log('Needs manual review:\n- ' + reasons.join('\n- '));
  const already = (pr.labels || []).some((l) => l.name === LABEL);
  if (!already) {
    try { await gh(`/labels`, { method: 'POST', body: { name: LABEL, color: 'fbca04', description: 'Theme needs a manual look before merging' } }); } catch {}
    await gh(`/issues/${PR_NUMBER}/labels`, { method: 'POST', body: { labels: [LABEL] } });
    await gh(`/issues/${PR_NUMBER}/comments`, { method: 'POST', body: { body: `Thanks for sharing! This theme needs a quick manual review before it goes live:\n\n- ${reasons.join('\n- ')}` } });
  }
  process.exit(0);
}

await gh(`/pulls/${PR_NUMBER}/merge`, { method: 'PUT', body: { merge_method: 'squash', sha: HEAD_SHA, commit_title: `${pr.title} (#${PR_NUMBER})` } });
await gh(`/issues/${PR_NUMBER}/comments`, { method: 'POST', body: { body: 'Approved automatically. Your theme will be in the gallery in a minute or two. 🎉' } });
// Merges made by the Actions token don't trigger other workflows, so start the site rebuild explicitly.
await gh(`/actions/workflows/deploy.yml/dispatches`, { method: 'POST', body: { ref: pr.base.ref } });
console.log('Merged and deploy started.');
