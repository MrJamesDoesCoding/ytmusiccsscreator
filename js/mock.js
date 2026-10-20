// A lightweight look-alike of the YouTube Music home screen, used for previews.
// Elements carry data-part so the editor knows what was clicked.
import { buildVars, googleFontUrl, normalizeTheme } from './theme.js';

const ALBUMS = [
  ['Night Ferry', 'Harbor Lights', 'radial-gradient(circle at 30% 35%, #ffd27a 0 18%, transparent 19%), linear-gradient(160deg, #213a7a, #0c1430)'],
  ['Salt & Static', 'The Low Tides', 'repeating-linear-gradient(45deg, #e85d75 0 12px, #f3a5b4 12px 24px)'],
  ['Paper Moons', 'Ivy Calder', 'radial-gradient(circle at 70% 30%, #fff6d8 0 22%, transparent 23%), linear-gradient(#5d4a9c, #2b2050)'],
  ['Low Orbit', 'Satellite Choir', 'conic-gradient(from 200deg, #12c2e9, #c471ed, #f64f59, #12c2e9)'],
  ['Glasshouse', 'Fern & Field', 'linear-gradient(135deg, #a8e063, #3f7d20)'],
];
const ROWS = [
  ['Slow Weather', 'Ivy Calder', '3:41', 'linear-gradient(135deg, #f7971e, #ffd200)'],
  ['Undertow', 'The Low Tides', '4:12', 'linear-gradient(135deg, #2c3e50, #4ca1af)'],
  ['Copper Wire', 'Satellite Choir', '2:58', 'linear-gradient(135deg, #b24592, #f15f79)'],
];

const icon = {
  home: '<svg viewBox="0 0 24 24"><path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/></svg>',
  explore: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm3.5 6.5-2 5-5 2 2-5z"/></svg>',
  library: '<svg viewBox="0 0 24 24"><path d="M4 4h3v16H4zm5 0h3v16H9zm5.5.5 2.9-.8 4.1 15.4-2.9.8z"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zM6 18l8.5-6L6 6z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><path d="M10 3a7 7 0 1 0 4.2 12.6l5.1 5.1 1.4-1.4-5.1-5.1A7 7 0 0 0 10 3Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"/></svg>',
};

export function mockHTML() {
  return `
  <header class="ym-nav" data-part="navbar">
    <div class="ym-logo"><span class="ym-logo-dot">${icon.play}</span><span>Music</span></div>
    <div class="ym-search">${icon.search}<span>Search songs, albums, artists</span></div>
    <div class="ym-avatar"></div>
  </header>
  <aside class="ym-side" data-part="sidebar">
    <a class="ym-side-item is-on">${icon.home}<span>Home</span></a>
    <a class="ym-side-item">${icon.explore}<span>Explore</span></a>
    <a class="ym-side-item">${icon.library}<span>Library</span></a>
    <hr>
    <div class="ym-playlists">
      <span>Liked music</span><span>Late night drive</span><span>Focus, mostly</span>
    </div>
  </aside>
  <main class="ym-main" data-part="background">
    <div class="ym-chips" data-part="chips">
      <span class="ym-chip is-on">Relax</span><span class="ym-chip">Energize</span><span class="ym-chip">Workout</span><span class="ym-chip">Commute</span><span class="ym-chip">Focus</span>
    </div>
    <h3 class="ym-h" data-part="text">Listen again</h3>
    <div class="ym-cards">
      ${ALBUMS.map(([t, a, art]) => `
      <div class="ym-card">
        <div class="ym-thumb" data-part="cards" style="background:${art}"></div>
        <div class="ym-title" data-part="text">${t}</div>
        <div class="ym-sub" data-part="text">${a}</div>
      </div>`).join('')}
    </div>
    <h3 class="ym-h" data-part="text">Quick picks</h3>
    <div class="ym-rows">
      ${ROWS.map(([t, a, d, art], i) => `
      <div class="ym-row${i === 1 ? ' is-hover' : ''}" data-part="cards">
        <div class="ym-thumb ym-thumb-sm" style="background:${art}"></div>
        <div><div class="ym-title" data-part="text">${t}</div><div class="ym-sub" data-part="text">${a}</div></div>
        <span class="ym-sub">${d}</span>
      </div>`).join('')}
    </div>
  </main>
  <footer class="ym-player" data-part="player">
    <div class="ym-progress" data-part="accent"><i></i><b></b></div>
    <div class="ym-controls">${icon.prev}<span class="ym-play" data-part="accent">${icon.play}</span>${icon.next}<span class="ym-sub ym-time">1:24 / 3:41</span></div>
    <div class="ym-now">
      <div class="ym-thumb ym-thumb-sm" style="background:${ROWS[0][3]}"></div>
      <div><div class="ym-title" data-part="text">Slow Weather</div><div class="ym-sub" data-part="text">Ivy Calder • Paper Moons</div></div>
    </div>
    <div class="ym-vol"><i></i></div>
  </footer>`;
}

const loadedFonts = new Set();
function ensureFont(name) {
  const url = googleFontUrl(name);
  if (!url || loadedFonts.has(url) || typeof document === 'undefined') return;
  loadedFonts.add(url);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

export function applyTheme(el, theme) {
  const t = normalizeTheme(theme);
  for (const [k, v] of Object.entries(buildVars(t))) el.style.setProperty(k, v);
  ensureFont(t.settings.text.font);
}

// Creates a mock inside `host`, scaled to fit its width. Returns the .ym element.
export function mountMock(host, theme, { editable = false } = {}) {
  host.classList.add('ym-host');
  host.innerHTML = `<div class="ym${editable ? ' is-editable' : ''}" role="img" aria-label="Preview of YouTube Music with this theme">${mockHTML()}</div>`;
  const el = host.firstElementChild;
  if (editable) el.removeAttribute('role');
  applyTheme(el, theme);
  const fit = () => {
    const s = host.clientWidth / 960;
    el.style.transform = `scale(${s})`;
    host.style.height = `${600 * s}px`;
  };
  fit();
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(host);
  return el;
}
