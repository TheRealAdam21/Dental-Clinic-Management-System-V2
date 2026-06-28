# CI/CD Setup

This project uses **GitHub Actions** for continuous integration and **Vercel** for web deployment.

## Quick start (first time)

### 1. Log in to GitHub

```bash
gh auth login
```

Choose: GitHub.com → HTTPS → Login with browser.

### 2. Create the repo and push

```bash
cd "d:\Coding Programming\tooth-time-electron\Dental-Clinic-Management-System-V2"
gh repo create Dental-Clinic-Management-System-V2 --public --source=. --remote=origin --push
```

Repo URL: https://github.com/TheRealAdam21/Dental-Clinic-Management-System-V2

If the repo already exists:

```bash
git remote add origin https://github.com/TheRealAdam21/Dental-Clinic-Management-System-V2.git
git push -u origin main
```

### 3. Connect Vercel

```bash
vercel login
vercel link
```

Add env vars in the Vercel dashboard (or with `vercel env add`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ENABLE_REMOTE_SYNC` = `true`
- `VITE_VAPID_PUBLIC_KEY` (optional)

### 4. Add GitHub secrets (for auto-deploy)

GitHub → your repo → **Settings → Secrets and variables → Actions**

| Secret | Where to get it |
|--------|-----------------|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` after `vercel link` |
| `VITE_SUPABASE_URL` | Supabase project settings |
| `VITE_SUPABASE_ANON_KEY` | Supabase API keys |
| `VITE_VAPID_PUBLIC_KEY` | Optional |

After secrets are set, every push to `main` runs CI and deploys to Vercel.

---

## How CI/CD works now

You connected the repo to Vercel in the dashboard. That means **Vercel handles deployment** — you do not need a separate GitHub Actions deploy workflow.

```
git push to main
    ├── Vercel (automatic)     → builds & deploys website
    └── GitHub Actions CI      → lint, build check, Windows desktop installer
```

### Vercel (deployment)

- **Trigger:** every push to `main`
- **Where to check:** [vercel.com/dashboard](https://vercel.com/dashboard) → your project → Deployments
- **Live URL:** https://tooth-time-dental.vercel.app
- **Env vars:** set in Vercel → Project → Settings → Environment Variables

### GitHub Actions CI (quality + desktop builds)

- **Trigger:** every push/PR to `main`
- **Where to check:** GitHub → Actions tab → **CI** workflow
- **What it does:**
  - Installs deps and builds the web app (catches broken code)
  - Runs lint (warnings won't block the workflow)
  - On `main` only: builds the Windows Tauri `.exe` installer as a downloadable artifact

### Your day-to-day

1. Code locally
2. `git push origin main`
3. **Vercel** deploys the site (watch Vercel dashboard)
4. **GitHub Actions** runs CI in parallel (watch Actions tab for green checkmark)

No `VERCEL_TOKEN` GitHub secret is required when using Vercel's native GitHub integration.

## Desktop builds

Windows installers are uploaded as GitHub Actions artifacts from the **Build Tauri (Windows)** job on each push to `main`.

Download from: **Actions → CI → latest run → Artifacts → tooth-time-windows-installer**.
