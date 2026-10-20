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
