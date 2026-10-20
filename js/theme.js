// Theme model, validation and CSS generation.
// Pure ES module: runs in the browser and in Node (scripts/build.mjs).

export const FONTS = [
  { name: 'Roboto', css: "'Roboto', 'Arial', sans-serif", google: false },
  { name: 'System UI', css: 'system-ui, sans-serif', google: false },
  { name: 'Inter', google: true },
  { name: 'DM Sans', google: true },
  { name: 'Outfit', google: true },
  { name: 'Space Grotesk', google: true },
  { name: 'Nunito', google: true },
  { name: 'Lexend', google: true },
  { name: 'Comfortaa', google: true },
  { name: 'Playfair Display', google: true },
  { name: 'JetBrains Mono', google: true },
];

export function fontCss(name) {
  const f = FONTS.find((x) => x.name === name) || FONTS[0];
  return f.css || `'${f.name}', sans-serif`;
}

export function googleFontUrl(name) {
  const f = FONTS.find((x) => x.name === name);
  if (!f || !f.google) return null;
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.name).replace(/%20/g, '+')}:wght@400;500;700&display=swap`;
}

export const DEFAULT_SETTINGS = {
  background: { type: 'solid', color: '#030303', color2: '#1d1b3a', angle: 160, image: '', blur: 0, dim: 0.45 },
  navbar: { color: '#030303', opacity: 1, blur: 0 },
  sidebar: { color: '#030303', opacity: 1, border: true },
  player: { color: '#212121', opacity: 1, blur: 0 },
  text: { primary: '#ffffff', secondary: '#aaaaaa', font: 'Roboto' },
  accent: { color: '#ff0000' },
  cards: { radius: 4, hover: '#ffffff', hoverOpacity: 0.1 },
  chips: { color: '#ffffff', opacity: 0.1, text: '#ffffff', radius: 8 },
};

export const LIMITS = { name: 60, author: 40, description: 200, customCss: 20000 };

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

function clone(o) { return JSON.parse(JSON.stringify(o)); }
function num(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
function color(v, fallback) { return typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : fallback; }
function str(v, max) { return typeof v === 'string' ? v.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max) : ''; }

export function safeImageUrl(u) {
  if (typeof u !== 'string') return '';
  u = u.trim();
  if (!/^https:\/\/[^\s"'()\\<>]+$/i.test(u) || u.length > 500) return '';
  return u;
}

export function newTheme() {
  return {
    name: 'Untitled theme',
    author: '',
    description: '',
    version: '1.0.0',
    created: new Date().toISOString().slice(0, 10),
    settings: clone(DEFAULT_SETTINGS),
    customCss: '',
  };
}

// Coerce any input into a complete, safe theme object.
export function normalizeTheme(raw = {}) {
  const d = DEFAULT_SETTINGS;
  const s = (raw && raw.settings) || {};
  const g = (k) => s[k] || {};
  const bg = g('background'), nav = g('navbar'), side = g('sidebar'), pl = g('player');
  const tx = g('text'), ac = g('accent'), cd = g('cards'), ch = g('chips');
  return {
    id: str(raw.id, 80) || undefined,
    name: str(raw.name, LIMITS.name) || 'Untitled theme',
    author: str(raw.author, LIMITS.author),
    description: str(raw.description, LIMITS.description),
    version: /^\d+\.\d+\.\d+$/.test(raw.version) ? raw.version : '1.0.0',
    created: /^\d{4}-\d{2}-\d{2}$/.test(raw.created) ? raw.created : new Date().toISOString().slice(0, 10),
    settings: {
      background: {
        type: ['solid', 'gradient', 'image'].includes(bg.type) ? bg.type : d.background.type,
        color: color(bg.color, d.background.color),
        color2: color(bg.color2, d.background.color2),
        angle: num(bg.angle, 0, 360, d.background.angle),
        image: safeImageUrl(bg.image),
        blur: num(bg.blur, 0, 40, d.background.blur),
        dim: num(bg.dim, 0, 0.9, d.background.dim),
      },
      navbar: { color: color(nav.color, d.navbar.color), opacity: num(nav.opacity, 0, 1, 1), blur: num(nav.blur, 0, 40, 0) },
      sidebar: { color: color(side.color, d.sidebar.color), opacity: num(side.opacity, 0, 1, 1), border: side.border !== false },
      player: { color: color(pl.color, d.player.color), opacity: num(pl.opacity, 0, 1, 1), blur: num(pl.blur, 0, 40, 0) },
      text: {
        primary: color(tx.primary, d.text.primary),
        secondary: color(tx.secondary, d.text.secondary),
        font: FONTS.some((f) => f.name === tx.font) ? tx.font : d.text.font,
      },
      accent: { color: color(ac.color, d.accent.color) },
      cards: { radius: num(cd.radius, 0, 40, d.cards.radius), hover: color(cd.hover, d.cards.hover), hoverOpacity: num(cd.hoverOpacity, 0, 1, d.cards.hoverOpacity) },
      chips: { color: color(ch.color, d.chips.color), opacity: num(ch.opacity, 0, 1, d.chips.opacity), text: color(ch.text, d.chips.text), radius: num(ch.radius, 0, 24, d.chips.radius) },
    },
    customCss: typeof raw.customCss === 'string' ? raw.customCss.slice(0, LIMITS.customCss) : '',
  };
}

// Returns a list of human-readable problems. Empty list = valid.
export function validateTheme(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object') return ['Theme must be a JSON object.'];
  if (!str(raw.name, 1000)) errors.push('Name is required.');
  else if (raw.name.length > LIMITS.name) errors.push(`Name must be at most ${LIMITS.name} characters.`);
  if (!str(raw.author, 1000)) errors.push('Author is required.');
  else if (raw.author.length > LIMITS.author) errors.push(`Author must be at most ${LIMITS.author} characters.`);
  if (raw.description && raw.description.length > LIMITS.description) errors.push(`Description must be at most ${LIMITS.description} characters.`);
  if (!raw.settings || typeof raw.settings !== 'object') errors.push('Missing "settings".');
  const img = raw.settings && raw.settings.background && raw.settings.background.image;
  if (img && !safeImageUrl(img)) errors.push('Background image must be a plain https:// URL without quotes or spaces.');
  const css = raw.customCss || '';
  if (typeof css !== 'string') errors.push('customCss must be a string.');
  else {
    if (css.length > LIMITS.customCss) errors.push(`Custom CSS must be at most ${LIMITS.customCss} characters.`);
    if (/@import/i.test(css)) errors.push('Custom CSS may not use @import.');
    if (/javascript:|expression\s*\(|-moz-binding|behavior\s*:/i.test(css)) errors.push('Custom CSS contains a forbidden construct.');
    if (/<\/?\w/.test(css)) errors.push('Custom CSS may not contain HTML tags.');
    if (/\/\*|\*\//.test(css.replace(/\/\*[\s\S]*?\*\//g, ''))) errors.push('Custom CSS has an unclosed comment.');
    let depth = 0;
    for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '')) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      if (depth < 0) break;
    }
    if (depth !== 0) errors.push('Custom CSS has unbalanced { } braces.');
  }
  return errors;
}

export function rgba(hex, alpha = 1) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const a = h.length === 8 ? (parseInt(h.slice(6, 8), 16) / 255) * alpha : alpha;
  return `rgba(${r}, ${g}, ${b}, ${Math.round(a * 1000) / 1000})`;
}

// CSS custom properties shared by the real YouTube Music CSS and the in-site preview.
export function buildVars(theme) {
  const s = normalizeTheme(theme).settings;
  const bg = s.background;
  let layer = bg.color;
  if (bg.type === 'gradient') layer = `linear-gradient(${bg.angle}deg, ${bg.color}, ${bg.color2})`;
  if (bg.type === 'image' && bg.image) layer = `linear-gradient(rgba(0,0,0,${bg.dim}), rgba(0,0,0,${bg.dim})), url("${bg.image}") center / cover no-repeat`;
  return {
    '--ytcc-bg-base': bg.color,
    '--ytcc-bg': layer,
    '--ytcc-bg-blur': `${bg.type === 'image' ? bg.blur : 0}px`,
    '--ytcc-nav': rgba(s.navbar.color, s.navbar.opacity),
    '--ytcc-nav-blur': `${s.navbar.blur}px`,
    '--ytcc-side': rgba(s.sidebar.color, s.sidebar.opacity),
    '--ytcc-side-border': s.sidebar.border ? rgba(s.text.secondary, 0.18) : 'transparent',
    '--ytcc-player': rgba(s.player.color, s.player.opacity),
    '--ytcc-player-blur': `${s.player.blur}px`,
    '--ytcc-text': s.text.primary,
    '--ytcc-text2': s.text.secondary,
    '--ytcc-accent': s.accent.color,
    '--ytcc-thumb-radius': `${s.cards.radius}px`,
    '--ytcc-hover': rgba(s.cards.hover, s.cards.hoverOpacity),
    '--ytcc-chip-bg': rgba(s.chips.color, s.chips.opacity),
    '--ytcc-chip-text': s.chips.text,
    '--ytcc-chip-radius': `${s.chips.radius}px`,
    '--ytcc-font': fontCss(s.text.font),
  };
}

// The CSS that is applied to music.youtube.com.
// Selectors are grouped by part so they are easy to update when YouTube changes its markup.
export function buildCss(theme) {
  const t = normalizeTheme(theme);
  const vars = buildVars(t);
  const decl = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`).join('\n');
  return `/* Generated by Remaster */
html, html[dark], :root {
${decl}
  --ytmusic-text-primary: var(--ytcc-text) !important;
  --ytmusic-text-secondary: var(--ytcc-text2) !important;
  --yt-spec-text-primary: var(--ytcc-text) !important;
  --yt-spec-text-secondary: var(--ytcc-text2) !important;
  --ytmusic-general-background-a: transparent !important;
  --ytmusic-general-background-b: transparent !important;
  --ytmusic-general-background-c: transparent !important;
  --ytmusic-brand-background-solid: var(--ytcc-nav) !important;
  --yt-spec-general-background-a: transparent !important;
  --paper-slider-active-color: var(--ytcc-accent) !important;
  --paper-slider-knob-color: var(--ytcc-accent) !important;
  --paper-slider-knob-start-color: var(--ytcc-accent) !important;
  --yt-spec-static-brand-red: var(--ytcc-accent) !important;
}

/* Background */
html { background: var(--ytcc-bg-base) !important; }
body { background: transparent !important; }
body::before {
  content: ""; position: fixed; inset: calc(var(--ytcc-bg-blur) * -2);
  background: var(--ytcc-bg); filter: blur(var(--ytcc-bg-blur));
  z-index: -1; pointer-events: none;
}
ytmusic-app, ytmusic-app-layout, #layout, #content.ytmusic-app,
ytmusic-browse-response, ytmusic-search-page, ytmusic-player-page,
ytmusic-section-list-renderer, ytmusic-tabbed-search-results-renderer,
#background.ytmusic-browse-response, .background-gradient {
  background: transparent !important;
}

/* Top bar */
ytmusic-nav-bar, #nav-bar-background, #nav-bar-background.ytmusic-app-layout {
  background: var(--ytcc-nav) !important;
  backdrop-filter: blur(var(--ytcc-nav-blur)); -webkit-backdrop-filter: blur(var(--ytcc-nav-blur));
  border-bottom: none !important;
}

/* Sidebar */
ytmusic-guide-renderer, #guide-wrapper, #guide-wrapper.ytmusic-guide-renderer,
#mini-guide-background, #mini-guide, tp-yt-app-drawer #contentContainer {
  background: var(--ytcc-side) !important;
  border-right: 1px solid var(--ytcc-side-border) !important;
}

/* Player bar */
ytmusic-player-bar, #player-bar-background {
  background: var(--ytcc-player) !important;
  backdrop-filter: blur(var(--ytcc-player-blur)); -webkit-backdrop-filter: blur(var(--ytcc-player-blur));
}
#progress-bar, #progress-bar.ytmusic-player-bar, tp-yt-paper-slider {
  --paper-slider-active-color: var(--ytcc-accent) !important;
  --paper-slider-knob-color: var(--ytcc-accent) !important;
  --paper-progress-active-color: var(--ytcc-accent) !important;
}
#primaryProgress, .slider-knob-inner { background-color: var(--ytcc-accent) !important; border-color: var(--ytcc-accent) !important; }

/* Text */
ytmusic-app, body, yt-formatted-string, input, button, .title, .subtitle, .byline {
  font-family: var(--ytcc-font) !important;
}
.title, .title.ytmusic-player-bar, yt-formatted-string.title, h2, .header .title {
  color: var(--ytcc-text) !important;
}
.subtitle, .byline, .secondary-flex-columns yt-formatted-string, .strapline, .description {
  color: var(--ytcc-text2) !important;
}

/* Cards and thumbnails */
ytmusic-two-row-item-renderer #thumbnail, ytmusic-two-row-item-renderer img,
ytmusic-thumbnail-renderer, ytmusic-thumbnail-renderer img, .image-wrapper,
yt-img-shadow, yt-img-shadow img, ytmusic-responsive-list-item-renderer .thumbnail img {
  border-radius: var(--ytcc-thumb-radius) !important; overflow: hidden;
}
ytmusic-responsive-list-item-renderer:hover, ytmusic-player-queue-item:hover,
tp-yt-paper-item:hover, ytmusic-guide-entry-renderer:hover tp-yt-paper-item {
  background: var(--ytcc-hover) !important;
}

/* Chips and accent buttons */
ytmusic-chip-cloud-chip-renderer a, ytmusic-chip-cloud-chip-renderer .gradient-box,
ytmusic-chip-cloud-chip-renderer .chip-container {
  background: var(--ytcc-chip-bg) !important;
  color: var(--ytcc-chip-text) !important;
  border-radius: var(--ytcc-chip-radius) !important;
  border-color: transparent !important;
}
ytmusic-chip-cloud-chip-renderer[is-selected] a, ytmusic-chip-cloud-chip-renderer[is-selected] .gradient-box,
ytmusic-chip-cloud-chip-renderer[chip-style="STYLE_PRIMARY"] .gradient-box {
  background: var(--ytcc-accent) !important;
}
::-webkit-scrollbar-thumb { background: var(--ytcc-text2) !important; border-radius: 8px; }
* { scrollbar-color: var(--ytcc-text2) transparent; }
${t.customCss ? `\n/* Custom CSS */\n${t.customCss}\n` : ''}`;
}

function meta(v) { return String(v || '').replace(/\*\//g, '').replace(/[\r\n]+/g, ' ').trim(); }

// Stylus-compatible UserCSS file.
export function buildUserCss(theme) {
  const t = normalizeTheme(theme);
  const font = googleFontUrl(t.settings.text.font);
  const body = buildCss(t).split('\n').map((l) => (l ? '  ' + l : l)).join('\n');
  return `/* ==UserStyle==
@name         ${meta(t.name)}
@namespace    remaster.ytmusic/${meta(t.id || t.name).toLowerCase().replace(/[^a-z0-9-]+/g, '-')}
@version      ${t.version}
@description  ${meta(t.description || 'A YouTube Music theme made with Remaster')}
@author       ${meta(t.author || 'anonymous')}
==/UserStyle== */

@-moz-document domain("music.youtube.com") {
${font ? `  @import url("${font}");\n` : ''}${body}
}
`;
}

export function slugify(name) {
  return (String(name).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 40) || 'theme');
}
