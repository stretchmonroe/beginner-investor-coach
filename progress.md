# Beginner Investor Coach — Build Progress

## Overview

A budget-aware investing readiness coach built with Next.js 16.2.4, TypeScript, Tailwind v4, and Supabase. The app helps beginners understand their investing capacity, set realistic goals, and learn about investment types — without providing financial advice.

**Stack:** Next.js App Router · TypeScript · Tailwind v4 · Supabase (anonymous sessions) · Anthropic API (Claude Haiku)

---

## Commits

### Phase 1 — Core App Foundation

**`e279ade` Initial build: landing, quiz, results, and ETF explorer**
- Landing page with quiz entry point
- 5-question onboarding quiz (risk tolerance, timeline, experience, goal, monthly capacity)
- ETF explorer with beginner-friendly ETF examples filtered by investor profile
- Anonymous session ID via localStorage UUID

**`603c884` ETF detail view, personalized fit labels, and Supabase persistence**
- ETF detail cards with fee, risk, description, and fit labels
- Watchlist persistence in Supabase (`anonymous_watchlist` table)
- Quiz results saved to Supabase (`quiz_results` table)

**`10a3920` Watchlist, Compare ETFs, and Portfolio Simulator**
- Watchlist screen showing saved ETF examples
- Side-by-side ETF comparison tool
- Portfolio Simulator v1 (allocation by percentage, what-if projection)

**`d1836dc` Static Beginner Coach explanation layer**
- Inline educational content explaining ETF concepts in plain English

**`fb68ea5` Ask the Beginner Coach — AI-powered Q&A**
- `/api/coach` route using Claude Haiku
- Free-text question input with AI-generated answers
- Guardrails against investment advice

**`fe8bb08` Anonymous AI coach conversation history**
- Coach questions and answers saved to Supabase per session
- History panel showing previous conversations

**`dfdf40c` Market Snapshot in ETF detail view**
- `/api/market-snapshot` route fetching live price data from Yahoo Finance
- Price, change, 52-week range displayed on ETF detail cards

---

### Phase 2 — Readiness Journey

**`a115380` Contribution Guidance screen with simulator prefill**
- First version of the Money Snapshot tool
- Monthly surplus calculation, contribution range estimate
- "Use in Simulator" CTA to prefill Portfolio Simulator

**`5ca8441` Enhance Contribution Guidance with money buckets and starting investment check**
- Added savings buckets (emergency fund, short-term savings to protect)
- Monthly buffers (emergency savings contribution, lifestyle buffer)
- Starting investment check against available cash above protected savings
- Caution notes for high bills/debt ratios

**`2d077fe` Saved learning plans — save, view, delete**
- Save button in Portfolio Simulator writing to `anonymous_learning_plans` table
- Saved plans panel with inline view and delete (legacy table, kept for backward compatibility)

---

### Phase 3 — Investor Readiness Dashboard

**`25119f4` Add investor readiness dashboard**
- Central dashboard replacing the old ETF explorer as the post-quiz landing screen
- Profile summary card (Conservative / Balanced / Growth Beginner)
- Next best step card (step-by-step readiness journey prompt)
- Readiness checklist (8 steps with completion tracking)
- Tools section (Plan / Learn / Coach)

**`a911b33` Refactor Contribution Guidance into Money Snapshot**
- Renamed and repositioned as Step 2 of the readiness journey
- Design system components: `PageLayout`, `PageHeader`, `Card`, `Button`, `SectionHeader`, `Disclaimer`
- Integrated into dashboard navigation

**`05918f1` Refactor Goal Planner into Goal Feasibility**
- Target amount + timeline → required monthly contribution calculation
- Feasibility status: covered / on-track / close / difficult
- Gap analysis with plain-English explanation
- Prefill from Money Snapshot CTA

**`2dc9304` Refactor Portfolio Simulator into Sample Learning Allocation**
- Role-based ETF allocation (growth, stability, cash-like)
- What-if Projection with future value, total contributed, estimated annual income
- Withdrawal rate and annual return assumption inputs
- Removed old SavedLearningPlans panel from Simulator

---

### Phase 4 — Saved Readiness Plans

**`78d3bd7` Anonymous readiness plan storage**
- New `anonymous_readiness_plans` Supabase table (richer schema than old learning plans)
- `lib/readinessPlans.ts`: `saveReadinessPlan`, `getReadinessPlans`, `deleteReadinessPlan`
- `components/SavedReadinessPlans.tsx`: card list with inline expand, delete with optimistic rollback
- "Save Readiness Plan" button in PortfolioSimulator saves full journey snapshot
- "Saved Readiness Plans" section added to Investor Dashboard
- Dashboard checklist and next-step logic updated to reflect saved plan state

---

### Phase 5 — Shared State, Readiness Coach, Coach Context

**`b18e205` Contextual readiness coach, shared plan state, and shared_inputs_json**

*Shared readiness state:*
- `types/sharedPlanInputs.ts`: `SharedPlanInputs` interface
- `sharedPlanInputs` state in `app/page.tsx` with `updateSharedPlan` merge function
- All three tool screens (Money Snapshot, Goal Feasibility, Sample Learning Allocation) read from and write to shared state on every field change
- Fields pre-populate across screens so users don't re-enter the same values
- "Pre-filled from your previous step" helper text on pre-filled fields

