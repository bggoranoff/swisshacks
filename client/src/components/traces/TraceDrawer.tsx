import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Loader2, AlertTriangle, Activity } from "lucide-react";
import clsx from "clsx";

// ── Types ────────────────────────────────────────────────────────────────────

interface TraceSummary {
  traceId: string;
  duration: number;      // ms
  startTime: string;     // ISO
  serviceName: string;
  status: "ok" | "error" | string;
  spanCount: number;
}

interface Span {
  spanId: string;
  parentSpanId?: string | null;
  operationName: string;
  serviceName: string;
  duration: number;      // ms
  startTime: string;
  status?: "ok" | "error" | string;
  children?: Span[];
}

interface TraceDetail {
  traceId: string;
  duration: number;
  startTime: string;
  spans: Span[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return iso;
  }
}

/** Palette for service-name badges — cycles through a set of colours. */
const SERVICE_COLOURS = [
  "bg-indigo-900/60 text-indigo-300",
  "bg-cyan-900/60 text-cyan-300",
  "bg-violet-900/60 text-violet-300",
  "bg-teal-900/60 text-teal-300",
  "bg-rose-900/60 text-rose-300",
  "bg-amber-900/60 text-amber-300",
  "bg-lime-900/60 text-lime-300",
  "bg-sky-900/60 text-sky-300",
];

const serviceColourCache = new Map<string, string>();
let colourIndex = 0;

function serviceColour(name: string): string {
  if (!serviceColourCache.has(name)) {
    serviceColourCache.set(name, SERVICE_COLOURS[colourIndex % SERVICE_COLOURS.length]);
    colourIndex++;
  }
  return serviceColourCache.get(name)!;
}

function StatusDot({ status }: { status: string }) {
  const ok = status === "ok" || status === "OK" || status === "success";
  return (
    <span
      className={clsx(
        "inline-block h-2 w-2 rounded-full flex-shrink-0",
        ok ? "bg-green-400" : "bg-red-400"
      )}
      title={status}
    />
  );
}

// ── Span tree ────────────────────────────────────────────────────────────────

