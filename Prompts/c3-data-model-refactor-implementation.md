

## 🧩 **Prompt: C3 Data Model Refactor Implementation**

### 🧭 CONTEXT
We are refactoring the Garden Planner Directory backend to use the normalized Firestore data model defined in  
`docs/DataModel_RefactorPlan.md`.

The model includes:
- Core: `/suppliers`
- Master reference data: `/categories`, `/offerings`, `/products`, `/regions`
- Association collections: `/supplierCategories`, `/supplierOfferings`, `/supplierProducts`
- Flat collections for `/openHours` and `/photos`
- ZIP → Region validation handled client-side
- All relations use kebab-case string IDs, no subcollections

---

### 🧱 OBJECTIVES FOR CODEX

#### 1️⃣ Migration & Seeding
- Write migration scripts to backfill existing data into the new structure.  
  - Generate seed scripts for `categories`, `offerings`, `products`, and `regions`.  
  - Migrate current supplier docs to include `address.regionId`, `slug`, timestamps.

#### 2️⃣ API Layer
- Create new `/api/admin/` routes to read/write associations:
  - `/api/admin/supplierCategories`
  - `/api/admin/supplierOfferings`
  - `/api/admin/supplierProducts`
- Each route should:
  - Validate referenced IDs exist in master lists.
  - Return consistent JSON `{ success, message, data }`.

#### 3️⃣ Admin UI Integration
- Update SupplierEditor to:
  - Load master lists (categories, offerings, products) for pop-up selectors.
  - Save selections by writing to the corresponding association collection.
  - Refresh supplier context after successful save.

#### 4️⃣ Validation & Reports
- Extend the validation report:
  - Check for missing associations.
  - Verify region assignments (ZIP mismatch).
  - List suppliers missing address, categories, or offerings.

#### 5️⃣ Future Enhancements (Stretch)
- Add bulk association management (multi-select).
- Add CSV import/export of suppliers with associations.
- Optional: Implement caching for master lists to reduce Firestore reads.

---

### ✅ RETURN FORMAT
Codex should return:
1. **List of files created or modified**
2. **Summary of changes**
3. **Testing notes**
4. **Any missing dependencies or configuration updates required**