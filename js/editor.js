import { FONTS, buildCss, buildUserCss, newTheme, normalizeTheme, slugify, validateTheme, LIMITS } from './theme.js';
import { mountMock, applyTheme } from './mock.js';
import { REPO } from './config.js';

const DRAFT_KEY = 'remaster.draft.v1';
const SWATCHES = ['#030303', '#121212', '#1e1e2e', '#2b193d', '#0d2b2b', '#f4f1ff', '#ffffff', '#ff0000', '#ff4e8a', '#7c5cff', '#2fb5ff', '#2ed47a', '#ffb020'];

const isBg = (type) => (t) => t.settings.background.type === type;

const PARTS = [
  { key: 'details', label: 'Details', lead: 'How your theme is listed in the gallery.', fields: [
    { path: 'name', type: 'text', label: 'Theme name', max: LIMITS.name },
    { path: 'author', type: 'text', label: 'Your name', max: LIMITS.author },
    { path: 'description', type: 'text', label: 'Short description', max: LIMITS.description },
  ] },
  { key: 'background', label: 'Background', swatch: 'settings.background.color', lead: 'Behind everything: home, search and the now-playing page.', fields: [
    { path: 'settings.background.type', type: 'seg', label: 'Fill', options: [['solid', 'Color'], ['gradient', 'Gradient'], ['image', 'Image']] },
    { path: 'settings.background.color', type: 'color', label: 'Color' },
    { path: 'settings.background.color2', type: 'color', label: 'Second color', when: isBg('gradient') },
    { path: 'settings.background.angle', type: 'range', label: 'Direction', min: 0, max: 360, step: 5, unit: '°', when: isBg('gradient') },
    { path: 'settings.background.image', type: 'url', label: 'Image address', help: 'Paste a direct https:// link to a .jpg, .png or .webp.', when: isBg('image') },
    { path: 'settings.background.dim', type: 'range', label: 'Darken', min: 0, max: 0.9, step: 0.05, pct: true, when: isBg('image') },
    { path: 'settings.background.blur', type: 'range', label: 'Blur', min: 0, max: 40, step: 1, unit: 'px', when: isBg('image') },
  ] },
  { key: 'navbar', label: 'Top bar', swatch: 'settings.navbar.color', lead: 'The bar with the logo and search box.', fields: [
    { path: 'settings.navbar.color', type: 'color', label: 'Color' },
    { path: 'settings.navbar.opacity', type: 'range', label: 'Opacity', min: 0, max: 1, step: 0.05, pct: true },
    { path: 'settings.navbar.blur', type: 'range', label: 'Frosted glass', min: 0, max: 40, step: 1, unit: 'px', help: 'Blurs what scrolls underneath. Works best with lower opacity.' },
  ] },
  { key: 'sidebar', label: 'Sidebar', swatch: 'settings.sidebar.color', lead: 'Home, Explore, Library and your playlists.', fields: [
    { path: 'settings.sidebar.color', type: 'color', label: 'Color' },
    { path: 'settings.sidebar.opacity', type: 'range', label: 'Opacity', min: 0, max: 1, step: 0.05, pct: true },
    { path: 'settings.sidebar.border', type: 'toggle', label: 'Show divider line' },
  ] },
  { key: 'player', label: 'Player bar', swatch: 'settings.player.color', lead: 'The controls along the bottom.', fields: [
    { path: 'settings.player.color', type: 'color', label: 'Color' },
    { path: 'settings.player.opacity', type: 'range', label: 'Opacity', min: 0, max: 1, step: 0.05, pct: true },
    { path: 'settings.player.blur', type: 'range', label: 'Frosted glass', min: 0, max: 40, step: 1, unit: 'px' },
  ] },
  { key: 'accent', label: 'Accent', swatch: 'settings.accent.color', lead: 'Progress bar, play button, selected chip and logo.', fields: [
    { path: 'settings.accent.color', type: 'color', label: 'Accent color' },
  ] },
  { key: 'text', label: 'Text and font', swatch: 'settings.text.primary', lead: 'Titles, artist names and the typeface used everywhere.', fields: [
    { path: 'settings.text.primary', type: 'color', label: 'Titles' },
    { path: 'settings.text.secondary', type: 'color', label: 'Artist names and details' },
    { path: 'settings.text.font', type: 'font', label: 'Font' },
  ] },
  { key: 'cards', label: 'Cards and lists', swatch: 'settings.cards.hover', lead: 'Album art corners and the highlight when you point at a song.', fields: [
    { path: 'settings.cards.radius', type: 'range', label: 'Corner roundness', min: 0, max: 40, step: 1, unit: 'px' },
    { path: 'settings.cards.hover', type: 'color', label: 'Highlight color' },
    { path: 'settings.cards.hoverOpacity', type: 'range', label: 'Highlight strength', min: 0, max: 1, step: 0.05, pct: true },
  ] },
  { key: 'chips', label: 'Mood chips', swatch: 'settings.chips.color', lead: 'The Relax / Energize / Workout buttons. The selected one uses the accent color.', fields: [
    { path: 'settings.chips.color', type: 'color', label: 'Color' },
    { path: 'settings.chips.opacity', type: 'range', label: 'Opacity', min: 0, max: 1, step: 0.05, pct: true },
    { path: 'settings.chips.text', type: 'color', label: 'Text color' },
    { path: 'settings.chips.radius', type: 'range', label: 'Roundness', min: 0, max: 24, step: 1, unit: 'px' },
  ] },
  { key: 'custom', label: 'Custom CSS', sep: true, lead: 'For anything the controls above don\'t cover. Added after the generated CSS.', fields: [
    { path: 'customCss', type: 'css', label: 'Your CSS' },
  ] },
];

