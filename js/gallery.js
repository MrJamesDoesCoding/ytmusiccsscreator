import { buildCss, normalizeTheme } from './theme.js';
import { mountMock, applyTheme } from './mock.js';
import { mountAccount, signedIn, login, loginEnabled } from './auth.js';
import { fetchLikes, setLike } from './likes.js';
import { REPO, DONATE } from './config.js';

const grid = document.getElementById('grid');
const q = document.getElementById('q');
const sort = document.getElementById('sort');
const heroTag = document.getElementById('hero-tag');
const more = document.getElementById('more');
const count = document.getElementById('count');
let themes = [];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.role = 'status'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

async function load() {
  try {
    const res = await fetch('themes/index.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    themes = (await res.json()).map((r) => ({
      ...normalizeTheme(r),
      discussionId: r.discussionId || null,
      discussionNumber: r.discussionNumber || null,
      likes: Number(r.likes) || 0,
      mine: false,
    }));
  } catch {
    grid.innerHTML = `<div class="empty">The theme list couldn't be loaded. If you're running the site locally, run <code>npm run build</code> first.</div>`;
    themes = [];
  }
  render();
  startHero();
  refreshLikes();
}

async function refreshLikes() {
  if (!signedIn()) return;
  try {
    const live = await fetchLikes(themes.map((t) => t.discussionId).filter(Boolean));
    for (const t of themes) if (live[t.discussionId]) Object.assign(t, { likes: live[t.discussionId].count, mine: live[t.discussionId].mine });
    updateLikeButtons();
  } catch (e) {
    console.warn('Could not load live likes', e);
  }
}

function likeLabel(t) {
  return `<span aria-hidden="true">${t.mine ? '♥' : '♡'}</span> ${t.likes}<span class="sr-only"> likes${t.mine ? ', you liked this' : ''}</span>`;
}

function updateLikeButtons() {
  for (const b of grid.querySelectorAll('[data-like]')) {
    const t = themes.find((x) => x.id === b.dataset.like);
    if (!t) continue;
    b.innerHTML = likeLabel(t);
    b.setAttribute('aria-pressed', String(t.mine));
  }
}

async function onLike(t, btn) {
  if (!t.discussionId) return;
  if (!loginEnabled) {
    window.open(`https://github.com/${REPO.owner}/${REPO.name}/discussions/${t.discussionNumber}`, '_blank', 'noopener');
    return;
  }
  if (!signedIn()) { login(location.href.split('#')[0] + '#gallery'); return; }
  const want = !t.mine;
  Object.assign(t, { mine: want, likes: t.likes + (want ? 1 : -1) });
  updateLikeButtons();
  btn.disabled = true;
  try {
    const r = await setLike(t.discussionId, want);
    Object.assign(t, { likes: r.count, mine: r.mine });
  } catch (e) {
    Object.assign(t, { mine: !want, likes: t.likes + (want ? -1 : 1) });
    toast(e.message || 'Could not save your like');
  }
  btn.disabled = false;
  updateLikeButtons();
}

const PAGE_SIZE = 24;
let shown = PAGE_SIZE;
let currentList = [];

// Draw a card's live preview only when it scrolls near the screen.
const lazy = typeof IntersectionObserver !== 'undefined'
  ? new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        lazy.unobserve(e.target);
        const t = themes.find((x) => x.id === e.target.dataset.theme);
        if (t) mountMock(e.target, t);
      }
    }, { rootMargin: '400px 0px' })
  : null;

function render({ reset = true } = {}) {
  if (!themes.length) return;
  if (reset) {
    shown = PAGE_SIZE;
    const term = q.value.trim().toLowerCase();
    const sorters = {
      name: (a, b) => a.name.localeCompare(b.name),
      likes: (a, b) => b.likes - a.likes || b.created.localeCompare(a.created),
      new: (a, b) => b.created.localeCompare(a.created),
    };
    currentList = themes
      .filter((t) => !term || `${t.name} ${t.author} ${t.description}`.toLowerCase().includes(term))
      .sort(sorters[sort.value] || sorters.new);
    grid.innerHTML = '';
    if (!currentList.length) {
      grid.innerHTML = `<div class="empty">No themes match “${esc(term)}”. <a href="editor.html">Make one</a>.</div>`;
      updateMore();
      return;
    }
  }
  const from = grid.querySelectorAll('.theme-card').length;
  for (const t of currentList.slice(from, shown)) grid.appendChild(cardFor(t));
  updateMore();
}

