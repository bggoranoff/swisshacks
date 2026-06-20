import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { Card, CardTitle } from "../shared/Card";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const SUGGESTIONS = [
  "What are the main conflicts in this portfolio?",
  "Explain why this client is sensitive to pharma stocks",
  "What alternative investments would align with this client's values?",
  "Summarize this client's investment identity in 3 sentences",
  "What CIO recommendations conflict with this client's DNA?",
];

export function ChatPanel({ clientId }: { clientId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
    fetch(`/api/clients/${clientId}/chat`)
      .then(r => r.json())
      .then(j => { if (j.success && Array.isArray(j.data)) setMessages(j.data); })
      .catch(() => {});
  }, [clientId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async (directText?: string) => {
    const text = (directText ?? input).trim();
    if (!text || sending) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: text, timestamp: new Date().toISOString() }]);
    setSending(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const json = await res.json();
      if (json.success) {
        setMessages(prev => [...prev, json.data]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Failed to get response.", timestamp: new Date().toISOString() }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card colSpan2>
      <CardTitle icon={MessageCircle}>RM Assistant</CardTitle>
      <div ref={scrollRef} className="max-h-[300px] overflow-y-auto space-y-3 mb-3">
        {messages.length === 0 && !sending && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
            <p className="text-sm text-slate-400 mb-2">Ask the RM Assistant anything about this client:</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {SUGGESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
              m.role === "user"
                ? "bg-blue-600 text-white"
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
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
          placeholder="Ask about this client..."
          className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          disabled={sending}
        />
        <button
          onClick={() => handleSend()}
          disabled={sending || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}
