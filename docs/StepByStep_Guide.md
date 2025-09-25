# Garden Planner Directory — Step-by-Step Setup Guide

## Prerequisites
- GitHub account + repo
- GitHub CLI (gh), jq
- Node.js, npm, Git

## Steps
1. Add docs/, data/, scripts/ into repo and commit.
2. Edit and run scripts/setup_all.sh to auto-create project + issues.
3. Setup Firebase project, apply rules, seed data.
4. Scaffold Next.js project with Copilot.
5. Add env vars (.env.local).
6. Run locally: npm install && npm run dev
7. Deploy via Vercel/Netlify.

See PDF requirements for details.


---

## 🌐 Deploying to Vercel (Recommended)

Vercel is the default hosting platform for Next.js apps. It gives you free SSL, global CDN, serverless API routes, and instant deploys.

### 1. Create a Vercel Account
- Go to [https://vercel.com](https://vercel.com)
- Sign up with your GitHub account

### 2. Import Your GitHub Repo
- In Vercel dashboard, click **New Project**
- Import your **garden-planner-directory** repo
- Root directory: `/`
- Framework preset: **Next.js**
- Environment variables: copy from `.env.local` into Vercel dashboard

### 3. Get Your Vercel Secrets
For GitHub Actions CI/CD, you need three values from Vercel:

- **VERCEL_TOKEN** → Create a Personal Token in [Account Settings → Tokens](https://vercel.com/account/tokens)
- **VERCEL_ORG_ID** → Found in your project’s settings → “General” → “Team”
- **VERCEL_PROJECT_ID** → Found in your project’s settings → “General” → “Project”

### 4. Add Secrets in GitHub
In your GitHub repo:
- Go to **Settings → Secrets and variables → Actions**
- Add the following repository secrets:
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`

### 5. Push to Main and Deploy
Once secrets are set, every push to **main** branch will:
1. Install dependencies
2. Build project
3. Deploy to Vercel

You can monitor deployments in:
- GitHub Actions tab
- Vercel dashboard

### 6. Access Your Site
After deploy:
- Vercel gives you a production URL like `https://your-project.vercel.app`
- You can also set up a custom domain (e.g., `planner.sunset-oaks.com`)

---
