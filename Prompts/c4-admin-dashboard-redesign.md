# 🧩 C4 — Admin Dashboard Redesign Prompt

## 🧭 Context
We are upgrading the **Admin Dashboard** for the Garden Planner Directory project as part of Sprint **C4**. The database has been fully normalized (see `DataModel_RefactorPlan.md`), and all admin tools are now backed by structured Firestore collections. This sprint focuses on redesigning the **Admin Dashboard layout** to improve usability, accessibility, and database maintenance capabilities while keeping the existing Supplier Editor functionality intact.

---

## 🎯 Objective
Redesign the Admin Dashboard to:
- Integrate a **Supplier Editor filter bar** (mirroring Validation Report filtering)
- Add a new **Database Maintenance Panel** (two-pane layout for managing all collections)
- Maintain the existing Supplier Editor logic, while adjusting sizing and placement for better fit
- Implement **responsive layout** optimized for both desktop and tablet/iPad views

---

## 🧱 Layout Overview

### 🧩 Zones
1️⃣ **Top Stats Bar** – Current summary widgets (Total, Verified, Premium, Missing ZIPs, etc.) remain as-is but compacted horizontally.

2️⃣ **Main Workspace Split**
   - **Left Panel:** Database Maintenance Panel (Collections + Records)
   - **Right Panel:** Supplier Editor (with new filter bar)

Overall layout uses a responsive grid:
```
[ StatsSummary widgets — full width ]
[ Maintenance Panel | Supplier Editor ]  ← two columns on desktop, stacked on iPad
```

---

## ⚙️ Supplier Editor Filter Bar
**Goal:** Add a filter row across the top of the Supplier Editor that mirrors the Validation Report behavior.

**Filters (in order across top):**
1. Category (dropdown — from `/categories`)
2. Offering (dropdown — filtered by category)
3. Product (dropdown — filtered by offering)
4. Verified (dropdown — All / Verified / Unverified)
5. Premium (dropdown — All / Premium / Non-Premium)
6. Region (dropdown — from `/regions`)
7. City (text input)
8. ZIP (text input)

**Buttons:**  
- ✅ Apply Filters — re-fetch or filter supplier list
- 🔄 Clear — resets filters

**Behavior:**
- Functionally identical to `/admin/validation-report` filters
- Cascading logic between Category → Offering → Product
- Filters apply client-side when data is preloaded, or via API params (e.g. `/api/admin/suppliers?...`)
- Responsive layout: collapse to 2 rows on narrow viewports (tablet/iPad)

---

## 🗂️ Database Maintenance Panel

### Left Pane – Collection List
- Displays **scrollable list of collections** (up to 8 visible rows, vertical scroll):
  - Categories
  - Offerings
  - Products
  - Regions
  - SupplierCategories
  - SupplierOfferings
  - SupplierProducts
  - OpenHours
  - Photos
- Each collection is a clickable item; active one is highlighted.
- On click → load all documents from that collection into the right pane.

### Right Pane – Collection Records
- Displays all records for selected collection.
- Includes a **search bar** on top (filters dynamically by main text field — typically `name`, `label`, or `id`).
- Table-style or list-style presentation showing key columns.
- Each record has ✏️ **Edit** and ➕ **Add** buttons.
  - **Edit:** opens modal pre-filled with all fields.
  - **Add:** opens blank modal for new record.

### Dynamic Add/Edit Modal
- Single reusable modal component.
- Renders form fields dynamically based on the selected collection’s document keys.
- Supports all Firestore types: string, number, boolean, array, nested object.
- Buttons: ✅ Save / ❌ Cancel.
- On Save → write back to Firestore and refresh list.
- Auto-focus first field on open.

---

## 🧩 Functional Requirements
- Maintain all existing SupplierEditor functionality.
- SupplierEditor layout may resize or reposition but not lose features.
- Use React state for local filtering; Firestore updates handled via Admin API routes.
- Search and filtering are debounced (e.g. 300ms delay) to prevent excessive fetches.
- Support keyboard navigation (arrow keys, Enter, Esc for modal control).

---

## 📱 Responsive Design Rules
| Screen Type | Layout Behavior |
|--------------|------------------|
| Desktop (≥1200px) | Two-column: Maintenance panel (left, 35%) + Supplier Editor (right, 65%) |
| Tablet/iPad (768–1199px) | Stacked layout: Supplier Editor below Maintenance panel |
| Mobile (<768px) | Optional stacking: hide stats bar and show simplified Maintenance view |

Elements auto-resize using CSS grid/flexbox with max-width constraints to maintain readability.

---

## 🧪 Testing Checklist
✅ All filters function correctly and update SupplierEditor results.  
✅ Maintenance panel lists collections and displays data dynamically.  
✅ Add/Edit modals populate fields dynamically per collection and persist correctly to Firestore.  
✅ Responsive layout renders cleanly at desktop and tablet sizes.  
✅ SupplierEditor retains editing features (ZIP, category, offerings, products, pagination).  
✅ Validation Report, Region Overview, and Stats Overview remain fully functional.

---

## ⚠️ Implementation Constraints
- Do **not** rewrite existing SupplierEditor logic — only resize and reposition.
- Use existing Admin API routes where available.
- Keep UI consistent with existing dashboard styling (same typography, colors, and padding scale).
- Avoid adding dependencies unless necessary for modal or dynamic form rendering.

---

## 🚀 Deliverables
1️⃣ Updated `pages/admin/index.tsx` layout with new responsive grid structure.  
2️⃣ New `components/AdminMaintenancePanel.tsx` handling both panes + dynamic modal.  
3️⃣ Updated `components/SupplierEditor.tsx` with filter bar and responsive styling tweaks.  
4️⃣ Validation checklist confirming full data integrity and UI behavior.

---

## 🔚 Notes for Codex
- Reference current admin dashboard styling for consistency.  
- Do not remove existing components — reorganize and expand layout.  
- Keep code modular and typed (TypeScript/React).  
- Prefer functional components and hooks for new UI logic.  
- Keep console logs for key actions: collection load, modal save, and filter apply.