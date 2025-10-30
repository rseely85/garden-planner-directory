# Garden Planner Directory — Project Status & Forward Plan

**Date:** 2025-10-25  
**Author:** Codex (development), with Robert Seely (QA/operations) & ChatGPT (PM)  

---

## 1. Project Overview
- **Mission:** Build a Western NY–focused directory that bridges the Garden Planner tool with real-world suppliers, letting users design beds and immediately source plants, materials, and services.
- **Tech Stack:** Next.js (React, TypeScript, Tailwind), Firebase (Auth planned, Firestore, Storage), Google Cloud tooling (`gcloud`, `firebase-tools`), Stripe (planned), Google Maps (planned). State helpers include React Query, Zustand (reserved), and bespoke admin scripts.
- **Current Footprint:**  
  - Public directory home (`pages/index.tsx`) with canonical Admin-SDK supplier fetch (via `/api/suppliers`), server-side rendering, search, category filter, and sorting.  
  - Supplier detail pages render on the server to avoid bundling Firebase Admin into the client.  
  - Dynamic admin suite (StatsSummary, ServiceOverview, RegionOverview, MaintenanceTools, SupplierEditor) with missing-ZIP filtering, pagination, and inline edits wired to `/api/admin/updateSupplier`.  
  - Validation Report (`/admin/validation-report`) offering filterable/sortable audit data and filter-aware CSV download.  
  - Firestore seeded with suppliers, products catalog, and 1,677 New York ZIPs/region metadata.  
  - Scripts for seeding (`seedFirestore.js`, `seedNYRegions.ts`) and validation (`verifyFirestoreData.js`, `verifyRegions.ts`).  
  - Modernized linting via ESLint v9 flat config and `npm run lint` enforcement.

---

## 2. Delivered Functionality (Code vs. Blueprint)
| Blueprint Pillar | Implementation Status | Notes |
| --- | --- | --- |
| **Directory Basics** (filters, cards, SSR) | ✅ Complete | Home page pulls suppliers from Firestore, filters/sorts client-side, renders premium flagging. |
| **Admin Analytics & Reporting** | ✅ Complete | Dashboard aggregates stats, service mix, regional coverage; CSV/JSON export endpoints exist. |
| **Data Seeding & Maintenance** | ✅ Complete | Region ZIP set + supplier/product catalogs seeded; maintenance scripts verified. |
| **Missing ZIP Detection & Repair** | ✅ Complete | `/api/admin/missingZips` + StatsSummary + SupplierEditor filter, pagination, scroll-to-editor focus, and inline ZIP save (via `/api/admin/updateSupplier`). |
| **Validation Reporting** | ✅ Complete | Filterable `/admin/validation-report` + `/api/admin/validation` supports filters, sorting, and CSV exports. |
| **Planner ↔ Directory Integration** | ⚪ Not Started | No mini-planner or sidebar matches on public site yet. |
| **Business Profiles / Reviews / Auth** | ⚪ Not Started | Profile route scaffolding exists, but reviews, auth, and editable profiles are future work. |
| **Monetization (Premium, Stripe, Ads)** | ⚪ Not Started | Pricing model defined, but Stripe flows and premium UI states are not yet coded. |
| **SEO Landing Pages & Content Hub** | ⚠️ Partial | Public home exists; city/category landing pages and seasonal content not implemented. |
| **Deployment & Monitoring** | ⚠️ Partial | Local env stable; no automated deploy pipeline or production monitoring configured. |

---

## 3. Gap Analysis vs. Technical Requirements
1. **Planner Integration:** No MiniPlannerEmbed or planner-driven supplier suggestions yet; requires product-selection UI plus Firestore query linking.  
2. **Auth & Supplier Ownership:** Firebase Auth hooks are not wired; suppliers cannot log in, claim listings, or submit reviews.  
3. **Premium Monetization:** Stripe checkout endpoint and premium feature gating absent.  
4. **Directory Depth:** Only a generic home page is live—city/category landing pages, map embeds, and content sections remain TODO.  
5. **User-Generated Content:** Reviews, photos, and showcase galleries are still conceptual.  
6. **Operational Automation:** Region auto-assignment and scheduled exports require polish for non-dev use (validation dashboard now production-ready).  
7. **QA & Deployment:** No staging/prod deploy workflow or automated tests yet; manual QA only.  

---

## 4. Remaining Work by Function & Priority
Each function is split into ~3-hour **Coding (C)** sessions handled by Codex and ~3-hour **Testing/QA (T)** sessions for Robert. ChatGPT will manage planning between blocks.

