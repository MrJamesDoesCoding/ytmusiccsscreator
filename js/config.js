// Set this to the GitHub repository that hosts the site and the themes/ folder.
export const REPO = {
  owner: 'MrJamesDoesCoding',
  name: 'ytmusiccsscreator',
  branch: 'main',
};

// GitHub login. See README "Set up GitHub login".
// Leave clientId empty to hide "Sign in" (likes then link to GitHub instead).
export const AUTH = {
  clientId: '',                // GitHub OAuth App "Client ID" (public, safe to commit)
  tokenUrl: '',                // Cloudflare Worker URL + /token, e.g. https://ytm-auth.yourname.workers.dev/token
  scope: 'public_repo gist',   // public_repo: like, fork and open pull requests. gist: save your themes.
};

// Discussions category that holds one discussion per theme (its 👍 reactions are the likes).
export const LIKES = { category: 'Themes' };
