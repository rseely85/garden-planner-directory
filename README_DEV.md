# Garden Planner Directory — Developer Guide

This guide explains how to set up and work with the Next.js skeleton app included in this package.

---

## 🚀 Getting Started (Local Development)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the dev server**
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.  
   You should see the placeholder homepage with TODO comments.

---

## 📂 Project Structure

```
/ (root)
├── pages/
│   ├── index.tsx                   # Home page (stub)
│   ├── directory/[city]/[category].tsx   # Directory listings (stub)
│   ├── supplier/[slug].tsx         # Supplier profile (stub)
│   └── api/payments/checkout.ts    # Stripe checkout API stub
│
├── components/
│   ├── SupplierCard.tsx            # Supplier card (stub)
│   ├── DirectoryFilters.tsx        # Filter controls (stub)
│   ├── PlannerSidebarMatches.tsx   # Planner integration sidebar (stub)
│   ├── ReviewList.tsx              # Supplier reviews (stub)
│   └── ReviewForm.tsx              # Add review form (stub)
│
├── lib/
│   └── firestore.ts                # Firestore queries (working)
│
├── firebaseConfig.ts               # Firebase config (working)
├── .env.local                      # Env vars (placeholder values)
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript config
├── postcss.config.js               # PostCSS setup
├── tailwind.config.js              # Tailwind setup
├── styles/globals.css              # Tailwind + global styles
```

---

## 🛠 Copilot Workflow

Each file includes `TODO` comments where GitHub Copilot should autocomplete the code.

- **pages/index.tsx**
  - Add hero section and “How it works” content
  - Render `<SupplierCard>` for featured suppliers
  - Add `<PlannerSidebarMatches>` sidebar integration

- **pages/directory/[city]/[category].tsx**
  - Use `getSuppliersByFilters(city, category)` from `lib/firestore`
  - Render supplier list with `<SupplierCard>`
  - Add `<DirectoryFilters>` for city/category selection

- **pages/supplier/[slug].tsx**
  - Use `getSupplierBySlug(slug)` from `lib/firestore`
  - Render supplier details, map, services, and products
  - Add `<ReviewList>` + `<ReviewForm>`

- **pages/api/payments/checkout.ts**
  - Implement Stripe checkout session for premium supplier listings

- **components/** (all)
  - Flesh out stubs with props, UI, and styling
  - Use Tailwind classes for layout and design

---

## 🔑 Environment Variables

Fill in `.env.local` with real Firebase + Stripe values.

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

## 🎯 Next Steps

1. Seed Firestore using `scripts/seedFirestore.js`.
2. Flesh out components and pages with Copilot.
3. Connect PlannerSidebarMatches to your Garden Planner logic.
4. Add Stripe subscription logic for premium suppliers.
5. Deploy to Vercel or Netlify.

---

Happy coding! 🌱
