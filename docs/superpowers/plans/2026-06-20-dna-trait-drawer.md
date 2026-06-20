# DNA Trait Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace pill-based trait sections in the Client DNA panel with fixed-height scrollable lists whose items open a right-side drawer showing an on-demand AI rationale and CRM citations.

**Architecture:** Three independent changes wired together — (1) a new POST endpoint on the server that calls the LLM to explain a single trait, (2) a new `TraitDrawer` React component that fetches on open, (3) DNAPanel refactored to render scrollable lists and mount the drawer.

**Tech Stack:** Express/TypeScript backend (axios + Phoeniqs LLM), React + TailwindCSS frontend, no new dependencies.

## Global Constraints

- LLM calls use `process.env.PHOENIQS_API_URL`, `PHOENIQS_API_KEY`, `PHOENIQS_MODEL` — same pattern as `crm.agent.ts`
- All Tailwind classes must stay within the existing dark-theme palette (`slate-*`, `six-orange`, etc.)
- No new npm packages
- No caching on the new endpoint (each click is a fresh LLM call)

---

### Task 1: Backend — `POST /api/clients/:id/trait-summary`

**Files:**
- Modify: `server/src/index.ts` (add route after the existing `/dna` route, around line 84)

**Interfaces:**
- Consumes: existing `getClient`, `asyncHandler`, `axios`, env-var helpers already in scope
- Produces: `POST /api/clients/:id/trait-summary` → `{ success: true, data: { summary: string } }` or `{ success: false, error: string }`

- [ ] **Step 1: Add the route to `server/src/index.ts`**

Insert after the DNA route (after line 84). The full block to add:

