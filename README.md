# Remaster: YouTube Music themes

A static website where people can browse and install YouTube Music themes, and make their own by clicking on a live preview. No server or database: themes are JSON files in this repo.

## How it works

- `index.html`: gallery. Reads `themes/index.json` and shows live previews. **Install with Stylus** links to `themes/dist/<id>.user.css`, which Stylus picks up automatically.
- `editor.html`: point-and-click theme maker. Click a part of the preview (top bar, sidebar, player, cards, text, chips, background) and adjust it on the right. Drafts are saved in the browser. Export as CSS, `.user.css` or a theme `.json`.
- **Share** opens GitHub's "propose a new file" page with `themes/<id>.json` filled in. Visitors without write access automatically get a fork + pull request.
- `js/theme.js`: theme model, validation and CSS generation (shared by the browser and the build script). All YouTube Music selectors live in `buildCss()`; update them there when YouTube changes its markup.
- `scripts/build.mjs`: validates all themes and generates `themes/index.json` and `themes/dist/`.

## Setup

1. Push this folder to a GitHub repository.
2. Edit `js/config.js` and set `owner` / `name` / `branch` to that repository.
3. In the repo: **Settings > Pages > Source: GitHub Actions**.
4. Every push to `main` builds and deploys the site (`.github/workflows/deploy.yml`). Pull requests that touch `themes/` are validated (`check-themes.yml`).

## Run locally

```
npm run build      # generate index + .user.css files
npm run dev        # build and serve on http://localhost:5173
```

## Reviewing submitted themes

The PR check rejects invalid JSON, wrong file names, `@import`, `javascript:`, HTML tags and unbalanced braces in custom CSS, and non-https image URLs. Still glance at `customCss` before merging, since it runs on every installer's YouTube Music page.

## Likes, GitHub login and "My themes"

- **Likes** are 👍 reactions on one GitHub Discussion per theme. The deploy workflow creates the discussions and refreshes like counts every hour. Signed-in visitors see live counts and can like in one click; everyone else gets a "Sign in with GitHub" prompt.
- **Sign in with GitHub** keeps people signed in (token stored in their browser).
- **My themes** saves every theme you make to a private gist on your GitHub account, so it's on every device.
- **Share** forks the repo for the visitor, adds their theme file and opens the pull request, without leaving the site.

### One-time setup

**1. Turn on Discussions** — repo **Settings → General → Features → Discussions**. Then on the **Discussions** tab, add a category named **Themes** with the **Announcement** format (so only the site creates discussions, but anyone can react).

**2. Create a GitHub OAuth App** — github.com → **Settings → Developer settings → OAuth Apps → New OAuth App**:
- Homepage URL: `https://mrjamesdoescoding.github.io/ytmusiccsscreator/`
- Authorization callback URL: `https://mrjamesdoescoding.github.io/ytmusiccsscreator/auth.html`

Copy the **Client ID**, then click **Generate a new client secret** and copy the secret.

**3. Deploy the login worker** (free Cloudflare account). In a terminal in this folder:
```
cd worker
npx wrangler login
npx wrangler secret put GITHUB_CLIENT_SECRET     # paste the client secret
```
Put your Client ID into `worker/wrangler.toml` (`GITHUB_CLIENT_ID`), then:
```
npx wrangler deploy
```
It prints a URL like `https://ytm-auth.<you>.workers.dev`.

**4. Fill in `js/config.js`** — `AUTH.clientId` = the Client ID, `AUTH.tokenUrl` = the worker URL + `/token`. Commit and push.

The client secret never goes into this repo; it only lives in Cloudflare.