let theme = newTheme();
let current = 'background';
let mockEl;

const $ = (id) => document.getElementById(id);
const get = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
const set = (obj, path, v) => { const ks = path.split('.'); const last = ks.pop(); ks.reduce((o, k) => o[k], obj)[last] = v; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.role = 'status'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

function saveDraft() { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(theme)); } catch {} }
function loadDraft() { try { const d = localStorage.getItem(DRAFT_KEY); return d ? JSON.parse(d) : null; } catch { return null; } }

// ---------- Parts list ----------
function renderParts() {
  $('parts').innerHTML = PARTS.map((p) => `
    <button type="button" class="ed-part${p.sep ? ' sep' : ''}" data-key="${p.key}" aria-current="${p.key === current}">
      ${p.swatch ? `<span class="sw" style="background:${esc(get(theme, p.swatch))}"></span>` : ''}${esc(p.label)}
    </button>`).join('');
}
$('parts').addEventListener('click', (e) => {
  const b = e.target.closest('.ed-part');
  if (b) select(b.dataset.key);
});

function updateSwatches() {
  for (const p of PARTS) {
    if (!p.swatch) continue;
    const sw = $('parts').querySelector(`[data-key="${p.key}"] .sw`);
    if (sw) sw.style.background = get(theme, p.swatch);
  }
}

