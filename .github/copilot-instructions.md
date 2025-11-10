<!-- GitHub Copilot / AI agent guidance for the Garden Planner Directory repo -->

Summary
-------
- Short: a Next.js + TypeScript frontend that reads/writes Firestore, uses Tailwind, and contains many `TODO` stubs intended for AI-assisted completion.
- Primary mission for an AI: flesh out page and component stubs, wire UI to `lib/firestore.ts` helpers, and preserve existing data migration and admin scripts.

Quick setup (commands)
----------------------
- Install: `npm install`
- Dev server: `npm run dev` (Next.js on http://localhost:3000)
- Build: `npm run build` and `npm start` for production
- Helpful scripts: `npm run verify` (checks Firestore data), `npm run stats` (supplier stats script), `npm run seed:reference` (seed reference data)

What to know about architecture (big picture)
---------------------------------------------
- Frontend: Next.js pages live in `pages/` and are TypeScript (`.tsx`). Key pages to complete:
  - `pages/index.tsx` — hero + featured suppliers
  - `pages/directory/[city]/[category].tsx` — directory listing; use `lib/firestore` helpers
  - `pages/supplier/[slug].tsx` — supplier profile + reviews
  - `pages/api/payments/checkout.ts` — Stripe checkout stub
- Data access layer: `lib/firestore.ts` contains the canonical Firestore query helpers. Prefer reusing or extending these helpers rather than embedding queries in components.
- Components: `components/` holds presentational and composite components (e.g., `SupplierCard.tsx`, `DirectoryFilters.tsx`, `ReviewList.tsx`). Use Tailwind classes for styling.
- Scripts & migrations: `scripts/` includes backfills, migrations, and seeders. Many scripts use `npx tsx` (run TypeScript directly) or plain `node`. Respect those entry points when adding automation.
- Hosting / infra: `firebase.json` config lives at the repo root; Firestore rules are in `scripts/firestore.rules`. Sensitive credentials live in `.env.local` (not checked in).

Project-specific conventions & patterns
------------------------------------
- TODO-first workflow: many file stubs contain `TODO` comments. When completing a file, keep TODOs small and replace them with minimal, well-typed implementations.
- Data helpers: prefer `lib/firestore.ts` functions (e.g., `getSuppliersByFilters`, `getSupplierBySlug`) as single source of truth. If you add a new helper, add a unit-style script in `scripts/` or `lib/` to exercise it.
- Scripts: use `npx tsx` for TypeScript scripts (see package.json scripts like `stats`, `backfill:locations`, `migrate:normalized`). If a script is `.js`, run with node.
- Styling: Tailwind is configured in `tailwind.config.js` and imported through `styles/globals.css`. Use utility classes over large CSS files.
- TypeScript: `tsconfig.json` uses `strict: true`. Keep types explicit for public components and firestore shapes.
- Aliases: `paths` maps `@/*` → repo root. Imports sometimes use absolute-ish paths (e.g., `@/lib/firestore`). Match existing style.

Integration points & external deps to watch
-----------------------------------------
- Firebase client + admin: `firebase` and `firebase-admin` are installed. Client-side code should use the client SDK (config in `firebaseConfig.ts`). Server scripts and Cloud Functions use `firebase-admin`.
- Stripe: server API stub present in `pages/api/payments/checkout.ts`. Keys live in env vars: `STRIPE_PUBLIC_KEY`, `STRIPE_SECRET_KEY`.
- Third-party libs: `@tanstack/react-query`, `zustand` for state, `recharts` for charts. Prefer cached react-query patterns for data fetching in UI.

Concrete examples to guide edits (how AI should change files)
-----------------------------------------------------------
- When completing `pages/directory/[city]/[category].tsx`: call a helper from `lib/firestore.ts` (e.g., `getSuppliersByFilters(city, category)`), map results to `SupplierCard` and add `DirectoryFilters` above the list.
- When completing `pages/supplier/[slug].tsx`: call `getSupplierBySlug(slug)` server-side (`getStaticProps`/`getServerSideProps` depending on choice). Render `ReviewList` and include `ReviewForm` that posts to a new `pages/api/reviews` endpoint.
- When adding new scripts that modify Firestore, follow existing patterns in `scripts/` (auth via `gcloud application-default` or `firebase-admin` credentials). Use `npm run reauth` when running admin scripts locally.

Safety & small checks
---------------------
- Avoid committing secrets. `.env.local` is intentionally not checked in. If you need to test Stripe/Firebase, use local dev/test keys.
- Run `npm run lint` before pushing; changes should follow the project's lint rules and TypeScript typing.

Where to look for more context
------------------------------
- High-level developer guide: `README_DEV.md` (contains a Copilot workflow and TODO checklist).
- Firestore helpers & model: `lib/firestore.ts` and `data/` (seed JSON such as `suppliers.json`).
- Scripts folder: `scripts/` (migration/backfill scripts and `scripts/firestore.rules`).

If something is unclear
----------------------
- Ask for the expected Firestore document shape (or point to `data/suppliers.json`) when implementing new queries.
- If you need to run admin scripts and don't have gcloud creds, ask the maintainer for dev credentials or request guidance; do not attempt to create or leak secrets.

Feedback
--------
If any of these sections are unclear or you'd like more detail about any file (examples, code templates, or test harnesses), tell me which part to expand and I will iterate.

PM → Developer prompt template (use for hand-offs)
------------------------------------------------
Use this short template when passing tasks from planning to the developer agent. Paste it into the issue or prompt so code changes follow repository conventions.

- Title: [Short feature title]
- Route / Files: e.g. `/supplier/[slug].tsx`, `lib/firestore.ts`
- Render strategy: `SSG | ISR revalidate=60 | SSR` (choose one)
- Server helpers: Use `lib/firestore.ts` (e.g., getSupplierBySlug) or `pages/api/*` for dynamic endpoints
- Client dynamic blocks: List fields to fetch client-side (e.g., `reviews`, `premiumStatus`)
- Acceptance criteria (3 checks):
  1. Core HTML contains supplier.name and SEO meta.
  2. Reviews load via `/api/reviews?supplierId=...` and reflect new reviews after posting.
  3. Admin changes call `/api/revalidate` for affected pages or are visible after ISR interval.
- Tests to run locally: `npm run build && npm run start` to validate SSG/ISR behavior; verify network calls for dynamic blocks.

Security note: set `REVALIDATE_SECRET` in `.env.local` for `/api/revalidate` calls. Admin scripts should POST with this secret in an `x-revalidate-secret` header or body field.

Merged highlights from docs/ (concise)
-----------------------------------
- Data model (Firestore collections): `suppliers` (id,name,slug,category,services[],products[],address,geo,premium,verified,reviews[],photos[]), `reviews` (supplierId,userId,rating,text,status), `cities`, `productsCatalog`, `plans`.
- Planner ↔ Directory matching: input is `selectedProducts[]`; query suppliers where `products` intersects selections (Firestore `array-contains-any`), then filter by city/services and sort: premium first → distance → rating.
- Important API endpoints to reuse (stubbed or planned): `GET /api/suppliers?city&category&products&services`, `GET /api/suppliers/:slug`, `POST /api/reviews` (auth), `POST /api/payments/checkout` (Stripe), and admin `/api/admin/*` endpoints used by maintenance scripts and dashboard.
- Acceptance criteria (MVP): home with mini-planner, directory filters + planner sidebar updating dynamically, supplier profile with contact/map/reviews, SSR landing pages with basic SEO, and admin-only editing for suppliers.
- Current project status snapshot: admin dashboards, validation-report, and seeding/migration scripts are implemented; planner embed, auth gating for suppliers, reviews, and Stripe monetization are the primary remaining work items.  Use the priority roadmap in `docs/ProjectStatus_GardenPlannerDirectory.md` to pick the next 3-hour block.
