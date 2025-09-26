#!/bin/bash
# One-click GitHub setup for Garden Planner Directory MVP
# Requires: GitHub CLI (gh), jq
# Usage: chmod +x setup_all.sh && ./setup_all.sh

set -e

# ---------------------------
# CONFIG - EDIT THESE
# ---------------------------
OWNER="rseely85"            # e.g., rseely
REPO="rseely85/garden-planner-directory"          # e.g., rseely/garden-planner-directory
PROJECT_NAME="Garden Planner Directory MVP"
PROJECT_DESC="Project board to manage the MVP build of the Garden Planner Directory website."
# ---------------------------

command -v gh >/dev/null 2>&1 || { echo >&2 "gh CLI is required. Install: https://cli.github.com/"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo >&2 "jq is required. Install: https://stedolan.github.io/jq/"; exit 1; }

echo "🔐 Authenticating gh..."
gh auth status || gh auth login

echo "📋 Creating/locating project '$PROJECT_NAME' for owner $OWNER ..."
PROJECT_JSON=$(gh project list --owner "$OWNER" --format json)
PROJECT_ID=$(echo "$PROJECT_JSON" | jq -r ".[] | select(.title==\"$PROJECT_NAME\") | .id")
PROJECT_NUMBER=$(echo "$PROJECT_JSON" | jq -r ".[] | select(.title==\"$PROJECT_NAME\") | .number")

if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" == "null" ]; then
  gh project create --owner "$OWNER" --title "$PROJECT_NAME"
  PROJECT_JSON=$(gh project list --owner "$OWNER" --format json)
  PROJECT_ID=$(echo "$PROJECT_JSON" | jq -r ".[] | select(.title==\"$PROJECT_NAME\") | .id")
  PROJECT_NUMBER=$(echo "$PROJECT_JSON" | jq -r ".[] | select(.title==\"$PROJECT_NAME\") | .number")
  gh project edit "$PROJECT_NUMBER" --owner "$OWNER" --description "$PROJECT_DESC"
  echo "✅ Created project: $PROJECT_NAME (id=$PROJECT_ID, number=$PROJECT_NUMBER)"
else
  echo "ℹ️ Found existing project: $PROJECT_NAME (id=$PROJECT_ID, number=$PROJECT_NUMBER)"
fi

echo "🏷️ Creating labels in $REPO ..."
create_label () {
  gh label create "$1" --color "$2" --repo "$REPO" 2>/dev/null || echo "Label '$1' exists, skipping."
}
create_label "setup" "0e8a16"
create_label "frontend" "1d76db"
create_label "backend" "5319e7"
create_label "integration" "fbca04"
create_label "monetization" "d93f0b"
create_label "deployment" "006b75"

echo "🎯 Creating milestones in $REPO ..."
create_ms () {
  gh milestone create --repo "$REPO" --title "$1" --description "$2" 2>/dev/null || echo "Milestone '$1' exists, skipping."
}
create_ms "Milestone 1: Setup" "Firebase setup, rules, seeding (Issues 1–3)"
create_ms "Milestone 2: Frontend Scaffold" "Next.js project + Home page (Issues 4–5)"
create_ms "Milestone 3: Directory Core" "Directory, Supplier Profile, Firestore queries (Issues 6–8)"
create_ms "Milestone 4: Monetization + Deployment" "Stripe + production deploy (Issues 9–10)"

echo "🧱 Creating custom single-select 'Status' field on project (Backlog, To Do, In Progress, Done) ..."
gh project field-create "$PROJECT_NUMBER" --owner "$OWNER" --name "Status" --data-type SINGLE_SELECT --options "Backlog,To Do,In Progress,Done" 2>/dev/null || true

