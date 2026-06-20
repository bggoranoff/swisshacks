# Chat Sidebar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the RM chat into a persistent right-side column, preserve per-client history in React state, promote Advisory to the top, and polish the chat UX with 3 suggestions and an @ClientName pill.

**Architecture:** Three-column top-level grid (`260px | 1fr | 360px`). Chat column is a fixed `h-screen` panel that never scrolls. `App.tsx` owns `chatHistories: Record<string, ChatMessage[]>` — the single source of truth for all client conversations. `ChatPanel` becomes controlled (receives history + setter), adds the @pill, trims suggestions to 3. No backend changes needed — chat agent already injects DNA + portfolio context.

**Tech Stack:** React 18, TailwindCSS, TypeScript (strict), existing Lucide icons.

## Global Constraints

- No new npm packages
- All Tailwind classes stay in the existing dark-theme palette (`slate-*`, `six-orange`, `six-orange-bright`)
- `ChatMessage` type used everywhere: `{ role: "user" | "assistant"; content: string; timestamp: string }`
- `clientId` is always a non-null string when the chat panel is visible

---

### Task 1: Refactor ChatPanel to controlled + UX polish

**Files:**
- Modify: `client/src/components/chat/ChatPanel.tsx`

**Interfaces:**
- Produces:
  ```typescript
  interface ChatPanelProps {
    clientId: string;
    clientName: string;
    history: ChatMessage[];
    onHistoryChange: (msgs: ChatMessage[]) => void;
  }
  export function ChatPanel(props: ChatPanelProps): JSX.Element
  ```

- [ ] **Step 1: Rewrite `ChatPanel.tsx` in full**

```typescript
import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Loader2 } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ChatPanelProps {
  clientId: string;
  clientName: string;
  history: ChatMessage[];
  onHistoryChange: (msgs: ChatMessage[]) => void;
}

const SUGGESTIONS = [
  "What are the main conflicts in this portfolio?",
  "Summarize this client's investment identity in 3 sentences",
  "What CIO recommendations conflict with this client's DNA?",
];

export function ChatPanel({ clientId, clientName, history, onHistoryChange }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load server history once per clientId
  useEffect(() => {
    if (loaded.has(clientId) || history.length > 0) return;
    fetch(`/api/clients/${clientId}/chat`)
      .then(r => r.json())
      .then(j => {
        if (j.success && Array.isArray(j.data) && j.data.length > 0) {
          onHistoryChange(j.data);
        }
        setLoaded(prev => new Set(prev).add(clientId));
      })
      .catch(() => setLoaded(prev => new Set(prev).add(clientId)));
  }, [clientId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, sending]);

  const handleSend = async (directText?: string) => {
    const text = (directText ?? input).trim();
    if (!text || sending) return;
    setInput("");
    const userMsg: ChatMessage = { role: "user", content: text, timestamp: new Date().toISOString() };
    const next = [...history, userMsg];
    onHistoryChange(next);
    setSending(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const json = await res.json();
      if (json.success) {
        onHistoryChange([...next, json.data]);
      }
    } catch {
      onHistoryChange([...next, { role: "assistant", content: "Failed to get response.", timestamp: new Date().toISOString() }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700 shrink-0">
        <MessageCircle className="h-4 w-4 text-six-orange/70" />
        <span className="text-sm font-semibold text-slate-300 uppercase tracking-wide">RM Assistant</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {history.length === 0 && !sending && (
          <div className="flex flex-col items-center justify-center h-full gap-3 pt-6">
            <p className="text-sm text-slate-400 text-center">Ask the RM Assistant anything about this client:</p>
            <div className="flex flex-col gap-2 w-full">
              {SUGGESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="text-xs px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-lg text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-six-orange text-white"
                : "bg-slate-700 text-slate-200"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-slate-700 text-slate-400 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-slate-700 p-3 space-y-2">
        {/* @ClientName pill */}
        <div className="flex items-center">
          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
            <span className="text-six-orange font-semibold">@</span>
            {clientName}
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
            placeholder="Ask about this client..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-six-orange transition-colors"
            disabled={sending}
          />
          <button
            onClick={() => handleSend()}
            disabled={sending || !input.trim()}
            className="bg-six-orange hover:bg-six-orange-bright disabled:opacity-50 text-white px-3 py-2 rounded-lg flex items-center transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
client/node_modules/.bin/tsc --noEmit -p client/tsconfig.json 2>&1 | head -20
```
Expected: no errors (or only pre-existing unrelated errors).

- [ ] **Step 3: Commit**

```bash
git add client/src/components/chat/ChatPanel.tsx
git commit -m "feat: ChatPanel controlled props, @pill, 3 suggestions"
```

---

### Task 2: Lift chat history to App.tsx + 3-column layout + panel reorder

**Files:**
- Modify: `client/src/App.tsx`