### Priority P0 – Data Integrity & Admin Ops
- ~~**C1:** Validation-report UI + CSV foundation~~ ✅  
- ~~**T1:** Validation QA + Missing ZIP regression~~ ✅  
- ~~**C2:** Validation report enhancements (filters, sorting, exports, navigation)~~ ✅  
- **C3 (≈3h):** Automated data repair helpers (bulk email/location fixes, scripted cleanup flows).  
- **T3 (≈3h):** QA automated repair routines and confirm dashboards reflect updated supplier data.

### Priority P1 – Public Directory Experience
- **C3 (≈3h):** Build `/directory/[city]/[category]` route with Firestore query filters, SEO meta, and SSR.  
- **T3 (≈3h):** Robert cross-checks each landing page for accurate supplier subsets and lighthouse/SEO basics.
- **C4 (≈3h):** Implement Supplier Profile page (`/supplier/[slug]`) with map placeholder, services/products badges, and CTA buttons.  
- **T4 (≈3h):** QA profile content vs. Firestore, verify broken data falls back gracefully.

### Priority P2 – Planner & Supplier Matching
- **C5 (≈3h):** Create MiniPlannerEmbed mock component (product toggles) + PlannerSidebarMatches panel triggered on home/directory pages.  
- **T5 (≈3h):** Robert runs scenario tests: select product sets → confirm suppliers returned, ensure no console errors.
- **C6 (≈3h):** Wire planner selections to Firestore query (`array-contains-any`), add premium-first sorting, and empty-state copy.  
- **T6 (≈3h):** QA across desktop/mobile, confirm premium records float to top and filters remain reactive.

### Priority P3 – Monetization & Supplier Self-Service
- **C7 (≈3h):** Scaffold Firebase Auth (email/password + Google) with protected admin routes.  
- **T7 (≈3h):** Robert smoke-tests login, ensures admin gating works, and notes UX friction.
- **C8 (≈3h):** Implement Stripe Checkout API + premium flag propagation; update SupplierCard styling for premium tiers.  
- **T8 (≈3h):** QA Stripe checkout in test mode, confirm premium listings render highlighted after webhook or manual flag.
- **C9 (≈3h):** Add supplier self-claim flow (request form + approval queue) and basic review submission endpoint.  
- **T9 (≈3h):** Robert validates claim submissions, review moderation list, and error messaging.

### Priority P4 – Content, SEO, and Deployment
- **C10 (≈3h):** Compose first five SEO landing pages with structured data + CMS-friendly content blocks.  
- **T10 (≈3h):** Run lighthouse/SEO audits, validate OpenGraph/Twitter meta, and share results.
- **C11 (≈3h):** Configure Vercel deployment with environment secrets, GA4, and error logging (Sentry or LogRocket).  
- **T11 (≈3h):** Robert exercises staging vs. production URLs, validates analytics events, and documents deployment SOP.
- **C12 (≈3h):** Introduce automated tests (Playwright smoke + unit tests for helper utilities) and GitHub Actions lint/test pipeline.  
- **T12 (≈3h):** QA reviews CI outputs, runs regression checklist, and signs off on go/no-go criteria.

---

## 5. Suggested 3-Hour Block Timeline (Example Sprint)
- **Block 1 (C1):** Validation-report UI build  
- **Block 2 (T1):** Manual validation & Missing ZIP regression  
- **Block 3 (C3):** City/category directory route  
- **Block 4 (T3):** SEO/UX testing for new routes  
- **Block 5 (C4):** Supplier profile implementation  
- **Block 6 (T4):** Profile QA + data accuracy checks  
- **Block 7 (C5):** Mini planner scaffold  
- **Block 8 (T5):** Planner→supplier QA  
- **Block 9+ :** Continue with planner matching, auth, Stripe, etc., following priority order above.

Robert can schedule these blocks sequentially or mix/match based on availability. After each coding block, sync with ChatGPT to confirm acceptance criteria before handing QA instructions back to Robert.

---

## 6. Immediate Next Actions
1. **Codex:** Kick off Block C3 — design and implement automated supplier data repair scripts/tools.  
2. **Robert:** Document high-priority data issues (e.g., missing emails/regions) and prepare validation steps for repaired records.  
3. **ChatGPT:** Coordinate the next sprint plan with updated acceptance criteria for C3 and downstream blocks.

---

## 7. Reference Materials Reviewed
- 🌱 *Garden Planner Directory Website Blueprint*  
- *GardenPlannerDirectory_TechnicalRequirements v1.0*  
- Day 1–10 progress summaries & accompanying checkpoints  
- Current codebase (`pages/index.tsx`, admin dashboard, supplier APIs, scripts)  

This document should serve as the single source of truth for what’s built, what remains, and how we’ll march forward in manageable 3-hour increments with clear roles (Codex coding, Robert QA, ChatGPT PM). Feel free to annotate or extend as priorities shift. 