function SpanNode({ span, depth = 0 }: { span: Span; depth?: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = span.children && span.children.length > 0;

  return (
    <div className="select-none">
      <div
        className={clsx(
          "flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-slate-700/50 transition-colors",
          depth > 0 && "ml-4 border-l border-slate-700 pl-3 rounded-none"
        )}
      >
        {/* expand toggle */}
        <button
          onClick={() => hasChildren && setExpanded((v) => !v)}
          className={clsx(
            "mt-0.5 flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors",
            !hasChildren && "invisible pointer-events-none"
          )}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronRight className="h-3.5 w-3.5 rotate-90" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {/* Service badge + operation */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={clsx(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide flex-shrink-0",
                serviceColour(span.serviceName)
              )}
            >
              {span.serviceName}
            </span>
            <span className="text-sm text-slate-200 break-words">{span.operationName}</span>
          </div>
          {/* Duration */}
          <span className="text-xs text-slate-500 mt-0.5 block">
            {formatDuration(span.duration)}
          </span>
        </div>
      </div>

      {/* Recursive children */}
      {hasChildren && expanded && (
        <div>
          {span.children!.map((child) => (
            <SpanNode key={child.spanId} span={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Trace list item ───────────────────────────────────────────────────────────

function TraceRow({ trace, onClick }: { trace: TraceSummary; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-700/40 hover:bg-slate-700/80 border border-slate-700 hover:border-slate-600 transition-all group"
    >
      <StatusDot status={trace.status} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-slate-200 break-words">
            {trace.serviceName}
          </span>
          <span className="text-xs text-slate-400 flex-shrink-0">
            {formatDuration(trace.duration)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-xs text-slate-500 font-mono break-all">
            {trace.traceId}
          </span>
          <span className="text-xs text-slate-500 flex-shrink-0">
            {trace.spanCount} span{trace.spanCount !== 1 ? "s" : ""}
          </span>
        </div>
        <span className="text-xs text-slate-600 mt-0.5 block">
          {formatTimestamp(trace.startTime)}
        </span>
      </div>

      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0 mt-0.5 transition-colors" />
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface TraceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type View = { kind: "list" } | { kind: "detail"; traceId: string };

export function TraceDrawer({ isOpen, onClose }: TraceDrawerProps) {
  const [view, setView] = useState<View>({ kind: "list" });

  // List state
  const [traces, setTraces] = useState<TraceSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // Detail state
  const [detail, setDetail] = useState<TraceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Fetch trace list whenever the drawer opens
  useEffect(() => {
    if (!isOpen) return;
    setView({ kind: "list" });
    setListLoading(true);
    setListError(null);

    fetch("/api/traces")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: { success: boolean; data: TraceSummary[] }) => {
        setTraces(json.data ?? []);
      })
      .catch((e: Error) => setListError(e.message))
      .finally(() => setListLoading(false));
  }, [isOpen]);

  // Fetch trace detail when a trace is selected
  function selectTrace(traceId: string) {
    setView({ kind: "detail", traceId });
    setDetail(null);
    setDetailLoading(true);
    setDetailError(null);

    fetch(`/api/traces/${traceId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json: { success?: boolean; data?: TraceDetail } | TraceDetail) => {
        // Support both wrapped { data: ... } and bare responses
        const payload = "data" in json && json.data ? json.data : (json as TraceDetail);
        setDetail(payload);
      })
      .catch((e: Error) => setDetailError(e.message))
      .finally(() => setDetailLoading(false));
  }

  function goBack() {
    setView({ kind: "list" });
    setDetail(null);
    setDetailError(null);
  }

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className="fixed right-0 inset-y-0 w-[520px] bg-slate-800 border-l border-slate-700 shadow-2xl z-50 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Agent Traces"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            {view.kind === "detail" && (
              <button
                onClick={goBack}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
                aria-label="Back to trace list"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <Activity className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-100 tracking-wide">
              {view.kind === "list" ? "Agent Traces" : "Trace Detail"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            aria-label="Close traces drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">

          {/* LIST VIEW */}
          {view.kind === "list" && (
            <>
              {listLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                </div>
              )}

              {listError && (
                <div className="flex flex-col items-center gap-2 py-8">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                  <p className="text-sm text-red-300">{listError}</p>
                  <button
                    onClick={() => {
                      setListLoading(true);
                      setListError(null);
                      fetch("/api/traces")
                        .then((r) => r.json())
                        .then((j: { success: boolean; data: TraceSummary[] }) => setTraces(j.data ?? []))
                        .catch((e: Error) => setListError(e.message))
                        .finally(() => setListLoading(false));
                    }}
                    className="text-xs text-six-orange hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!listLoading && !listError && traces.length === 0 && (
                <p className="text-sm text-slate-500 italic text-center py-8">
                  No traces found.
                </p>
              )}

              {!listLoading && !listError && traces.map((t) => (
                <TraceRow
                  key={t.traceId}
                  trace={t}
                  onClick={() => selectTrace(t.traceId)}
                />
              ))}
            </>
          )}

          {/* DETAIL VIEW */}
          {view.kind === "detail" && (
            <>
              {detailLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
                </div>
              )}

              {detailError && (
                <div className="flex flex-col items-center gap-2 py-8">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                  <p className="text-sm text-red-300">{detailError}</p>
                  <button onClick={goBack} className="text-xs text-six-orange hover:underline">
                    Go back
                  </button>
                </div>
              )}

              {!detailLoading && !detailError && detail && (
                <>
                  {/* Trace summary bar */}
                  <div className="bg-slate-700/40 border border-slate-700 rounded-xl px-4 py-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-slate-400 break-all">
                        {detail.traceId}
                      </span>
                      <span className="text-xs text-slate-300 font-medium flex-shrink-0 ml-2">
                        {formatDuration(detail.duration)}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 mt-0.5 block">
                      {formatTimestamp(detail.startTime)}
                    </span>
                  </div>

                  {/* Span tree */}
                  <div className="space-y-0.5">
                    {(detail.spans ?? []).map((span) => (
                      <SpanNode key={span.spanId} span={span} />
                    ))}
                  </div>

                  {(!detail.spans || detail.spans.length === 0) && (
                    <p className="text-sm text-slate-500 italic text-center py-4">
                      No spans in this trace.
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
