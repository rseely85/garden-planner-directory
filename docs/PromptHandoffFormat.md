

# 🧠 Prompt Handoff Format (Codex Integration)

This template defines how ChatGPT and Codex coordinate on technical iterations within the Garden Planner Directory project.  
Every handoff must follow this exact structure to ensure clarity, continuity, and reproducibility.

---

## 🔹 SECTION 1: CONTEXT (for Codex)

```
<Project>
Garden Planner Directory
```

```
<Scope>
Define the specific functional area or bug being addressed (e.g., Missing ZIP filter synchronization, Firestore write integrity, Admin dashboard).
```

```
<Current Status>
Summarize the last verified working state and the observed issue or limitation.
Include a short note on what has already been attempted (by ChatGPT or Codex) to prevent duplicate work.
```

```
<Objective>
State the expected outcome of this Codex iteration in one or two sentences.
```

---

## 🔹 SECTION 2: CODE INSTRUCTIONS (for Codex)

```
<File Targets>
List the files Codex should modify, using the format:
- pages/admin/index.tsx
- components/SupplierEditor.tsx
- lib/adminApi.ts
```

```
<Modification Goals>
Detail exactly what Codex should add, remove, or adjust.
Example:
- Ensure SupplierEditor filters immediately reflect fetched missing ZIP IDs.
- Add console.log for 🧩 Missing ZIP supplier IDs and 🪄 Active filter IDs.
- Confirm updates persist to Firestore correctly and no duplicates are created.
```

```
<Testing & Validation>
Outline how Codex should verify success.
Example:
- Run `npm run dev` and confirm dashboard logs display both 🧩 and 🪄 messages.
- Confirm Missing ZIP count decrements when editing a supplier ZIP.
- Lint must pass with `npm run lint` (ESLint 9 flat config).
```

---

## 🔹 SECTION 3: RETURN FORMAT (Codex → ChatGPT)

Codex must always respond in the following structure:

```
✅ Summary:
Short explanation of what was changed and why.

📁 Files Changed:
List files with line ranges and a short note on what each section does.

🧩 Testing Notes:
Instructions on how to verify the change in the browser and terminal.

⚙️ Next Steps:
Suggested follow-up or verification steps.
```

Example:

```
✅ Summary:
Connected dashboard card clicks directly to SupplierEditor filter state via useEffect propagation.

📁 Files Changed:
- index.tsx: Added selectedCard state and onCardClick wiring.
- SupplierEditor.tsx: Simplified filtering logic.
- adminApi.ts: Added reusable fetchMissingZips helper.

🧩 Testing Notes:
Run `npm run dev`, click “Missing ZIPs”, observe 🧩 and 🪄 logs, confirm filtered list appears.

⚙️ Next Steps:
After confirming display, test ZIP edits to ensure Firestore writes back correctly.
```

---

## 🔹 SECTION 4: CHATGPT FOLLOW-UP (for internal use)

ChatGPT will:
- Review console and terminal logs from Robert after each Codex iteration.
- Diagnose whether propagation, filtering, or Firestore persistence failed.
- Prepare the next Codex prompt using this same template.

---

### ✅ Version: 2025-10-24  
This template is active for all future handoffs until superseded.