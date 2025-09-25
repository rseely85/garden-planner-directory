# Garden Planner Directory — Step-by-Step Setup Guide (Mac Edition)

This checklist is tailored for **macOS**. Copy-paste the commands in **Terminal**.

---

## 0) Prerequisites
1. Install **Homebrew** if not already installed:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
2. Install required tools:
   ```bash
   brew install gh jq git node
   ```
3. Login to GitHub CLI:
   ```bash
   gh auth login
   ```
   - Choose **GitHub.com**
   - Login with browser
   - Grant access

---

## 1) Prepare the Repo
1. Download and unzip `GardenPlannerDirectory_Package.zip`
   ```bash
   unzip ~/Downloads/GardenPlannerDirectory_Package.zip -d ~/Projects/
   ```
   (Replace `~/Projects/` with your working folder)
2. Go into the project folder:
   ```bash
   cd ~/Projects/GardenPlannerDirectory_Package
   ```
3. Initialize git (if not already done):
   ```bash
   git init
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   ```
4. Commit & push contents:
   ```bash
   git add .
   git commit -m "Add Garden Planner Directory starter kit"
   git push origin main
   ```

---

## 2) One-Click GitHub Project + Issues
1. Go to scripts folder:
   ```bash
   cd scripts
   ```
2. Make the script executable:
   ```bash
   chmod +x setup_all.sh
   ```
3. Edit the file:
   ```bash
   nano setup_all.sh
   ```
   - Set:
     ```bash
     OWNER="your-github-username"
     REPO="your-username/your-repo"
     ```
   - Save with **CTRL+O**, exit with **CTRL+X**
4. Run the script:
   ```bash
   ./setup_all.sh
   ```

This will:
- Create your **Project board**
- Add **labels + milestones**
- Create all **10 MVP issues** and place them in "To Do"

---

## 3) Firebase Setup
1. Install Firebase CLI:
   ```bash
   curl -sL https://firebase.tools | bash
   ```
2. Login:
   ```bash
   firebase login
   ```
3. Initialize project:
   ```bash
   firebase init
   ```
   - Choose Firestore, Hosting
   - Use existing project (create in Firebase Console first)
4. Apply rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
5. Seed data:
   ```bash
   npm install firebase-admin
   node scripts/seedFirestore.js
   ```

---

## 4) Scaffold Next.js App (Copilot)
Ask GitHub Copilot in VS Code:
> “Create a Next.js TypeScript app with routes `/`, `/planner`, `/directory/[city]/[category]`, `/supplier/[slug]`. Install Firebase, React Query, Zustand, Stripe, Tailwind. Add components `DirectoryFilters`, `SupplierCard`, `PlannerSidebarMatches`, `MiniPlannerEmbed`, `Map`, `ReviewList`, `ReviewForm`. Wire queries to Firestore schema in data/.”

---

## 5) Environment Variables
Create `.env.local` in your Next.js app root:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
STRIPE_PUBLIC_KEY=...
STRIPE_SECRET_KEY=...
```

---

## 6) Run Locally
```bash
npm install
npm run dev
```

---

## 7) Deploy
1. Push code to GitHub:
   ```bash
   git add .
   git commit -m "MVP app scaffold"
   git push origin main
   ```
2. Deploy to **Vercel**:
   - Go to https://vercel.com
   - Import repo
   - Add env vars
   - Deploy
3. Or deploy to **Netlify**:
   - Go to https://netlify.com
   - Import repo
   - Build command: `npm run build`

---

## 8) MVP Success Criteria
- ✅ Home page with Mini Planner works
- ✅ Directory shows suppliers with filters
- ✅ Sidebar shows supplier matches
- ✅ Supplier profile + reviews functional
- ✅ Stripe premium elevates supplier
- ✅ Live site accessible

---

## 9) Daily Workflow
- Use GitHub Project board daily:
  - Move issues To Do → In Progress → Done
- Review milestones weekly
- Commit + push often


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
