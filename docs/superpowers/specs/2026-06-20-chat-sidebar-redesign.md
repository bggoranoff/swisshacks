# Chat Sidebar Redesign — Design Spec
Date: 2026-06-20

## Overview

Move the RM Assistant chat from the main scrollable column into a persistent right-side panel, preserve per-client chat history in React state, promote Advisory to the top of the main column, and polish the chat UX with a 3-suggestion limit and a Cursor-style @ClientName context pill.

---

## Layout

### Before
```
[260px sidebar] [main content — 2-col grid]
```

### After
```
[260px sidebar] [main content — 2-col grid] [360px chat panel]
```

- Top-level layout: `grid-cols-[260px_1fr_360px] h-screen`
- Chat column: `h-screen overflow-hidden flex flex-col bg-slate-900 border-l border-slate-700` — does NOT scroll with the page
- Main content column: keeps `overflow-y-auto`, shrinks to fit

---

## Panel Order (main column)

1. Advisory Draft (moved to top — `col-span-2`)
2. Client header (`col-span-2`)
3. Stats row (`col-span-2`)
4. DNA Panel + Portfolio Table (side by side, 1 col each)
5. News Feed + Alerts Panel (side by side, 1 col each)
6. Knowledge Graph (`col-span-2`)
7. Decision Log (`col-span-2`)

---

## Per-Client Chat History

- `App.tsx` holds `chatHistories: Record<string, ChatMessage[]>` in state (plain object keyed by clientId)
- `ChatPanel` receives `history: ChatMessage[]` and `onHistoryChange: (msgs: ChatMessage[]) => void` props instead of managing its own `messages` state
- On first render for a clientId, if history is empty the panel fires `GET /api/clients/:id/chat` to load server history and calls `onHistoryChange` with the result
- Subsequent messages are appended to the record in `App.tsx` via `onHistoryChange`
- Switching clients is instant — no flash of empty, no lost history

---

## Chat UX

### Suggestions
Reduce from 5 to 3:
1. "What are the main conflicts in this portfolio?"
2. "Summarize this client's investment identity in 3 sentences"
3. "What CIO recommendations conflict with this client's DNA?"

### @ClientName context pill
- Rendered just above the input row inside `ChatPanel`
- Markup: `<span>@ <strong>{clientName}</strong></span>` styled as a small dark chip with orange `@`
- Non-interactive, always visible when a client is selected
- Client name passed as a new `clientName: string` prop

### Input area layout
```
┌─────────────────────────────────────────────┐
│  @Schneider                                 │  ← context pill row
│  ─────────────────────────────────────────  │
│  [Ask about this client...          ] [→]   │  ← input + send
└─────────────────────────────────────────────┘
```

---

## E2E Verification

Check `server/src/agents/chat.agent.ts` — confirm the system prompt injects the client's DNA summary and portfolio context. If not, add it. Then manually verify: with Schneider selected, send "What are the main conflicts in this portfolio?" and confirm the response references Schneider-specific data (not generic output).

---

## Files Changed

| File | Change |
|------|--------|
| `client/src/App.tsx` | 3-col grid; `chatHistories` state; reorder panels; pass `history`, `onHistoryChange`, `clientName` to `ChatPanel` |
| `client/src/components/chat/ChatPanel.tsx` | Accept `history`, `onHistoryChange`, `clientName` props; reduce suggestions to 3; add @ClientName pill; remove internal `messages` state |
| `server/src/agents/chat.agent.ts` | Verify/fix system prompt includes client DNA + portfolio context |
