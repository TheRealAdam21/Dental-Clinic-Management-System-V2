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

## How CI/CD works (junior-friendly)

Think of CI/CD as a **robot assistant** that runs every time you push code to GitHub.

### The big picture

```
You push code → GitHub notices → Robots run tests/builds → Website updates automatically
```

You write code on your laptop. When you `git push`, GitHub runs workflows defined in `.github/workflows/`. You don't run builds on your machine for production — the cloud does it the same way every time.

### Workflow 1: `ci.yml` (quality check)

**When it runs:** Every push or pull request to `main`.

**What it does:**

1. **Checkout** — downloads your code onto a fresh virtual machine.
2. **Setup Node.js** — installs Node 20 and caches `npm` packages.
3. **Install dependencies** — runs `npm ci` (clean install from lockfile).
4. **Lint** — runs `npm run lint` to catch code style/errors.
5. **Build web app** — runs `npm run build` to make sure the site compiles.

If any step fails, GitHub shows a red X. Fix the code and push again.

**On pushes to `main` only**, a second job also runs:

6. **Build Tauri (Windows)** — compiles the desktop `.exe` / `.msi` installer.
7. **Upload artifact** — saves the installer under **Actions → latest run → Artifacts** so you can download it.

### Workflow 2: `deploy-vercel.yml` (go live)

**When it runs:** Every push to `main` (and manually via "Run workflow").

**What it does:**

1. Checks out code and installs Node + Vercel CLI.
2. **Pulls Vercel config** — syncs project settings from Vercel.
3. **Builds** the production site with your secret env vars (Supabase URL, etc.).
4. **Deploys** the built files to Vercel's CDN.

Your live website URL updates without you running `vercel` locally.

### Why secrets?

The workflows need API keys (Supabase, Vercel token) but those must **never** be committed in git. GitHub **Secrets** store them encrypted; workflows read them as `${{ secrets.NAME }}`.

### What you do day-to-day

1. Write code locally.
2. `git add` → `git commit` → `git push origin main`
3. Open GitHub **Actions** tab — watch CI run.
4. If deploy succeeds, your Vercel site is updated.
5. Download the Windows installer from CI artifacts if you need a desktop build.

### Manual deploy (without waiting for CI)

```bash
npm run build
vercel --prod
```

## Desktop builds

Windows installers are uploaded as GitHub Actions artifacts from the **Build Tauri (Windows)** job on each push to `main`.

Download from: **Actions → CI → latest run → Artifacts → tooth-time-windows-installer**.