function updateMore() {
  const left = currentList.length - Math.min(shown, currentList.length);
  more.hidden = left <= 0;
  more.textContent = `Show more themes (${left} left)`;
  count.textContent = currentList.length ? `${Math.min(shown, currentList.length)} of ${currentList.length} themes` : '';
}

function cardFor(t) {
  const card = document.createElement('article');
  card.className = 'theme-card';
  card.innerHTML = `
    <div class="preview ym-host" data-theme="${esc(t.id)}" style="aspect-ratio: 960 / 600"></div>
    <div>
      <div class="card-title">
        <h3>${esc(t.name)}</h3>
        ${t.discussionId ? `<button type="button" class="like" data-like="${esc(t.id)}" aria-pressed="${t.mine}" title="${signedIn() || !loginEnabled ? 'Like' : 'Sign in with GitHub to like'}">${likeLabel(t)}</button>` : ''}
      </div>
      <div class="by">by ${esc(t.author || 'anonymous')}</div>
    </div>
    ${t.description ? `<p class="desc">${esc(t.description)}</p>` : ''}
    <div class="actions">
      <a class="btn btn-primary btn-small" href="themes/dist/${encodeURIComponent(t.id)}.user.css">Install with Stylus</a>
      <a class="btn btn-small" href="themes/dist/${encodeURIComponent(t.id)}.css" download="${esc(t.id)}.css">Desktop app .css</a>
      <a class="btn btn-small" href="editor.html?remix=${encodeURIComponent(t.id)}">Remix</a>
      <button class="btn btn-small" type="button" data-copy>Copy CSS</button>
    </div>`;
  const prev = card.querySelector('.preview');
  if (lazy) lazy.observe(prev); else mountMock(prev, t);
  const likeBtn = card.querySelector('[data-like]');
  if (likeBtn) likeBtn.addEventListener('click', () => onLike(t, likeBtn));
  card.querySelector('[data-copy]').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(buildCss(t)); toast('CSS copied'); }
    catch { toast('Copy failed. Use Remix and export instead.'); }
  });
  return card;
}

function startHero() {
  const host = document.getElementById('hero-mock');
  const pool = themes.length ? themes : [normalizeTheme({ name: 'Default', author: 'YouTube Music' })];
  let i = 0;
  const el = mountMock(host, pool[0]);
  const show = () => {
    const t = pool[i % pool.length];
    applyTheme(el, t);
    heroTag.innerHTML = `${esc(t.name)}<small>by ${esc(t.author || 'anonymous')}</small>`;
  };
  show();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || pool.length < 2) return;
  let paused = false;
  host.parentElement.addEventListener('mouseenter', () => (paused = true));
  host.parentElement.addEventListener('mouseleave', () => (paused = false));
  setInterval(() => { if (!paused && !document.hidden) { i++; show(); } }, 4000);
}

mountAccount(document.getElementById('account'));
if (DONATE && DONATE.url) { const c = document.getElementById('coffee'); c.href = DONATE.url; c.hidden = false; }
window.addEventListener('ytm-auth', () => { for (const t of themes) t.mine = false; render(); refreshLikes(); });
q.addEventListener('input', () => render());
more.addEventListener('click', () => {
  const next = grid.querySelectorAll('.theme-card').length;
  shown += PAGE_SIZE;
  render({ reset: false });
  const first = grid.querySelectorAll('.theme-card')[next];
  if (first) first.querySelector('h3').setAttribute('tabindex', '-1'), first.querySelector('h3').focus({ preventScroll: true });
});
sort.addEventListener('change', () => render());
load();
