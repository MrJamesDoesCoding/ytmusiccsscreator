// Validates every theme in themes/*.json and writes:
//   themes/index.json          (list used by the gallery)
//   themes/dist/<id>.user.css  (one-click Stylus installs)
//   themes/dist/<id>.css       (plain CSS for the YouTube Music Desktop App)
// In GitHub Actions (GITHUB_TOKEN set) it also creates one Discussion per theme and records like counts.
// Usage: node scripts/build.mjs [--check]   (--check validates only, writes nothing)
import { readdir, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeTheme, validateTheme, buildUserCss, buildPlainCss } from '../js/theme.js';
import { syncDiscussions } from './discussions.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'themes');
const checkOnly = process.argv.includes('--check');
const ID = /^[a-z0-9][a-z0-9-]{0,59}$/;

const files = (await readdir(dir)).filter((f) => f.endsWith('.json') && f !== 'index.json').sort();
const themes = [];
let failed = false;

for (const file of files) {
  const id = file.replace(/\.json$/, '');
  const problems = [];
  let raw;
  try {
    const text = await readFile(join(dir, file), 'utf8');
    if (text.length > 40000) problems.push('File is larger than 40 KB.');
    raw = JSON.parse(text);
  } catch (e) {
    problems.push(`Not valid JSON: ${e.message}`);
  }
  if (!ID.test(id)) problems.push('File name must be lowercase letters, numbers and dashes, e.g. my-theme.json.');
  if (raw) problems.push(...validateTheme(raw));
  if (problems.length) {
    failed = true;
    console.error(`✗ themes/${file}\n  - ${problems.join('\n  - ')}`);
    continue;
  }
  themes.push({ ...normalizeTheme(raw), id });
  console.log(`✓ themes/${file}`);
}

if (failed) {
  console.error('\nSome themes are invalid. Fix the problems above.');
  process.exit(1);
}

themes.sort((a, b) => b.created.localeCompare(a.created) || a.name.localeCompare(b.name));

if (!checkOnly && process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
  try {
    const [owner, name] = process.env.GITHUB_REPOSITORY.split('/');
    const likes = await syncDiscussions(themes, {
      token: process.env.GITHUB_TOKEN,
      repository: process.env.GITHUB_REPOSITORY,
      categoryName: process.env.LIKES_CATEGORY || 'Themes',
      siteUrl: process.env.SITE_URL || `https://${owner.toLowerCase()}.github.io/${name}/`,
    });
    for (const t of themes) Object.assign(t, likes[t.id] || {});
  } catch (e) {
    console.warn(`! Could not sync likes: ${e.message}`);
  }
}

if (!checkOnly) {
  const dist = join(dir, 'dist');
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  for (const t of themes) {
    await writeFile(join(dist, `${t.id}.user.css`), buildUserCss(t));
    await writeFile(join(dist, `${t.id}.css`), buildPlainCss(t));
  }
  await writeFile(join(dir, 'index.json'), JSON.stringify(themes));
  console.log(`\nBuilt ${themes.length} themes.`);
} else {
  console.log(`\nAll ${themes.length} themes are valid.`);
}
