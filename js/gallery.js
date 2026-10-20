import { buildCss, normalizeTheme } from './theme.js';
import { mountMock, applyTheme } from './mock.js';

const grid = document.getElementById('grid');
const q = document.getElementById('q');
const sort = document.getElementById('sort');
const heroTag = document.getElementById('hero-tag');
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
    themes = (await res.json()).map(normalizeTheme);
  } catch {
    grid.innerHTML = `<div class="empty">The theme list couldn't be loaded. If you're running the site locally, run <code>npm run build</code> first.</div>`;
    themes = [];
  }
  render();
  startHero();
}

function render() {
  const term = q.value.trim().toLowerCase();
  let list = themes.filter((t) => !term || `${t.name} ${t.author} ${t.description}`.toLowerCase().includes(term));
  list = list.sort(sort.value === 'name' ? (a, b) => a.name.localeCompare(b.name) : (a, b) => b.created.localeCompare(a.created));
  if (!themes.length) return;
  if (!list.length) {
    grid.innerHTML = `<div class="empty">No themes match “${esc(term)}”. <a href="editor.html">Make one</a>.</div>`;
    return;
  }
  grid.innerHTML = '';
  for (const t of list) {
    const card = document.createElement('article');
    card.className = 'theme-card';
    card.innerHTML = `
      <div class="preview"></div>
      <div>
        <h3>${esc(t.name)}</h3>
        <div class="by">by ${esc(t.author || 'anonymous')}</div>
      </div>
      ${t.description ? `<p class="desc">${esc(t.description)}</p>` : ''}
      <div class="actions">
        <a class="btn btn-primary btn-small" href="themes/dist/${encodeURIComponent(t.id)}.user.css">Install with Stylus</a>
        <a class="btn btn-small" href="editor.html?remix=${encodeURIComponent(t.id)}">Remix</a>
        <button class="btn btn-small" type="button" data-copy>Copy CSS</button>
      </div>`;
    mountMock(card.querySelector('.preview'), t);
    card.querySelector('[data-copy]').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(buildCss(t)); toast('CSS copied'); }
      catch { toast('Copy failed. Use Remix and export instead.'); }
    });
    grid.appendChild(card);
  }
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

q.addEventListener('input', render);
sort.addEventListener('change', render);
load();
