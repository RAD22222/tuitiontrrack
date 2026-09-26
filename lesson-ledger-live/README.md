# Lesson Ledger — Tuition Tracker

A calm, mobile-first calendar and earnings tracker for private tuition lessons.
Static site — no build step, no dependencies. Just upload and go live.

## What's inside

| File | Purpose |
|---|---|
| `index.html` | App shell + UI |
| `styles.css` | All styling + animations |
| `app.js` | UI logic, calendar, gestures, PWA install |
| `domain.js` | Reusable calculations (cycles, earnings, totals) |
| `sw.js` | Offline service worker |
| `manifest.webmanifest` | PWA install manifest |
| `icon.svg` / `icon-maskable.svg` | App icons |
| `vercel.json` | Vercel static config |

Data is stored in the browser's `localStorage`, so it works fully offline
after the first visit.

## Option A — Upload to GitHub (web, no terminal)

1. Go to <https://github.com/new> and create a repository, e.g. `lesson-ledger`.
   - Set it **Public** (needed for free GitHub Pages).
   - Do **not** tick "Add a README" (this folder already has one).
2. On the new repo page, click **uploading an existing file**.
3. Drag in **all files from this folder** (`index.html`, `styles.css`,
   `app.js`, `domain.js`, `sw.js`, `manifest.webmanifest`, both icons,
   `vercel.json`, `.gitignore`) and click **Commit changes**.

### Turn on free hosting (GitHub Pages)

1. In the repo, go to **Settings → Pages**.
2. Under **Build and deployment → Branch**, choose `main` and `/(root)`,
   then **Save**.
3. Your site goes live at `https://<your-username>.github.io/lesson-ledger/`
   within a minute or two.

## Option B — Deploy on Vercel (recommended)

### From the GitHub repo

1. Go to <https://vercel.com/new> and sign in (you can sign in with GitHub).
2. Click **Import** next to your `lesson-ledger` repository.
3. Leave all settings as-is (no build command needed) and click **Deploy**.
4. You get a live URL like `https://lesson-ledger.vercel.app`.

### Without GitHub (drag & drop)

1. Go to <https://vercel.com/new>.
2. Drag this whole folder onto the page and click **Deploy**.

## Preview locally

Any static server works, for example:

```bash
cd lesson-ledger-live
npx serve .
```

Then open the printed `http://localhost:3000` address.
(Service worker + install prompt need `http(s)`, not `file://`.)

## Notes

- HTTPS is automatic on both GitHub Pages and Vercel.
- The PWA install banner appears on mobile once the site has real content.
- To update the live site later, just upload/replace the changed files in
  the GitHub repo — Pages and Vercel redeploy automatically.
