import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Loader2, ChevronRight } from "lucide-react";

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
  onClose?: () => void;
}

const SUGGESTIONS = [
  "What are the main conflicts in this portfolio?",
  "Summarize this client's investment identity in 3 sentences",
  "What CIO recommendations conflict with this client's DNA?",
];

export function ChatPanel({ clientId, clientName, history, onHistoryChange, onClose }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load server history once per clientId (only if no local history yet)
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-six-orange/70" />
          <span className="text-sm font-semibold text-slate-300 uppercase tracking-wide">RM Assistant</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            title="Close chat (Ctrl+\)"
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
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