**Interfaces:**
- Consumes:
  - `ChatPanel` with props `{ clientId, clientName, history, onHistoryChange }`
  - `ChatMessage` type: `{ role: "user" | "assistant"; content: string; timestamp: string }`

**Context:** The current top-level div is `grid grid-cols-[260px_1fr] h-screen`. We change it to `grid grid-cols-[260px_1fr_360px] h-screen`. The chat column is the third column — a sibling of `<Sidebar>` and the main content column, not inside `<main>`. Advisory moves to the top of the `grid grid-cols-2` inside `<main>`.

- [ ] **Step 1: Add `ChatMessage` type import and `chatHistories` state**

Near the top of `App.tsx`, after the existing imports, add:

```typescript
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
```

And inside the `App` function body, after the existing `useState` declarations:

```typescript
const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});

const handleChatHistoryChange = (clientId: string, msgs: ChatMessage[]) => {
  setChatHistories(prev => ({ ...prev, [clientId]: msgs }));
};
```

- [ ] **Step 2: Change the top-level grid to 3 columns**

Find:
```tsx
<div className="grid grid-cols-[260px_1fr] h-screen bg-slate-900 text-slate-100 font-sans">
```

Replace with:
```tsx
<div className="grid grid-cols-[260px_1fr_360px] h-screen bg-slate-900 text-slate-100 font-sans">
```

- [ ] **Step 3: Add the chat column as the third grid child**

After the closing `</div>` of the main content column (the `<div className="flex flex-col h-screen overflow-hidden">` block), add:

```tsx
{/* Right chat column */}
<div className="flex flex-col h-screen bg-slate-900 border-l border-slate-700 overflow-hidden">
  {selectedId ? (
    <ErrorBoundary fallbackMessage="Failed to load RM assistant">
      <ChatPanel
        clientId={selectedId}
        clientName={clients?.find(c => c.id === selectedId)?.name ?? selectedId}
        history={chatHistories[selectedId] ?? []}
        onHistoryChange={(msgs) => handleChatHistoryChange(selectedId, msgs)}
      />
    </ErrorBoundary>
  ) : (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <MessageCircle className="h-8 w-8 text-slate-600 mb-3" strokeWidth={1.5} />
      <p className="text-sm text-slate-500">Select a client to start a conversation</p>
    </div>
  )}
</div>
```

Make sure `MessageCircle` is imported from `lucide-react` in `App.tsx`. Check existing imports first — add it if missing.

- [ ] **Step 4: Remove the old ChatPanel usage from inside `<main>`**

Find and delete the block:
```tsx
{/* RM Chat Assistant */}
<div className="col-span-2">
  <ErrorBoundary fallbackMessage="Failed to load RM assistant">
    <ChatPanel clientId={selectedId} />
  </ErrorBoundary>
</div>
```

- [ ] **Step 5: Move Advisory to the top of the `grid grid-cols-2` block**

The `grid grid-cols-2 gap-6` block currently starts with the Client Header. Move the Advisory block (`<div ref={advisoryRef} className="col-span-2">`) so it appears first — before the Client Header. The new order inside the grid:

```
1. Advisory (col-span-2)  ← moved here
2. Client Header (col-span-2)
3. Stats row (col-span-2)
4. DNA Panel + Portfolio Table (1 col each)
5. News Feed + Alerts Panel (1 col each)
6. Knowledge Graph (col-span-2)
7. Decision Log (col-span-2)
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
client/node_modules/.bin/tsc --noEmit -p client/tsconfig.json 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add client/src/App.tsx
git commit -m "feat: 3-col layout, per-client chat history, advisory at top"
```

---

### Task 3: E2E verification

**Context:** The chat agent (`server/src/agents/chat.agent.ts`) already injects client DNA (values, sensitivities, style) and top holdings into the system prompt. This task confirms it works end-to-end in the running app.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

Server on `:3000`, client on `:5173`.

- [ ] **Step 2: Open the app and select Schneider**

Navigate to `http://localhost:5173`. Click "Schneider" in the sidebar.

- [ ] **Step 3: Ask a client-specific question via curl**

```bash
curl -s -X POST http://localhost:3000/api/clients/schneider/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What are the main conflicts in this portfolio?"}' \
  | jq '.data.content'
```

Expected: a response that references Schneider-specific holdings or values (not generic text).

- [ ] **Step 4: Ask for a second client to confirm isolation**

```bash
curl -s -X POST http://localhost:3000/api/clients/huber/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Summarize this client investment identity in 3 sentences"}' \
  | jq '.data.content'
```

Expected: response references Huber (Peter Huber), not Schneider.

- [ ] **Step 5: Verify in browser — switch clients and check history persists**

1. Select Schneider, send a message, note the reply.
2. Select Huber, chat column shows empty (fresh conversation).
3. Switch back to Schneider — previous message is still there.

Expected: history preserved per client, no flash of empty.

- [ ] **Step 6: Commit verification note**

```bash
git commit --allow-empty -m "chore: E2E verified chat works per-client with context"
```
