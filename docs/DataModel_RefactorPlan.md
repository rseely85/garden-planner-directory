

# 🌱 Garden Planner Directory  
## Data Model Refactor Plan  
**Phase:** P0 → Data Integrity & Admin Ops (C3 – Foundation Alignment)  
**Author:** Robert Seely & ChatGPT  
**Date:** November 2025  

---

## 🧭 Objective
Define a normalized, supplier-centric Firestore data model that separates master reference data (categories, offerings, products, regions) from supplier association data.  
This model supports scalable data relationships, consistent validation, and intuitive admin pop-up workflows.

---

## 🧩 Core Principles
- **Suppliers are the root entity.** Every association links through a supplier ID.
- **Master lists** (categories, offerings, products, regions) are global reference data.
- **Association collections** link suppliers to master items (mimicking relational join tables).
- **Flat structure everywhere.** No subcollections except optional openHours/photos.
- **Region auto-derived from ZIP** and read-only once assigned.
- **IDs use kebab-case** for consistency (e.g., garden-center, patio-installation).

---

## 🗂️ Firestore Collection Map
```
/suppliers
/categories
/offerings
/products
/regions
/supplierCategories
/supplierOfferings
/supplierProducts
/openHours
/photos
```

---

## 🧱 Collection Definitions

### 1️⃣ Suppliers (Core Record)
Primary business record for each supplier.

```json
{
  "id": "auto",
  "slug": "rochester-garden-center",
  "name": "Rochester Garden Center",
  "email": "info@rgc.com",
  "phone": "585-555-1200",
  "verified": true,
  "premium": false,
  "address": {
    "street": "123 Garden St",
    "city": "Rochester",
    "state": "NY",
    "zip": "14620",
    "regionId": "NY-WEST"
  },
  "createdAt": "2025-03-14T12:45:00Z",
  "updatedAt": "2025-10-25T18:05:00Z"
}
```

**Notes**
- `slug` is a human-readable unique key; Firestore `id` remains the canonical key.
- Region ID is automatically assigned from ZIP in the admin tool and read-only afterward.
- Supplier has no embedded product/service data; all relationships handled via associations.

---

### 2️⃣ Reference (“Master”) Collections
Reusable global lists used by the admin UI for selections.

#### `/categories`
```json
{
  "id": "landscaping",
  "name": "Landscaping",
  "description": "Outdoor and hardscape services."
}
```

#### `/offerings`
```json
{
  "id": "patio-installation",
  "categoryId": "landscaping",
  "name": "Patio Installation",
  "description": "Design and installation of patios."
}
```

#### `/products`
```json
{
  "id": "flagstone",
  "offeringId": "patio-installation",
  "name": "Flagstone",
  "description": "Flat stone for patios and walkways."
}
```

#### `/regions`
```json
{
  "id": "NY-WEST",
  "name": "Western New York",
  "state": "NY",
  "counties": ["Erie", "Monroe", "Ontario"],
  "zipCodes": ["14620", "14201", "14424"]
}
```

---

### 3️⃣ Association Collections
Link suppliers to their related master items.

#### `/supplierCategories`
```json
{
  "supplierId": "sup01",
  "categoryId": "landscaping"
}
```

#### `/supplierOfferings`
```json
{
  "supplierId": "sup01",
  "categoryId": "landscaping",
  "offeringId": "tree-trimming",
  "description": "Full-service tree trimming and cleanup."
}
```

#### `/supplierProducts`
```json
{
  "supplierId": "sup01",
  "offeringId": "patio-installation",
  "productId": "flagstone",
  "description": "Premium flagstone for patios and walkways."
}
```

✅ These association collections act like join tables in a relational database, supporting queries in both directions (by supplier or by master record).

---

### 4️⃣ Other Flat Collections

#### `/openHours`
```json
{
  "supplierId": "sup01",
  "day": "Monday",
  "open": "09:00",
  "close": "17:00"
}
```

#### `/photos`
```json
{
  "supplierId": "sup01",
  "url": "https://storage.googleapis.com/garden/photos/front.jpg",
  "caption": "Front entrance",
  "isPrimary": true
}
```

---

## 🔗 Relationship Diagram (Simplified)
```
Category ─┬─> Offering.categoryId
          │
          └─> SupplierCategories.categoryId
Offering ─┬─> Product.offeringId
          └─> SupplierOfferings.{categoryId,offeringId}
Product ──┬─> SupplierProducts.{offeringId,productId}
Supplier ─┬─> SupplierCategories.supplierId
          ├─> SupplierOfferings.supplierId
          ├─> SupplierProducts.supplierId
          ├─> OpenHours.supplierId
          └─> Photos.supplierId
```

---

## 🧮 Admin Workflow Summary
1. **Add Supplier** → Fill supplier form → enter ZIP → Admin tool validates via `/regions` and populates regionId.  
2. **Add Categories** → Pop-up shows `/categories`; selections write to `/supplierCategories`.  
3. **Add Offerings** → Pop-up filters `/offerings` by chosen categories; selections write to `/supplierOfferings`.  
4. **Add Products** → Pop-up filters `/products` by selected offerings; selections write to `/supplierProducts`.  
5. **Add Photos / Hours** → Forms write directly to `/photos` and `/openHours` with `supplierId`.

---

## ⚙️ Implementation Notes
- All cross-collection relations use string IDs for simple serialization.
- Region validation and auto-fill handled client-side.
- Master collections drive Admin UI pop-ups.
- Association collections allow flexible queries (supplier or master perspective).
- Flat structure simplifies validation, exports, and Firestore rules.

---

## 🚀 Next Steps
| Step | Action | Owner |
|------|--------|-------|
| 1 | Seed master data: categories, offerings, products, regions | Codex |
| 2 | Implement ZIP → region validation logic in Admin client | Codex/Robert |
| 3 | Build admin pop-ups for associations | Codex |
| 4 | Write supplier creation flow to persist associations | Codex |
| 5 | Extend validation reports to include linked data | Codex |
| 6 | QA data relationships and exports | Robert |