// ---------- Inspector ----------
function fieldHTML(f, id) {
  const v = get(theme, f.path);
  const help = f.help ? `<p class="help">${esc(f.help)}</p>` : '';
  switch (f.type) {
    case 'color':
      return `<div class="field"><label for="${id}">${esc(f.label)}</label>
        <div class="color-row"><input type="color" id="${id}" value="${esc(v.slice(0, 7))}" data-path="${f.path}">
        <input type="text" aria-label="${esc(f.label)} hex code" value="${esc(v)}" data-path="${f.path}" data-hex maxlength="9" spellcheck="false"></div>
        <div class="swatches" role="group" aria-label="Quick colors">${SWATCHES.map((c) => `<button type="button" style="background:${c}" data-path="${f.path}" data-swatch="${c}" aria-label="Use ${c}"></button>`).join('')}</div>${help}</div>`;
    case 'range': {
      const out = f.pct ? `${Math.round(v * 100)}%` : `${v}${f.unit || ''}`;
      return `<div class="field"><label for="${id}">${esc(f.label)}<output id="${id}-o">${out}</output></label>
        <input type="range" id="${id}" min="${f.min}" max="${f.max}" step="${f.step}" value="${v}" data-path="${f.path}" data-num>${help}</div>`;
    }
    case 'seg':
      return `<div class="field"><span class="lbl" id="${id}">${esc(f.label)}</span><div class="seg" role="radiogroup" aria-labelledby="${id}">
        ${f.options.map(([val, lab]) => `<label><input type="radio" name="${id}" value="${val}" data-path="${f.path}" data-rerender ${v === val ? 'checked' : ''}>${esc(lab)}</label>`).join('')}</div>${help}</div>`;
    case 'toggle':
      return `<div class="field"><label class="toggle"><input type="checkbox" data-path="${f.path}" data-bool ${v ? 'checked' : ''}>${esc(f.label)}</label>${help}</div>`;
    case 'font':
      return `<div class="field"><label for="${id}">${esc(f.label)}</label><select id="${id}" data-path="${f.path}">
        ${FONTS.map((x) => `<option ${x.name === v ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
        <p class="help">Fonts other than Roboto and System UI load from Google Fonts.</p></div>`;
    case 'css':
      return `<div class="field"><label for="${id}">${esc(f.label)}</label>
        <textarea id="${id}" rows="16" spellcheck="false" data-path="${f.path}" placeholder="ytmusic-player-bar {\n  border-top: 1px solid #ffffff22;\n}">${esc(v)}</textarea>
        <ul class="ed-errors" id="css-errors"></ul>
        <p class="help">Selectors target the real YouTube Music page, so changes here don't show in the preview.</p></div>`;
    default:
      return `<div class="field"><label for="${id}">${esc(f.label)}</label><input type="${f.type === 'url' ? 'url' : 'text'}" id="${id}" value="${esc(v)}" data-path="${f.path}" ${f.max ? `maxlength="${f.max}"` : ''} spellcheck="false">${help}</div>`;
  }
}

function renderInspector() {
  const p = PARTS.find((x) => x.key === current);
  $('inspector').innerHTML = `<h2>${esc(p.label)}</h2><p class="lead">${esc(p.lead)}</p>` +
    p.fields.filter((f) => !f.when || f.when(theme)).map((f, i) => fieldHTML(f, `f-${p.key}-${i}`)).join('');
  if (current === 'custom') showCssErrors();
}

function select(key) {
  current = key;
  renderParts();
  renderInspector();
  mockEl.querySelectorAll('.is-selected').forEach((n) => n.classList.remove('is-selected'));
  mockEl.querySelectorAll(`[data-part="${key}"]`).forEach((n) => n.classList.add('is-selected'));
}

function showCssErrors() {
  const box = $('css-errors');
  if (!box) return;
  const errs = validateTheme({ ...theme, name: 'x', author: 'x' });
  box.innerHTML = errs.map((e) => `<li>${esc(e)}</li>`).join('');
}

function commit(path, value, { rerender = false } = {}) {
  set(theme, path, value);
  if (path === 'name') $('theme-name').value = value;
  applyTheme(mockEl, theme);
  updateSwatches();
  saveDraft();
  if (rerender) renderInspector();
  if (path === 'customCss') showCssErrors();
}

const inspector = $('inspector');
inspector.addEventListener('input', (e) => {
  const el = e.target, path = el.dataset.path;
  if (!path) return;
  if (el.dataset.num !== undefined) {
    const v = Number(el.value);
    const f = PARTS.flatMap((p) => p.fields).find((x) => x.path === path);
    const o = document.getElementById(`${el.id}-o`);
    if (o) o.textContent = f.pct ? `${Math.round(v * 100)}%` : `${v}${f.unit || ''}`;
    return commit(path, v);
  }
  if (el.dataset.hex !== undefined) {
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(el.value)) return;
    const picker = el.previousElementSibling;
    let v = el.value.toLowerCase();
    if (v.length === 4) v = '#' + v.slice(1).split('').map((c) => c + c).join('');
    picker.value = v.slice(0, 7);
    return commit(path, v);
  }
  if (el.type === 'color') { el.nextElementSibling.value = el.value; return commit(path, el.value); }
  if (el.dataset.bool !== undefined) return commit(path, el.checked);
  if (el.type === 'radio') return commit(path, el.value, { rerender: el.dataset.rerender !== undefined });
  if (el.type === 'url') {
    if (el.value && !/^https:\/\/[^\s"'()\\<>]+$/i.test(el.value)) { el.setCustomValidity('Use a plain https:// link'); el.reportValidity(); return; }
    el.setCustomValidity('');
  }
  commit(path, el.value);
});
inspector.addEventListener('change', (e) => { if (e.target.tagName === 'SELECT') commit(e.target.dataset.path, e.target.value); });
inspector.addEventListener('click', (e) => {
  const b = e.target.closest('[data-swatch]');
  if (!b) return;
  const row = b.closest('.field').querySelector('.color-row');
  row.children[0].value = b.dataset.swatch;
  row.children[1].value = b.dataset.swatch;
  commit(b.dataset.path, b.dataset.swatch);
});

$('theme-name').addEventListener('input', (e) => {
  set(theme, 'name', e.target.value);
  saveDraft();
  if (current === 'details') { const f = inspector.querySelector('[data-path="name"]'); if (f) f.value = e.target.value; }
});

// ---------- Point and click on the preview ----------
function onStageClick(e) {
  const part = e.target.closest('[data-part]');
  if (part) { e.preventDefault(); select(part.dataset.part); }
}

// ---------- Export / import ----------
function finalTheme() {
  const t = normalizeTheme(theme);
  if (!theme.idSuffix) { theme.idSuffix = Math.random().toString(36).slice(2, 6); saveDraft(); }
  t.id = `${slugify(t.name)}-${theme.idSuffix}`;
  return t;
}

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function themeFileJson(t) {
  const { id, ...rest } = t;
  return JSON.stringify(rest, null, 2) + '\n';
}

$('btn-export').addEventListener('click', () => {
  $('export-css').value = buildCss(finalTheme());
  $('dlg-export').showModal();
});
$('btn-copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('export-css').value); toast('CSS copied'); }
  catch { $('export-css').select(); toast('Press Ctrl+C to copy'); }
});
$('btn-dl-usercss').addEventListener('click', () => { const t = finalTheme(); download(`${t.id}.user.css`, buildUserCss(t), 'text/css'); });
$('btn-dl-json').addEventListener('click', () => { const t = finalTheme(); download(`${t.id}.json`, themeFileJson(t), 'application/json'); });
$('file-import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    load(JSON.parse(await file.text()));
    $('dlg-export').close();
    toast('Theme opened');
  } catch { toast('That file is not a valid theme file'); }
  e.target.value = '';
});

