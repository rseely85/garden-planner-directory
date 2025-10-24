# Codex Knowledge Base

## 1. Project Overview

The Garden Planner Directory is a web application designed to help users manage and organize garden suppliers efficiently. It provides an intuitive dashboard interface to view, add, edit, and remove supplier information. The architecture leverages React for the frontend, Firestore as the backend database, and modular components to separate concerns and maintain scalability.

## 2. File Map & Responsibilities

| File Name            | Purpose                                      | Key Functions                     | Dependencies                  |
|----------------------|----------------------------------------------|----------------------------------|-------------------------------|
| `Dashboard.jsx`       | Main user interface for viewing and managing suppliers | `renderSupplierList()`, `handleRefresh()` | `SupplierEditor.jsx`, Firestore API |
| `SupplierEditor.jsx`  | Component for adding and editing supplier details | `handleSave()`, `validateInput()` | Firestore API, `Dashboard.jsx` |
| `firestore.js`        | Firestore database interaction utilities      | `getSuppliers()`, `updateSupplier()`, `deleteSupplier()` | Firebase SDK                 |
| `App.jsx`             | Root component initializing routes and context | `initializeApp()`, `setupRoutes()` | React Router, Context API     |
| `utils.js`            | Utility functions used across components       | `formatDate()`, `generateID()`    | None                          |

## 3. Functional Associations

- **Dashboard ↔ SupplierEditor:** The Dashboard displays a list of suppliers and passes selected supplier data to the SupplierEditor for editing. Upon saving changes in SupplierEditor, updates are sent back to Dashboard to refresh the display.
- **SupplierEditor ↔ Firestore:** SupplierEditor interacts directly with Firestore to persist changes, including adding new suppliers or updating existing ones.
- **Dashboard ↔ Firestore:** Dashboard fetches the supplier list from Firestore on load and upon refresh requests, ensuring the displayed data is current.

## 4. Common Patterns

- **Component Props and State:** Components primarily communicate via props, with local state managing form inputs and UI states.
- **Firestore CRUD Operations:** All database interactions follow a consistent pattern of async calls wrapped in try-catch blocks for error handling.
- **Event Handling:** User interactions such as clicks and form submissions are handled with dedicated event handler functions prefixed with `handle`.
- **Data Formatting:** Utility functions are used to format dates and generate unique IDs, promoting code reuse.

## 5. Known Issues

- **Scroll-to-Supplier Behavior:** Occasionally, the interface does not correctly scroll to the selected supplier after an edit or addition.
- **Refresh Button Functionality:** The refresh button sometimes fails to update the supplier list due to caching or asynchronous update delays.
- **Form Validation Edge Cases:** Certain invalid inputs are not caught by validation, leading to potential data inconsistencies.

## 6. Analysis Protocol

When diagnosing issues or extending functionality, Codex should:

1. Review the relevant component's state and props flows.
2. Trace Firestore API calls to verify data retrieval and updates.
3. Examine event handler implementations for user interactions.
4. Check utility functions for data formatting correctness.
5. Validate UI rendering logic in relation to state changes.
6. Cross-reference known issues to identify potential root causes.
7. Suggest code improvements or fixes adhering to existing patterns.

## 7. Website Blueprint Reference

Higher-level requirements and design specifications for the Garden Planner Directory can be found in the `docs/WebsiteBlueprint.md` file. This document outlines user stories, UI mockups, and architectural decisions guiding the project development.
