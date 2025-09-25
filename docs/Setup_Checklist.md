# 🌱 Garden Planner Directory — Setup & Deployment Checklist

This checklist takes you from **zero → live site** using GitHub + Firebase + Vercel.

---

## ✅ Phase 1: GitHub Setup
- [ ] Create new repo on GitHub (private or public)
- [ ] Clone repo locally on MacBook Pro
- [ ] Unzip `GardenPlannerDirectory_Package.zip` into repo folder
- [ ] Commit + push starter kit to `main` branch
- [ ] Confirm code visible in GitHub repo

---

## ✅ Phase 2: Project Board + Issues
- [ ] Go to `/scripts` folder
- [ ] Run setup script:
  ```bash
  chmod +x setup_all.sh
  ./setup_all.sh
  ```
- [ ] Confirm labels created in repo
- [ ] Confirm milestones created
- [ ] Confirm 10 MVP issues created
- [ ] Confirm project board created (Backlog → To Do → In Progress → Done)

---

## ✅ Phase 3: Firebase Setup
- [ ] Go to [Firebase Console](https://console.firebase.google.com/)
- [ ] Create new Firebase project
- [ ] Enable Firestore + Authentication + Storage
- [ ] Copy Firebase config keys → paste into `.env.local`
- [ ] Deploy security rules:
  ```bash
  firebase deploy --only firestore:rules
  ```
- [ ] Seed sample data:
  ```bash
  node scripts/seedFirestore.js
  ```

---

## ✅ Phase 4: Local Dev (Mac)
- [ ] Install dependencies:
  ```bash
  npm install
  ```
- [ ] Start dev server:
  ```bash
  npm run dev
  ```
- [ ] Open http://localhost:3000
- [ ] Confirm skeleton pages load with TODOs
- [ ] Test Firestore queries return seeded data (optional)

---

## ✅ Phase 5: Vercel Setup
- [ ] Go to [Vercel](https://vercel.com)
- [ ] Sign up with GitHub
- [ ] Import repo into Vercel
- [ ] Framework: **Next.js**
- [ ] Add `.env.local` variables in Vercel dashboard
- [ ] Copy VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID from Vercel settings
- [ ] Add secrets in GitHub repo (Settings → Secrets → Actions)

---

## ✅ Phase 6: CI/CD Pipeline
- [ ] Push to `main` branch
- [ ] Check GitHub Actions tab → confirm deploy workflow runs
- [ ] Check Vercel dashboard → confirm new deployment
- [ ] Confirm production URL works (e.g., https://your-project.vercel.app)

---

## ✅ Phase 7: Custom Domain (Optional)
- [ ] In Vercel dashboard → Settings → Domains
- [ ] Add custom domain (e.g., planner.sunset-oaks.com)
- [ ] Update DNS (CNAME → cname.vercel-dns.com)
- [ ] Confirm domain resolves to live app

---

## 🎯 Success Criteria
- [ ] Repo live on GitHub
- [ ] Project board + issues auto-generated
- [ ] Firebase seeded with suppliers/products
- [ ] Local dev running at http://localhost:3000
- [ ] Vercel deployment live at production URL
- [ ] Copilot ready to expand TODOs into real UI

---

Keep this checklist open while you execute. Every box ticked = one step closer to launch 🚀
