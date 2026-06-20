# DNA Trait Drawer — Design Spec
Date: 2026-06-20

## Overview

Replace the pill-based trait sections in the Client DNA panel with fixed-height scrollable lists. Clicking any item opens a right-side drawer showing an on-demand AI-generated rationale and the supporting CRM note citations.

Affects four sections: Client Values, Business Context, Risk Sensitivities, Personal Priorities.

---

## Frontend

### Scrollable list boxes (DNAPanel.tsx)

Each of the four trait categories is replaced with an identical pattern:

- Section label (e.g. `CLIENT VALUES`) in existing uppercase tracking-wide style
- A fixed-height (`h-40`) `overflow-y-auto` container styled as `bg-slate-800 border border-slate-700 rounded-lg`
- Each trait is a full-width `<button>` row: `py-2 px-3 text-sm text-left hover:bg-slate-700 transition-colors`
- A small `ChevronRight` icon on the right of each row
- Divider (`border-b border-slate-700/50`) between rows, omitted on the last item
- No confidence badges, no pills, no percentages

### TraitDrawer component (new file: `client/src/components/dna/TraitDrawer.tsx`)

A slide-in panel fixed to the right edge of the viewport, overlaying content without blocking it. Controlled by `open: boolean`, `trait: string | null`, `category: string`, and `evidence: EvidenceItem[]` props plus an `onClose` callback.

**Structure:**
- Fixed position, right-0, top-0, h-full, w-96, z-50
- `bg-slate-900 border-l border-slate-700 shadow-2xl`
- Slide animation: `translate-x-full` → `translate-x-0` on open
- Header: trait name (capitalised) + `×` close button
- Section: `WHY THIS MATTERS TO CLIENT`
  - Shows a spinner while the API call is in-flight
  - Renders the returned summary paragraph once loaded
  - Shows an inline error state if the call fails (with retry)
- Section: `CRM SOURCES`
  - One card per evidence item: `bg-slate-800 border border-slate-700 rounded-lg p-3`
  - Date in `text-xs text-slate-500`, excerpt in `text-sm text-slate-300 italic`
  - If no evidence exists for this trait, shows "No CRM sources found"

**State:** `DNAPanel` holds `drawerTrait: string | null` and `drawerCategory: string | null`. Opening a new trait closes the previous one automatically (setting new values replaces old). `TraitDrawer` manages its own `summary: string | null` and `loading: boolean`, fetching on mount whenever `trait` changes.

### useFetch vs direct fetch

`TraitDrawer` uses a plain `fetch` + `useEffect` (not the shared `useFetch` hook) because the request is POST with a body and fires on demand, not on mount of the parent.

---

## Backend

### New endpoint: `POST /api/clients/:id/trait-summary`

Location: `server/src/index.ts` alongside the other client routes.

**Request body:**
```json
{
  "trait": "family legacy",
  "category": "values",
  "evidence": [
    { "crmDate": "2024-03-15", "crmExcerpt": "Discussed setting up trust for grandchildren" }
  ]
}
```

**Logic:**
1. Validate `trait` and `evidence` are present; 400 if missing
2. Build a prompt: provide the trait name, category, and the evidence excerpts; ask the LLM for a 2–3 sentence explanation of why this characterises the client's investment identity
3. Call the existing LLM (Phoeniqs) using the same `axios` + env-var pattern as `crm.agent.ts`
4. Return `{ success: true, data: { summary: "..." } }`

**No caching** at this stage — each click is a fresh LLM call.

**Error handling:** If the LLM call fails, return `{ success: false, error: "..." }` with status 500. The drawer surfaces this as an inline error.

---

## What is not changed

- Life Events timeline section
- DNA Evolution Timeline at the bottom
- Evidence `<details>` accordion at the bottom
- Communication Style + overall confidence badge at the top
- All other panels (Portfolio, News, Advisory, Chat)

---

## Files changed

| File | Change |
|------|--------|
| `client/src/components/dna/DNAPanel.tsx` | Replace four pill sections with scrollable list boxes; add drawer open/close state; render `TraitDrawer` |
| `client/src/components/dna/TraitDrawer.tsx` | New component — drawer UI, on-demand fetch, summary + evidence display |
| `server/src/index.ts` | Add `POST /api/clients/:id/trait-summary` route |
