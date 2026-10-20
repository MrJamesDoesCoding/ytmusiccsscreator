// One-step sharing: fork the gallery repo (if needed), add themes/<id>.json on a branch, open a pull request.
import { gh, user } from './auth.js';
import { REPO } from './config.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b64 = (s) => { const bytes = new TextEncoder().encode(s); let bin = ''; for (const b of bytes) bin += String.fromCharCode(b); return btoa(bin); };

export async function shareViaApi(theme, fileJson, step = () => {}) {
  const me = user().login;
  const up = `/repos/${REPO.owner}/${REPO.name}`;
  const isOwner = me.toLowerCase() === REPO.owner.toLowerCase();
  let target = { owner: REPO.owner, name: REPO.name };

  if (!isOwner) {
    step('Making your copy of the gallery on GitHub…');
    const fork = await gh(`${up}/forks`, { method: 'POST', body: { default_branch_only: true } });
    target = { owner: fork.owner.login, name: fork.name };
    for (let i = 0; ; i++) {
      try { await gh(`/repos/${target.owner}/${target.name}/git/ref/heads/${REPO.branch}`); break; }
      catch (e) { if (i >= 20) throw new Error('GitHub is still preparing your copy. Try Share again in a minute.'); await sleep(1500); }
    }
    try { await gh(`/repos/${target.owner}/${target.name}/merge-upstream`, { method: 'POST', body: { branch: REPO.branch } }); } catch {}
  }
  const tr = `/repos/${target.owner}/${target.name}`;
  const branch = `theme/${theme.id}`;
  const path = `themes/${theme.id}.json`;

  step('Creating a branch for your theme…');
  const upSha = (await gh(`${up}/git/ref/heads/${REPO.branch}`)).object.sha;
  try {
    await gh(`${tr}/git/refs`, { method: 'POST', body: { ref: `refs/heads/${branch}`, sha: upSha } });
  } catch (e) {
    if (e.status !== 422) throw e;
    if (!/already exists/i.test(e.message)) {
      const ownSha = (await gh(`${tr}/git/ref/heads/${REPO.branch}`)).object.sha;
      await gh(`${tr}/git/refs`, { method: 'POST', body: { ref: `refs/heads/${branch}`, sha: ownSha } });
    }
  }

  step('Uploading your theme…');
  let sha;
  try { sha = (await gh(`${tr}/contents/${path}?ref=${encodeURIComponent(branch)}`)).sha; }
  catch (e) { if (e.status !== 404) throw e; }
  await gh(`${tr}/contents/${path}`, {
    method: 'PUT',
    body: { message: `${sha ? 'Update' : 'Add'} theme: ${theme.name}`, content: b64(fileJson), branch, ...(sha ? { sha } : {}) },
  });

  step('Opening a pull request…');
  const open = await gh(`${up}/pulls?state=open&head=${encodeURIComponent(`${target.owner}:${branch}`)}`);
  if (open.length) return open[0].html_url;
  const pr = await gh(`${up}/pulls`, {
    method: 'POST',
    body: {
      title: `New theme: ${theme.name}`,
      head: isOwner ? branch : `${target.owner}:${branch}`,
      base: REPO.branch,
      body: `**${theme.name}** by ${theme.author}\n\n${theme.description || ''}\n\nShared from the theme maker.`,
      ...(isOwner ? {} : { maintainer_can_modify: true }),
    },
  });
  return pr.html_url;
}
