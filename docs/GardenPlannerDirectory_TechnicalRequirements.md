Garden Planner Directory Website - Technical
Requirements v1.0
1. Goal
Build a directory website integrated with the Garden Planner tool. Users can plan gardens, then
discover local suppliers/services that match their plant/material needs.
2. Tech Stack
- Frontend: React + Vite or Next.js (SSR for SEO)
- State: React Query (server data) + Zustand/Context (planner state mirror)
- Backend (MVP): Firebase (Auth + Firestore + Storage)
- Hosting: Netlify or Vercel
- Maps: Google Maps API
- Payments: Stripe
3. Core Features
**Home Page**
- Hero with CTAs (Start Planning / Browse Directory)
- 3-step “How it Works”
- Featured categories grid
- Mini embedded Garden Planner demo
- Seasonal content hub
- Footer with newsletter/social
**Directory Page**
- H1 + filters (location, plant type, services)
- Supplier listing cards (premium first)
- Planner sidebar (dynamic supplier matches)
- SEO content block
**Business Profile**
- Logo, photos, services, products
- Map embed
- Reviews system
- “Mark as Supplier” link to planner
**Garden Planner Integration**
- Planner selections matched to suppliers’ products array
- Sidebar shows suppliers per product
- Future phase: inventory upload (CSV/API).
4. Data Model (Firestore)
Collections:
suppliers {id, name, slug, category, services[], products[], address{}, geo{}, contact{}, premium, verified,
reviews[], photos[], createdAt, updatedAt}
reviews {id, supplierId, userId, rating, text, createdAt, status}
cities {id, name, state, counties[], geoBounds}
productsCatalog {id, label, tags[], synonyms[]}
 plans {id, userId, regionId, selections[], updatedAt}
5. API Endpoints (future Node/Express option)
GET /api/suppliers?city&category;&products;&services;
GET /api/suppliers/:slug
POST /api/reviews (auth)
GET /api/cities
GET /api/products-catalog
POST /api/suppliers/claim (auth)
POST /api/payments/checkout (Stripe)
6. Frontend Routes (Next.js)
/ (Home)
/planner
/directory
/directory/[city]/[category]
/supplier/[slug]
Components: DirectoryFilters, SupplierCard, PlannerSidebarMatches, MiniPlannerEmbed, Map,
ReviewList, ReviewForm
7. Planner ↔ Directory Matching Logic
- Input: selectedProducts[] from planner
- Query: suppliers where products intersects selectedProducts
- Filter: by city/location, services[]
- Sort: premium first, then distance, then rating
8. Monetization
- Free listings vs Premium ($29/mo, featured placement, logos/photos)
- Ad slots per category page
- Affiliate links for seeds/tools
- Premium suppliers appear in planner sidebar
9. Analytics Events
- planner_selection_change
- directory_filter_change
- supplier_profile_view
- cta_click (call, website, directions)
- premium_checkout_start
- premium_checkout_success
10. Acceptance Criteria (MVP)
- Home: mini planner works, featured categories route correctly
- Directory: filters + sidebar update dynamically
- Supplier profile: contact info, reviews, map, planner integration
- SEO: server-rendered landing pages with schema markup
- Security: only admins/owners can edit suppliers; users own plans only

---

## 11. 2025-11-12 Implementation Snapshot

To keep the requirements in sync with the living codebase, here is the current feature alignment:

- **Stack Reality:** Next.js 14 + TypeScript + Tailwind on the frontend, backed by Firebase Admin for all server-side data access. ESLint v9 flat config enforces linting via `npm run lint`.  
- **Directory UX:** Home page lists suppliers, supports search, category filtering, and sorting (name asc/desc, category, premium bias). Supplier cards now surface *all* category tags instead of the legacy single `category` string.  
- **Supplier Detail Page:** `/supplier/[slug]` is SSR, uses the same normalized category/services/products arrays, and gracefully handles missing data.  
- **Admin Tooling:**  
  - Supplier Editor fetches master categories/offerings/products/regions and now allows layered filtering without locking out dependent dropdowns.  
  - Associations (categories/offerings/products) are synced through dedicated `/api/admin/supplier*` endpoints; ZIP normalization and address validation run before saving.  
  - Backfill utilities (e.g., `backfillSupplierLocations`) now return consistent result shapes so admin APIs can surface updates directly in the UI.  
- **Data Hygiene:** Incoming supplier data passes through `ensureSupplierAddress`, and TypeScript helpers coerce Firestore values into the expected shapes (strings, arrays, timestamps).  
- **Next Milestones:** capture created/updated timestamps on supplier creation, derive the `location` string automatically, persist `geo` coordinates, and augment the Supplier Maintenance modal with a geocode lookup button before extending Planner integration.

This section should be updated alongside each release so the original requirements stay actionable.
