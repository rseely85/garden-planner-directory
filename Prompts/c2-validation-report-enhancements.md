Perfect — here’s your C2 Codex Handoff Prompt for the next development block.
Save this as prompts/c2-validation-report-enhancements.md and send it to Codex.
It follows your team’s high-level functional format and assumes Codex already understands the repo’s structure from C1.

⸻

🧠 CONTEXT

We’ve completed C1: Validation Report UI for the Garden Planner Directory admin interface.
The report now correctly displays supplier validation data, computes missing fields, and exports CSV.
The Firestore dataset has been backfilled with email fields, so valid/invalid status is now accurate.

All core admin functions (Dashboard, Missing ZIPs, Validation Report) are stable and integrated.

Now we’re moving to C2 – Validation Report Enhancements, focusing on usability, data filtering, and export refinements.

⸻

🎯 OBJECTIVES

The goal is to evolve the Validation Report from a static summary into a dynamic, filterable audit dashboard.

High-Level Outcomes
	1.	Add filters and sorting to the table (by validity, category, region, or supplier name).
	2.	Add client-side pagination controls that persist filter state between pages.
	3.	Extend CSV export to include current filter results.
	4.	Improve user feedback: loading state, “no results” message, and refresh animation.
	5.	Maintain zero impact on other Admin pages.

⸻

🧩 CODE INSTRUCTIONS

1️⃣ Backend — /api/admin/validation
	•	Extend the API to support query params:
	•	?valid=true|false
	•	?category=garden-center
	•	?region=Western NY
	•	Apply filters server-side for efficiency.
Example:

if (req.query.valid === "false") suppliers = suppliers.filter(s => s.missingFields.length > 0);
if (req.query.valid === "true") suppliers = suppliers.filter(s => s.missingFields.length === 0);
if (req.query.category) suppliers = suppliers.filter(s => s.category === req.query.category);


	•	Add optional sort parameter (sort=name|region|lastUpdated).
	•	Keep existing CSV route functional — add support for ?format=csv + filters combined.

⸻

2️⃣ Frontend — /admin/validation-report.tsx

Functional Enhancements:
	•	Add a Filter Bar above the table:
	•	Dropdown: “Show All / Only Invalid / Only Valid”
	•	Dropdown: Category (auto-populated from distinct supplier categories)
	•	Dropdown: Region (if region field exists)
	•	Text search: by supplier name or slug
	•	“Apply Filters” + “Clear” buttons
	•	Table Improvements:
	•	Add sortable headers (clickable column labels).
	•	Persist filter and sort state in component state (or URL query).
	•	Add a small spinner or “Refreshing…” badge when data reloads.
	•	“No results found” message when filter yields none.
	•	CSV Export:
	•	Update the “Download CSV” button to append current query params, so the export matches visible data.

const qs = new URLSearchParams(currentFilters).toString();
const csvUrl = `/api/admin/validation?format=csv&${qs}`;


	•	Logging:
	•	On every fetch:
console.log("📊 Validation report refreshed", { filters, count });
	•	On 0 results:
console.warn("⚠️ No matching suppliers for current filters.");

⸻

3️⃣ Integration / UX Consistency
	•	Keep the same color scheme and spacing as the current Validation Report UI.
	•	Confirm navigation back to /admin still works.
	•	Ensure fetch calls stay manual (fetch + useEffect) and consistent with existing Admin tools.

⸻

4️⃣ Deliverables
	•	Updated /api/admin/validation.ts
	•	Updated /pages/admin/validation-report.tsx
	•	Optional small helper: lib/utils/queryFilters.ts (to normalize filter parsing)
	•	Reuse existing ValidationEntry type from lib/types.ts
	•	Preserve backward compatibility: /api/admin/validation with no params still returns full dataset.

⸻

🧪 TESTING NOTES
	1.	Run npm run dev → visit /admin/validation-report.
	2.	Verify:
	•	Dropdown filters work independently and together.
	•	Sorting toggles ascending/descending.
	•	CSV export matches filtered results.
	•	Refresh button resets filters and reloads all suppliers.
	3.	Console logs show correct counts and warning for 0 results.
	4.	Regression test:
	•	/admin dashboard loads fine.
	•	“Missing ZIPs” flow unaffected.

⸻

✅ RETURN FORMAT

Summary:
Describe new features added and which components were updated.

Files Changed:
List updated files and key functions modified.

Testing Notes:
Outline successful filter/sort/export results and regression verification.

Next Steps:
Suggest small UX or performance enhancements (e.g., persistent filters via URL, bulk actions).

⸻

Once Codex completes this block, paste its summary here and I’ll generate your Day 12 summary and prepare C3 (Data Repair Automation).