*Contextual Readiness Coach:*
- `/api/coach` system prompt updated: contextual readiness coach framing with 5-section response format (Simple explanation / Numbers / Pay attention to / Takeaway / Reminder)
- `AskCoach.tsx` rewritten: two prompt groups (Readiness / Concepts), blue color scheme, `prefillQuestion` auto-submit
- Contextual "Ask Coach" buttons in Money Snapshot, Goal Feasibility, Sample Learning Allocation, What-if Projection — each embeds the user's actual numbers into the prompt
- Guardrails against buy/sell/stock-pick questions

*Shared inputs in saved plans:*
- `shared_inputs_json` column added to `anonymous_readiness_plans`
- `ReadinessPlanRow` type updated
- Save function passes current `sharedPlanInputs` snapshot

**`a642db4` Refactor AI coach for readiness context**
- `SavedReadinessPlans`: added `onAskCoach` prop and "✦ Explain this readiness plan" button
- Clicking the button builds a rich prompt from saved plan data and navigates to the Coach screen with auto-submit
- `InvestorDashboard.onAskCoach` widened to `(question?: string) => void` to support forwarding contextual questions
- `onRestorePlan`: "Use these values in planning tools" button in saved plan expand view restores all fields to shared state

---

### Phase 6 — AI Autofill

**`eccf101` Add AI autofill for Money Snapshot and Goal Feasibility**
- `types/autofill.ts`: `AutofillExtractedFields`, `AutofillResult`, `AutofillResearchNeeded`
- `/api/readiness-autofill`: Claude Haiku extracts up to 16 structured fields from a plain-English description, returns JSON with status, confidence, assumptions, clarifying questions, and research-needed flag
- `components/AutofillPanel.tsx`: self-contained panel with idle → loading → preview → apply state machine, 3 clickable example chips, 20s timeout with friendly error
- Integrated into Money Snapshot and Goal Feasibility above the form sections
- Extracted Money Snapshot fields applied to component state; Goal Feasibility fields passed to shared state for GoalPlanner to pick up automatically
- Preview card groups fields into "Budget & savings" and "Goal & timeline" before applying
- `status: "needs_research"` fires only for tax rules, TFSA/RRSP limits, or market data — shows a notice instead of guessing
- `annualReturnAssumption` never inferred unless the user explicitly states a percentage

---

### Phase 7 — Portfolio Coach Navigation Refocus

**`9061c94` Refocus navigation around portfolio coach**
- Dashboard rewritten: replaced readiness checklist, next-step card, and Plan/Learn/Coach tool groups with a 2×2 primary navigation grid
- Four primary cards: Portfolio X-Ray, AI Portfolio Coach, Contribution Scenarios, Saved Reports
- "More tools" collapsible list containing all secondary tools (Money Snapshot, Goal Feasibility, Sample Learning Allocation, Asset Class Explorer, ETF Explorer, Compare ETFs, Watchlist, Coach History, Change Profile, Retake Quiz)
- "Saved Reports" card toggles inline `SavedReadinessPlans` panel
- `components/PortfolioXRay.tsx`: new placeholder screen ("coming soon") with back navigation
- Renamed "Ask the Readiness Coach" → "AI Portfolio Coach" in `AskCoach.tsx`
- Renamed "No saved readiness plans" → "No saved reports" in `SavedReadinessPlans.tsx`
- Removed unused `hasVisited*` / `hasAskedCoach` state from `app/page.tsx` (only fed the now-removed checklist)

---

### Phase 8 — Portfolio X-Ray v1

**`c372a5b` Add portfolio x-ray manual holdings**
- `types/portfolio.ts`: `AssetType`, `AccountType`, `Currency`, `Holding`, `PortfolioSnapshot`, `PortfolioInsight`, `EvidenceSource`
- `components/PortfolioXRay.tsx`: full manual holdings entry, X-Ray analysis, and insights — replaces placeholder
- Manual holdings form: ticker, name, asset type, account type, quantity (optional), market price (optional), market value, currency (CAD/USD)
- Auto-calculation: quantity × market price → market value (read-only when both filled)
- Holdings list: each holding shows ticker, name, badges (asset type / account / currency), market value, portfolio weight %, edit and delete buttons
- Summary cards: total portfolio value, holdings count, largest holding + weight, top-3 combined weight
- Asset type mix: breakdown list with inline proportion bars (no charts)
- Concentration insights (local, no AI): high single-holding concentration (>25%), top-3 concentration (>60%), limited holdings (1–3), no cash-like holdings
- Each insight includes an evidence panel with labelled key/value pairs (holding name, weight, source)
- "What this means" educational card and disclaimer
- All holdings stored in local React state only — no Supabase, no AI calls

---

## Supabase Tables

| Table | Purpose |
|-------|---------|
| `quiz_results` | Stores completed quiz answers and derived profile |
| `anonymous_watchlist` | ETF examples saved per session |
| `coach_conversations` | AI coach Q&A history per session |
| `anonymous_learning_plans` | Legacy saved plans (kept, not modified) |
| `anonymous_readiness_plans` | Full readiness journey snapshots (current) |

> Note: `anonymous_readiness_plans` requires RLS disabled or anon insert/select/delete policies.

---

## Design System (`components/ui/`)

`PageLayout` · `PageHeader` · `Card` · `Button` · `SectionHeader` · `Disclaimer` · `ToolCard` · `EmptyState` · `Badge`

---

## Key Constraints (throughout)

- No authentication
- No bank linking
- No buy/sell buttons or trading functionality
- No guaranteed projections
- All AI responses include educational disclaimers
- All financial figures are user-entered estimates, not pulled from accounts
