# Pushing this to GitHub + going live

This project is ready to run, but publishing it needs your own GitHub and
hosting accounts. Here's the fastest path.

## 1. Create the repo and push

```bash
cd signal-deck
git init
git add .
git commit -m "Signal Deck: real-time performance dashboard"
gh repo create signal-deck --public --source=. --push
```

No `gh` CLI? Create an empty repo at github.com/new (don't initialize it with
a README), then:

```bash
git remote add origin https://github.com/<your-username>/signal-deck.git
git branch -M main
git push -u origin main
```

## 2. Deploy

Pick whichever is fastest for you — all three configs are already in the repo:

- **Vercel:** [vercel.com/new](https://vercel.com/new) → import the repo →
  deploy. Zero config needed (`vercel.json` is already set up).
- **Netlify:** [app.netlify.com/start](https://app.netlify.com/start) →
  import the repo → deploy (`netlify.toml` is already set up).
- **GitHub Pages:** Settings → Pages → set Source to "GitHub Actions". The
  included workflow (`.github/workflows/deploy.yml`) builds and deploys on
  every push to `main`.

Any of these gives you a public URL in under two minutes.

## 3. Finish the submission

- Paste the live URL into `README.md` under "Live demo".
- Paste the repo URL into `README.md` under "Repo".
- Set the repo's GitHub "About" section (gear icon on the repo home page) to
  include the live URL too — reviewers often check there first.
- Optional but worth it: take a screenshot of the running dashboard, save as
  `docs/screenshot.png`, commit it, and un-comment the image line at the top
  of the README.