```typescript
// Trait summary — on-demand LLM explanation of a single DNA trait
app.post("/api/clients/:id/trait-summary", asyncHandler(async (req: Request, res: Response) => {
  const client = getClient(req.params.id);
  if (!client) {
    res.status(404).json({ success: false, error: "Client not found" });
    return;
  }
  const { trait, category, evidence } = req.body || {};
  if (!trait || typeof trait !== "string") {
    res.status(400).json({ success: false, error: "trait is required" });
    return;
  }

  const evidenceLines = Array.isArray(evidence) && evidence.length > 0
    ? evidence.map((e: { crmDate: string; crmExcerpt: string }) =>
        `- ${e.crmDate}: "${e.crmExcerpt}"`
      ).join("\n")
    : "No direct CRM citations available.";

  const categoryLabel: Record<string, string> = {
    values: "core investment value",
    businessContext: "business context factor",
    riskSensitivities: "risk sensitivity",
    personalPriorities: "personal priority",
  };
  const label = categoryLabel[category] || "trait";

  const systemPrompt = `You are a senior wealth management advisor writing a brief internal note. Explain in 2-3 sentences why a trait characterises a client's investment identity. Be specific to the evidence. Write in plain English, no bullet points.`;
  const userPrompt = `Client: ${client.name}\nTrait: "${trait}" (${label})\n\nSupporting CRM evidence:\n${evidenceLines}\n\nExplain why "${trait}" is a defining ${label} for this client.`;

  const llmUrl = (process.env.PHOENIQS_API_URL || "https://maas.phoeniqs.com/v1") + "/chat/completions";
  const llmKey = process.env.PHOENIQS_API_KEY || "";
  const llmModel = process.env.PHOENIQS_MODEL || "inference-gpt-oss-120b";

  const resp = await axios.post(
    llmUrl,
    {
      model: llmModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 200,
    },
    {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${llmKey}` },
      timeout: 30000,
    }
  );
  const choice = resp.data?.choices?.[0];
  const summary = choice?.message?.content || choice?.message?.reasoning_content || choice?.text || "";

  res.json({ success: true, data: { summary: summary.trim() } });
}));
```

- [ ] **Step 2: Manual smoke test**

With the server running (`npm run dev`):
```bash
curl -s -X POST http://localhost:3000/api/clients/schneider/trait-summary \
  -H "Content-Type: application/json" \
  -d '{"trait":"family legacy","category":"values","evidence":[{"crmDate":"2024-03-15","crmExcerpt":"Discussed setting up trust for grandchildren"}]}' \
  | jq .
```
Expected: `{ "success": true, "data": { "summary": "<2-3 sentence paragraph>" } }`

- [ ] **Step 3: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: POST /api/clients/:id/trait-summary endpoint"
```

---

### Task 2: TraitDrawer component

**Files:**
- Create: `client/src/components/dna/TraitDrawer.tsx`

**Interfaces:**
- Consumes: nothing from Task 1 except the HTTP endpoint at runtime
- Produces: `<TraitDrawer>` with props:
  ```typescript
  interface TraitDrawerProps {
    open: boolean;
    trait: string | null;
    category: string | null;
    evidence: { trait: string; crmDate: string; crmExcerpt: string }[];
    clientId: string;
    onClose: () => void;
  }
  ```

- [ ] **Step 1: Create `client/src/components/dna/TraitDrawer.tsx`**

```typescript
import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface EvidenceItem {
  trait: string;
  crmDate: string;
  crmExcerpt: string;
}

interface TraitDrawerProps {
  open: boolean;
  trait: string | null;
  category: string | null;
  evidence: EvidenceItem[];
  clientId: string;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  values: "Client Value",
  businessContext: "Business Context",
  riskSensitivities: "Risk Sensitivity",
  personalPriorities: "Personal Priority",
};

export function TraitDrawer({ open, trait, category, evidence, clientId, onClose }: TraitDrawerProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !trait || !clientId) return;
    setSummary(null);
    setFetchError(null);
    setLoading(true);

    const relevantEvidence = evidence.filter(
      (e) =>
        e.trait.toLowerCase().includes(trait.toLowerCase()) ||
        trait.toLowerCase().includes(e.trait.toLowerCase())
    );

    fetch(`/api/clients/${clientId}/trait-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trait, category, evidence: relevantEvidence }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setSummary(json.data.summary);
        } else {
          setFetchError(json.error || "Failed to load summary");
        }
      })
      .catch(() => setFetchError("Network error"))
      .finally(() => setLoading(false));
  }, [open, trait, clientId]);

  const traitEvidence = evidence.filter(
    (e) =>
      e.trait.toLowerCase().includes((trait || "").toLowerCase()) ||
      (trait || "").toLowerCase().includes(e.trait.toLowerCase())
  );

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-96 z-50 bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-700 shrink-0">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              {category ? CATEGORY_LABELS[category] ?? category : ""}
            </p>
            <h3 className="text-base font-semibold text-white capitalize">{trait}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors mt-0.5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Why this matters */}
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
              Why this matters to client
            </p>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span className="h-3 w-3 rounded-full border-2 border-slate-500 border-t-six-orange animate-spin" />
                Generating insight…
              </div>
            )}
            {fetchError && !loading && (
              <p className="text-sm text-red-400">{fetchError}</p>
            )}
            {summary && !loading && (
              <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
            )}
          </div>

          {/* CRM Sources */}
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
              CRM Sources
            </p>
            {traitEvidence.length === 0 ? (
              <p className="text-sm text-slate-500">No CRM sources found for this trait.</p>
            ) : (
              <div className="space-y-2">
                {traitEvidence.map((e, i) => (
                  <div
                    key={i}
                    className="bg-slate-800 border border-slate-700 rounded-lg p-3"
                  >
                    <p className="text-xs text-slate-500 mb-1">{e.crmDate}</p>
                    <p className="text-sm text-slate-300 italic">"{e.crmExcerpt}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/dna/TraitDrawer.tsx
git commit -m "feat: TraitDrawer component with on-demand LLM summary"
```

---

### Task 3: Refactor DNAPanel — scrollable lists + wire drawer

**Files:**
- Modify: `client/src/components/dna/DNAPanel.tsx`

**Interfaces:**
- Consumes: `TraitDrawer` from `./TraitDrawer`; `clientId: string` must be added to `DNAPanelProps`
- Produces: updated `DNAPanel` accepting `clientId` prop

**Note on `clientId`:** `DNAPanel` currently doesn't receive `clientId`. It needs it to pass to `TraitDrawer` for the API call. Check `App.tsx` — `selectedId` is the client ID and is already in scope where `DNAPanel` is rendered; just add it as a prop.

- [ ] **Step 1: Update `DNAPanelProps` and import `TraitDrawer`**

Replace the top of `DNAPanel.tsx`:

```typescript
import { useState, useMemo } from "react";
import type { ClientDNA } from "../../types/api";
import { Card, CardTitle } from "../shared/Card";
import { ConfidenceBadge } from "../shared/ConfidenceBadge";
import { SkeletonBlock, SkeletonPills } from "../shared/SkeletonLoader";
import { ErrorState } from "../shared/ErrorState";
import { EmptyState } from "../shared/EmptyState";
import { FadeIn } from "../shared/FadeIn";
import { Dna, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { TraitDrawer } from "./TraitDrawer";

interface DNAPanelProps {
  dna: ClientDNA | null;
  clientId: string;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  durationMs?: number | null;
  fetchedAt?: string | null;
}
```

- [ ] **Step 2: Update function signature and add drawer state**

Replace the function signature and the existing state block:

```typescript
export function DNAPanel({ dna, clientId, loading, error, onRetry, durationMs, fetchedAt }: DNAPanelProps) {
  if (loading) return <Card><CardTitle icon={Dna}>Client DNA</CardTitle><SkeletonPills /><SkeletonBlock /></Card>;
  if (error) return <Card><CardTitle icon={Dna}>Client DNA</CardTitle><ErrorState message={error} onRetry={onRetry} /></Card>;
  if (!dna) return <Card><CardTitle icon={Dna}>Client DNA</CardTitle><EmptyState message="Select a client to view DNA profile" /></Card>;

  const [drawerTrait, setDrawerTrait] = useState<string | null>(null);
  const [drawerCategory, setDrawerCategory] = useState<string | null>(null);

  const avgConfidence = (() => {
    const vals = Object.values(dna.traitConfidence || {});
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  })();

  const timelineData = useMemo(() => {
    if (!dna.evidence || dna.evidence.length === 0) return [];
    const byYear: Record<string, { trait: string; date: string; excerpt: string }[]> = {};
    dna.evidence.forEach(e => {
      const year = e.crmDate?.slice(0, 4) || "Unknown";
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push({ trait: e.trait, date: e.crmDate, excerpt: e.crmExcerpt });
    });
    return Object.entries(byYear).sort((a, b) => a[0].localeCompare(b[0]));
  }, [dna.evidence]);

  function openDrawer(trait: string, category: string) {
    setDrawerTrait(trait);
    setDrawerCategory(category);
  }

  function closeDrawer() {
    setDrawerTrait(null);
    setDrawerCategory(null);
  }
```

- [ ] **Step 3: Replace the four pill sections with scrollable list boxes**

Remove the entire `{/* All categories */}` block (lines ~114–186 in the original) and replace with:

```tsx
      {/* All categories — scrollable list boxes */}
      <div className="space-y-4">

        {/* Client Values */}
        {dna.values && dna.values.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Client Values</p>
            <div className="h-40 overflow-y-auto bg-slate-800/50 border border-slate-700 rounded-lg">
              {dna.values.map((item, idx) => (
                <button
                  key={item}
                  onClick={() => openDrawer(item, "values")}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left text-slate-300 hover:bg-slate-700/60 transition-colors ${idx < dna.values!.length - 1 ? "border-b border-slate-700/50" : ""}`}
                >
                  <span className="capitalize">{item}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Life Events — vertical timeline (unchanged) */}
        {dna.lifeEvents && dna.lifeEvents.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Life Events</p>
            <div className="flex flex-col gap-0">
              {dna.lifeEvents.map((item, idx) => (
                <div key={item} className="flex items-stretch gap-3">
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-purple-400 mt-1 shrink-0" />
                    {idx < dna.lifeEvents!.length - 1 && (
                      <div className="w-0.5 flex-1 bg-slate-700 mt-1" />
                    )}
                  </div>
                  <p className="text-sm text-slate-300 pb-3">{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Business Context */}
        {dna.businessContext && dna.businessContext.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Business Context</p>
            <div className="h-40 overflow-y-auto bg-slate-800/50 border border-slate-700 rounded-lg">
              {dna.businessContext.map((item, idx) => (
                <button
                  key={item}
                  onClick={() => openDrawer(item, "businessContext")}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left text-slate-300 hover:bg-slate-700/60 transition-colors ${idx < dna.businessContext!.length - 1 ? "border-b border-slate-700/50" : ""}`}
                >
                  <span className="capitalize">{item}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Risk Sensitivities */}
        {dna.riskSensitivities && dna.riskSensitivities.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Risk Sensitivities</p>
            <div className="h-40 overflow-y-auto bg-slate-800/50 border border-slate-700 rounded-lg">
              {dna.riskSensitivities.map((item, idx) => (
                <button
                  key={item}
                  onClick={() => openDrawer(item, "riskSensitivities")}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left text-slate-300 hover:bg-slate-700/60 transition-colors ${idx < dna.riskSensitivities!.length - 1 ? "border-b border-slate-700/50" : ""}`}
                >
                  <span className="capitalize">{item}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Personal Priorities */}
        {dna.personalPriorities && dna.personalPriorities.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Personal Priorities</p>
            <div className="h-40 overflow-y-auto bg-slate-800/50 border border-slate-700 rounded-lg">
              {dna.personalPriorities.map((item, idx) => (
                <button
                  key={item}
                  onClick={() => openDrawer(item, "personalPriorities")}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left text-slate-300 hover:bg-slate-700/60 transition-colors ${idx < dna.personalPriorities!.length - 1 ? "border-b border-slate-700/50" : ""}`}
                >
                  <span className="capitalize">{item}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
```

- [ ] **Step 4: Mount the TraitDrawer inside the return, just before the closing `</FadeIn>`**

Add just before `</FadeIn>`:

```tsx
      <TraitDrawer
        open={drawerTrait !== null}
        trait={drawerTrait}
        category={drawerCategory}
        evidence={dna.evidence ?? []}
        clientId={clientId}
        onClose={closeDrawer}
      />
```

- [ ] **Step 5: Pass `clientId` from `App.tsx`**

In `App.tsx`, find the `DNAPanel` usage and add `clientId={selectedId ?? ""}`:

```tsx
<DNAPanel
  dna={dna}
  clientId={selectedId ?? ""}
  loading={dnaFetch.loading}
  error={dnaFetch.error && !dna ? dnaFetch.error : null}
  onRetry={dnaFetch.retry}
  durationMs={dnaFetch.durationMs}
  fetchedAt={dnaFetch.fetchedAt}
/>
```

- [ ] **Step 6: Remove unused imports from DNAPanel**

Remove `ConfidenceBadge` from the import (it's no longer used in the four list sections — it's still used in the avgConfidence badge at the top, so keep it only if that badge remains). Check the file after edits: if `ConfidenceBadge` is still referenced in the communication style row, keep it; otherwise remove.

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd /Users/bggoranoff/workplace/SwissHacks && npx tsc --noEmit -p client/tsconfig.json 2>&1 | head -30
```
Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 8: Commit**

```bash
git add client/src/components/dna/DNAPanel.tsx client/src/App.tsx
git commit -m "feat: DNA panel scrollable trait lists with drawer popup"
```
