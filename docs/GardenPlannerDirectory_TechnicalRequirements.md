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