echo "📝 Creating issues ..."
create_issue () {
  local TITLE="$1"
  local BODY="$2"
  local LABELS="$3"
  local MILESTONE="$4"

  ISSUE_JSON=$(gh issue create --repo "$REPO" --title "$TITLE" --body "$BODY" $LABELS --milestone "$MILESTONE" --format json)
  ISSUE_URL=$(echo "$ISSUE_JSON" | jq -r '.url')
  ISSUE_NUMBER=$(echo "$ISSUE_JSON" | jq -r '.number')
  echo "  - Created #$ISSUE_NUMBER: $TITLE"

  gh project item-add --owner "$OWNER" --project-number "$PROJECT_NUMBER" --url "$ISSUE_URL" >/dev/null
  ITEM_ID=$(gh project items --owner "$OWNER" --project-number "$PROJECT_NUMBER" --format json | jq -r ".[] | select(.content.number==$ISSUE_NUMBER) | .id")
  FIELD_ID=$(gh project fields --owner "$OWNER" --project-number "$PROJECT_NUMBER" --format json | jq -r '.[] | select(.name=="Status") | .id')
  OPTION_ID=$(gh project fields --owner "$OWNER" --project-number "$PROJECT_NUMBER" --format json | jq -r '.[] | select(.name=="Status") | .options[] | select(.name=="To Do") | .id')
  gh project item-edit --owner "$OWNER" --project-number "$PROJECT_NUMBER" --id "$ITEM_ID" --field-id "$FIELD_ID" --single-select-option-id "$OPTION_ID" >/dev/null
}

create_issue "Setup Firebase Project" "- Create Firebase project\n- Enable Firestore, Auth, Storage\n- Generate service account JSON\n\n**Acceptance Criteria:**\n- Firebase project live in production mode\n- Service account key stored\n- Auth enabled\n- Storage enabled" "--label setup" "Milestone 1: Setup"
create_issue "Apply Firestore Security Rules" "- Use provided firestore.rules\n- Deploy via Firebase CLI\n\n**Acceptance Criteria:**\n- Public read suppliers/products\n- Only admins/owners edit suppliers\n- Plans private per user" "--label setup" "Milestone 1: Setup"
create_issue "Seed Firestore Database" "- Use seedFirestore.js with productsCatalog.json + suppliersSeed.json\n\n**Acceptance Criteria:**\n- productsCatalog has 20 entries\n- suppliers has 10 starter entries" "--label setup" "Milestone 1: Setup"
create_issue "Scaffold Next.js Project" "- Create Next.js + TypeScript project\n- Install Firebase, React Query, Zustand, Stripe, Tailwind\n- Setup env variables\n\n**Acceptance Criteria:**\n- Project runs locally\n- Tailwind working\n- Firebase config present" "--label frontend" "Milestone 2: Frontend Scaffold"
create_issue "Build Home Page" "- Hero with CTAs\n- How it Works section\n- Featured categories\n- MiniPlannerEmbed component\n\n**Acceptance Criteria:**\n- Home loads with sections\n- MiniPlannerEmbed toggles selections" "--label frontend" "Milestone 2: Frontend Scaffold"
create_issue "Build Directory Category Page" "- Dynamic route /directory/[city]/[category]\n- Filters for city, plant type, services\n- Supplier cards (premium first)\n- PlannerSidebarMatches component\n\n**Acceptance Criteria:**\n- Visiting /directory/rochester-ny/garden-centers shows suppliers\n- Filters update list\n- Sidebar updates with planner products" "--label frontend --label integration" "Milestone 3: Directory Core"
create_issue "Build Supplier Profile Page" "- Route /supplier/[slug]\n- Business logo, services, products\n- Map embed\n- Reviews (list + form)\n- Planner integration: Mark as Supplier\n\n**Acceptance Criteria:**\n- Profile shows supplier data\n- Authenticated users can add reviews\n- Planner integration works" "--label frontend --label integration" "Milestone 3: Directory Core"
create_issue "Integrate Firestore Queries" "- Implement lib/firestore.ts\n- Functions: getSuppliersByFilters, getSupplierBySlug, getProductsCatalog, createReview\n\n**Acceptance Criteria:**\n- Queries return live Firestore data\n- Directory and sidebar update dynamically" "--label backend" "Milestone 3: Directory Core"
create_issue "Implement Stripe Premium Listings" "- Setup Stripe product listing_premium_monthly\n- Add /api/payments/checkout\n- Premium suppliers sort top and show logos/photos\n\n**Acceptance Criteria:**\n- Premium suppliers can subscribe\n- Premium suppliers display differently" "--label monetization" "Milestone 4: Monetization + Deployment"
create_issue "Deploy MVP" "- Deploy to Vercel or Netlify\n- Configure env variables\n- Test Firestore + Stripe in production\n\n**Acceptance Criteria:**\n- Live URL accessible\n- Planner + directory functional\n- 10 suppliers visible" "--label deployment" "Milestone 4: Monetization + Deployment"

echo "✅ All done! Project '$PROJECT_NAME' ready with labels, milestones, and issues in $REPO."
