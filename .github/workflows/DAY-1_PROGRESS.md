# Day 1 — Garden Planner Directory — Progress log (2025-09-25)

## Summary
- Repo: `rseely85/garden-planner-directory`
- Local path: `~/Projects/garden-planner-directory`
- Files added/unzipped from package: `components/`, `pages/`, `pages/api/`, `scripts/`, `data/`, `styles/`
- Git: remote `origin` added; initial commit pushed to `main`.

## Firebase / GCP
- Firebase project: `garden-planner-directory`  
  Console: https://console.firebase.google.com/project/garden-planner-directory
- Firestore created (region: us-east5)
- Storage attempt made (region mismatch noted, not yet resolved)
- Firestore rules deployed from `scripts/firestore.rules`
- Seeded Firestore with `node scripts/seedFirestore.js` — verified `products` + `suppliers` collections populated
- Used `gcloud auth application-default login` and `gcloud config set project garden-planner-directory` because service account key creation was blocked by organization policy.
- ✅ Seeding confirmed working.

## Local setup / tools
- Installed `firebase-tools` globally
- Installed Google Cloud SDK (`gcloud`) and Python 3.11
- Ran `npm install` to populate node_modules
- Fixed npm cache/permission issues

## Next actions (priority)
1. Connect Next.js app to Firestore:
   - Create `firebaseConfig.ts`
   - Add `.env.local` for Firebase config
   - Replace hard-coded fetches with Firestore queries
2. Create a secure way to upload product/supplier spreadsheets (API route or Cloud Function).
3. Add Hosting (if desired) and CI/CD for automatic deploys.

## Notes / gotchas
- Never commit secrets (service account JSON, API keys).
- Use `.env.local` (already in `.gitignore`) for secrets.
- Service account JSON keys are blocked, so we’re using `gcloud auth application-default login` (ADC) for local dev.