// ---------- Share via GitHub ----------
$('btn-share').addEventListener('click', () => {
  $('share-author').value = theme.author || '';
  $('share-desc').value = theme.description || '';
  $('share-errors').innerHTML = '';
  $('dlg-share').showModal();
});
$('btn-github').addEventListener('click', () => {
  theme.author = $('share-author').value.trim();
  theme.description = $('share-desc').value.trim();
  saveDraft();
  const t = finalTheme();
  const errors = validateTheme({ ...theme, name: theme.name.trim() });
  if (theme.name.trim() === 'Untitled theme') errors.unshift('Give your theme a name first (top of the page).');
  if (REPO.owner === 'YOUR-GITHUB-USERNAME') errors.push('Sharing isn\'t set up on this copy of the site yet: set REPO in js/config.js.');
  $('share-errors').innerHTML = errors.map((x) => `<li>${esc(x)}</li>`).join('');
  if (errors.length) return;
  const url = `https://github.com/${REPO.owner}/${REPO.name}/new/${REPO.branch}/themes?filename=${encodeURIComponent(t.id + '.json')}&value=${encodeURIComponent(themeFileJson(t))}`;
  window.open(url, '_blank', 'noopener');
});

// ---------- Start over ----------
$('btn-reset').addEventListener('click', () => {
  if (!confirm('Start over with the default YouTube Music look? Your current changes will be lost.')) return;
  load(newTheme());
});

function load(raw) {
  const suffix = raw.idSuffix;
  theme = normalizeTheme(raw);
  delete theme.id;
  if (suffix) theme.idSuffix = suffix;
  $('theme-name').value = theme.name;
  applyTheme(mockEl, theme);
  saveDraft();
  select(current);
}

async function init() {
  mockEl = mountMock($('stage'), theme, { editable: true });
  mockEl.addEventListener('click', onStageClick);
  const remix = new URLSearchParams(location.search).get('remix');
  let start = loadDraft() || newTheme();
  if (remix) {
    try {
      const list = await (await fetch('themes/index.json')).json();
      const found = list.find((x) => x.id === remix);
      if (found) start = { ...found, name: `${found.name} remix`.slice(0, LIMITS.name), author: '', description: '', created: undefined, idSuffix: undefined };
    } catch {}
    history.replaceState(null, '', location.pathname);
  }
  load(start);
}
init();
