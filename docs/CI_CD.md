# CI/CD Setup

This project uses **GitHub Actions** for continuous integration and **Vercel** for web deployment.

## Workflows

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `ci.yml` | Push/PR to `main` | Lint + build web app; on `main` also builds Windows Tauri installer |
| `deploy-vercel.yml` | Push to `main` | Deploys production web app to Vercel |

## One-time setup

### 1. Push to GitHub

```bash
gh auth login
gh repo create Dental-Clinic-Management-System-V2 --public --source=. --remote=origin --push
```

Or, if the repo already exists:

```bash
git remote add origin https://github.com/TheRealAdam21/Dental-Clinic-Management-System-V2.git
git push -u origin main
```

### 2. Create a Vercel project

```bash
vercel login
vercel link
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_ENABLE_REMOTE_SYNC production
vercel env add VITE_VAPID_PUBLIC_KEY production
```

### 3. Add GitHub repository secrets

In GitHub: **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Where to get it |
|--------|-----------------|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | `.vercel/project.json` after `vercel link` |
| `VITE_SUPABASE_URL` | Supabase project settings |
| `VITE_SUPABASE_ANON_KEY` | Supabase project API keys |
| `VITE_VAPID_PUBLIC_KEY` | Optional — web push public key |

### 4. Enable GitHub Environments (optional)

The deploy workflow uses a `production` environment. You can add protection rules in **Settings → Environments**.

## Manual deploy

```bash
npm run build
vercel --prod
```

## Desktop builds

Windows installers are uploaded as GitHub Actions artifacts from the `Build Tauri (Windows)` job on each push to `main`.

Download from: **Actions → CI → latest run → Artifacts**.
