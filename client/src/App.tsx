import { useState, useCallback, useRef, useEffect } from "react";
import { MessageCircle, ChevronLeft } from "lucide-react";
import { Sidebar } from "./components/layout/Sidebar";
import { TraitDrawer } from "./components/dna/TraitDrawer";
import { Header } from "./components/layout/Header";
import { AuditDrawer } from "./components/audit/AuditDrawer";
import { DNAPanel } from "./components/dna/DNAPanel";
import { PortfolioTable } from "./components/portfolio/PortfolioTable";
import { NewsFeed } from "./components/news/NewsFeed";
import { AlertsPanel } from "./components/alerts/AlertsPanel";
import { AdvisoryPanel } from "./components/advisory/AdvisoryPanel";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import { KnowledgeGraphPanel } from "./components/graph/KnowledgeGraphPanel";
import { ChatPanel } from "./components/chat/ChatPanel";
import { HomePage } from "./pages/HomePage";
import { useFetch } from "./hooks/useFetch";
import { prefetchClients } from "./hooks/prefetchCache";
import { mockClients, mockDNA, mockPortfolios, mockAdvisory } from "./data/mock";
import type {
  ClientSummary,
  ClientDNA,
  PortfolioAnalysis,
  NewsDigest,
  AdvisoryMessage,
  HomeDashboard,
} from "./types/api";

const DEMO_FALLBACKS_ENABLED = import.meta.env.VITE_DEMO_MODE === "true";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface DrawerState {
  open: boolean;
  trait: string | null;
  category: string | null;
}

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      className="w-1 shrink-0 cursor-col-resize bg-slate-700 hover:bg-six-orange/60 active:bg-six-orange transition-colors z-30"
      onMouseDown={onMouseDown}
    />
  );
}

function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [advisory, setAdvisory] = useState<AdvisoryMessage | null>(null);
  const [advisoryLoading, setAdvisoryLoading] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [approvedAlertId, setApprovedAlertId] = useState<string | null>(null);
  const [advisoryLanguage, setAdvisoryLanguage] = useState<string>("en");
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [chatWidth, setChatWidth] = useState(360);
  const [chatOpen, setChatOpen] = useState(true);
  const [drawer, setDrawer] = useState<DrawerState>({ open: false, trait: null, category: null });

  const handleChatHistoryChange = (clientId: string, msgs: ChatMessage[]) => {
    setChatHistories(prev => ({ ...prev, [clientId]: msgs }));
  };

  const handleOpenDrawer = (trait: string, category: string) => {
    setDrawer({ open: true, trait, category });
  };

  const handleCloseDrawer = () => {
    setDrawer({ open: false, trait: null, category: null });
  };

  function startSidebarResize(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (ev: MouseEvent) => setSidebarWidth(Math.max(180, Math.min(480, startW + ev.clientX - startX)));
    const onUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  function startChatResize(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = chatWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (ev: MouseEvent) => setChatWidth(Math.max(240, Math.min(560, startW + startX - ev.clientX)));
    const onUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }
  const advisoryRef = useRef<HTMLDivElement>(null);

  // Fetch clients list
  const clientsFetch = useFetch<ClientSummary[]>("/api/clients");
  const homeFetch = useFetch<HomeDashboard>(DEMO_FALLBACKS_ENABLED ? "/api/home?demo=true" : "/api/home");
  const clients = clientsFetch.data ?? (DEMO_FALLBACKS_ENABLED ? mockClients : []);

  // Warm DNA / portfolio / news for every client in the background once the
  // list loads, so selecting a client renders instantly from cache.
  useEffect(() => {
    if (clientsFetch.data && clientsFetch.data.length > 0) {
      prefetchClients(clientsFetch.data.map((c) => c.id));
    }
  }, [clientsFetch.data]);

  // Fetch client-specific data when a client is selected
  const dnaFetch = useFetch<ClientDNA>(selectedId ? `/api/clients/${selectedId}/dna` : null);
  const portfolioFetch = useFetch<PortfolioAnalysis>(selectedId ? `/api/clients/${selectedId}/portfolio` : null);
  const newsFetch = useFetch<NewsDigest>(selectedId ? `/api/clients/${selectedId}/news` : null);

  // Demo fallbacks are explicit. In normal mode, API/profile failures stay visible.
  const dna = dnaFetch.data ?? (DEMO_FALLBACKS_ENABLED && selectedId && dnaFetch.error ? (mockDNA[selectedId] ?? null) : null);
  const portfolio = portfolioFetch.data ?? (DEMO_FALLBACKS_ENABLED && selectedId && portfolioFetch.error ? (mockPortfolios[selectedId] ?? null) : null);
  const news = newsFetch.data ?? null;

  const anyError = clientsFetch.error || dnaFetch.error || portfolioFetch.error || newsFetch.error;

  const handleSelectClient = useCallback((id: string) => {
    setSelectedId(id);
    setAdvisory(null);
    setApprovedAlertId(null);
  }, []);

  const handleGenerate = useCallback(async (lang?: string) => {
    if (!selectedId) return;
    setAdvisoryLoading(true);
    // Pick the approved alert first, then fall back to the first news alert
    const firstNewsAlertId = news?.alerts?.[0]?.id ? `news-${news.alerts[0].id}` : undefined;
    const contextAlertId = approvedAlertId ?? firstNewsAlertId ?? undefined;
    const body: Record<string, unknown> = {};
    if (contextAlertId) body.alertId = contextAlertId;
    const effectiveLang = lang ?? advisoryLanguage;
    if (effectiveLang) body.language = effectiveLang;
    try {
      const res = await fetch(`/api/clients/${selectedId}/advisory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setAdvisory(json.data);
      } else {
        setAdvisory(DEMO_FALLBACKS_ENABLED ? (mockAdvisory[selectedId] ?? null) : null);
      }
    } catch {
      setAdvisory(DEMO_FALLBACKS_ENABLED ? (mockAdvisory[selectedId] ?? null) : null);
    } finally {
      setAdvisoryLoading(false);
    }
  }, [selectedId, approvedAlertId, news, advisoryLanguage]);

  const handleRegenerate = useCallback((lang?: string) => {
    handleGenerate(lang);
  }, [handleGenerate]);

  // Demo mode: auto-walkthrough of Schneider scenario
  const handleDemo = useCallback(() => {
    setSelectedId("schneider");
    setAdvisory(null);
    setDemoActive(true);
    setDemoStep(0);

    // Step 1 (immediate): Select Client is active (step 0), then mark complete
    setTimeout(() => {
      setDemoStep(1);
    }, 1000);

    // Step 2 (2s): scroll DNA panel into view
    setTimeout(() => {
      setDemoStep(1);
      const dnaEl = document.getElementById("dna-panel");
      if (dnaEl) dnaEl.scrollIntoView({ behavior: "smooth" });
    }, 2000);

    // Step 3 (4s): scroll alerts panel into view
    setTimeout(() => {
      setDemoStep(2);
      const alertsEl = document.getElementById("alerts-panel");
      if (alertsEl) alertsEl.scrollIntoView({ behavior: "smooth" });
    }, 4000);

    // Step 4 (6s): auto-click Generate Advisory
    setTimeout(() => {
      setDemoStep(3);
      setAdvisoryLoading(true);
      fetch("/api/clients/schneider/advisory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(approvedAlertId ? { alertId: approvedAlertId } : {}),
      })
        .then((res) => res.json())
        .then((json) => {
          if (json.success) {
            setAdvisory(json.data);
          } else {
            setAdvisory(DEMO_FALLBACKS_ENABLED ? (mockAdvisory["schneider"] ?? null) : null);
          }
          setDemoStep(4);
          if (advisoryRef.current) {
            advisoryRef.current.scrollIntoView({ behavior: "smooth" });
          }
        })
        .catch(() => {
          setAdvisory(DEMO_FALLBACKS_ENABLED ? (mockAdvisory["schneider"] ?? null) : null);
          setDemoStep(4);
          if (advisoryRef.current) {
            advisoryRef.current.scrollIntoView({ behavior: "smooth" });
          }
        })
        .finally(() => setAdvisoryLoading(false));
    }, 6000);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const clientIds = ["schneider", "huber", "raeber", "ammann"];
      if (e.key >= "1" && e.key <= "4") {
        handleSelectClient(clientIds[parseInt(e.key) - 1]);
      } else if (e.key === "d" || e.key === "D") {
        handleDemo();
      } else if (e.key === "a" || e.key === "A") {
        setAuditOpen(prev => !prev);
      } else if (e.key === "g" || e.key === "G") {
        if (selectedId) handleGenerate();
      } else if (e.key === "Escape") {
        setAuditOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleDemo, handleSelectClient, handleGenerate, selectedId]);

  // Scroll main content to top when switching clients
  useEffect(() => {
    const main = document.querySelector("main");
    if (main) main.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setChatOpen(prev => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const dnaLoading = dnaFetch.loading;
  const portLoading = portfolioFetch.loading;
  const newsLoading = newsFetch.loading;

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans">
      {((!selectedId && homeFetch.loading) || dnaLoading || portLoading || newsLoading) && (
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-slate-800 z-[60]">
          <div className="h-full bg-six-orange animate-pulse" style={{ width: "60%", transition: "width 0.5s" }} />
        </div>
      )}
      <Sidebar
        clients={clients}
        selectedId={selectedId}
        onSelect={handleSelectClient}
        onHome={() => setSelectedId(null)}
        loading={clientsFetch.loading}
        conflictCount={portfolio?.conflicts?.length}
        style={{ width: sidebarWidth, flexShrink: 0 }}
      />
      <ResizeHandle onMouseDown={startSidebarResize} />
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        <Header onDemo={handleDemo} onAuditClick={() => setAuditOpen(true)} />
        {demoActive && (
          <div className="bg-six-orange/10 border-b border-six-orange/30 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-six-orange">Demo Mode</span>
              <div className="flex items-center gap-1">
                {["Select Client", "View DNA", "Check Alerts", "Generate Advisory"].map((step, i) => (
                  <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${
                    i < demoStep ? "bg-green-900/50 text-green-300" :
                    i === demoStep ? "bg-six-orange text-white animate-pulse" :
                    "bg-slate-700 text-slate-500"
                  }`}>
                    {i < demoStep ? "✓" : i + 1}. {step}
                  </span>
                ))}
              </div>
            </div>
            <button onClick={() => { setDemoActive(false); setDemoStep(0); }} className="text-xs text-slate-400 hover:text-white">Dismiss</button>
          </div>
        )}
        {anyError && (
          <div className="bg-amber-900/30 border-b border-amber-700/50 px-6 py-2 text-amber-200 text-xs font-medium flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            {DEMO_FALLBACKS_ENABLED
              ? "Offline - showing explicit demo sample data. Connect the backend API for live results."
              : "Backend API error - sample profiles are disabled outside demo mode."}
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-6">
          {!selectedId ? (
            <HomePage
              data={homeFetch.data}
              loading={homeFetch.loading}
              error={homeFetch.error}
              onRetry={homeFetch.refetch}
              onSelectClient={handleSelectClient}
            />
          ) : (
            <div className="flex flex-col gap-6">
              {/* Advisory — top of page */}
              <div ref={advisoryRef}>
                {(() => {
                  const firstNewsAlert = news?.alerts?.[0];
                  let contextAlertTitle: string | undefined;
                  if (approvedAlertId) {
                    contextAlertTitle = news?.alerts?.find((a) => `news-${a.id}` === approvedAlertId)?.title
                      ?? firstNewsAlert?.title;
                  } else if (firstNewsAlert) {
                    contextAlertTitle = firstNewsAlert.title;
                  }
                  return (
                    <ErrorBoundary fallbackMessage="Failed to load advisory panel">
                      <AdvisoryPanel
                        advisory={advisory}
                        loading={advisoryLoading}
                        clientId={selectedId}
                        contextAlertTitle={contextAlertTitle ?? null}
                        onGenerate={handleGenerate}
                        onRegenerate={handleRegenerate}
                        language={advisoryLanguage}
                        onLanguageChange={setAdvisoryLanguage}
                      />
                    </ErrorBoundary>
                  );
                })()}
              </div>

              {/* Client Header */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-full shrink-0 flex items-center justify-center text-lg font-semibold text-white ${
                    selectedId === "schneider" ? "bg-six-orange" :
                    selectedId === "huber" ? "bg-six-blue" :
                    selectedId === "raeber" ? "bg-six-orange-dark" : "bg-six-blue-bright"
                  }`}>
                    {selectedId === "schneider" ? "HS" :
                     selectedId === "huber" ? "MH" :
                     selectedId === "raeber" ? "ER" : "JA"}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {clients?.find(c => c.id === selectedId)?.name || selectedId}
                    </h2>
                    <p className="text-sm text-slate-400">
                      {clients?.find(c => c.id === selectedId)?.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-slate-400">Portfolio Mandate</p>
                    <p className="text-sm font-medium text-white">{clients?.find(c => c.id === selectedId)?.strategy}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">CRM Notes</p>
                    <p className="text-sm font-medium text-white">{clients?.find(c => c.id === selectedId)?.crmEntryCount}</p>
                  </div>
                  {dna && (
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Comm. Style</p>
                      <p className="text-sm font-medium text-white capitalize">{dna.communicationProfile?.style ?? dna.communicationStyle}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6 text-xs text-slate-400 flex-wrap">
                <span>AUM: <span className="text-white font-medium">CHF {portfolio ? (portfolio.totalValueCHF / 1e6).toFixed(0) : '—'}M</span></span>
                <span>Alerts: <span className="text-amber-400 font-medium">{news?.alerts?.length || 0}</span></span>
                <span>Conflicts: <span className="text-red-400 font-medium">{portfolio?.conflicts?.length || 0}</span></span>
                <span>DNA Traits: <span className="text-six-orange font-medium">{dna ? dna.values.length + dna.riskSensitivities.length : 0}</span></span>
              </div>
              <ErrorBoundary fallbackMessage="Failed to load DNA profile">
                <DNAPanel
                  dna={dna}
                  clientId={selectedId ?? ""}
                  onOpenDrawer={handleOpenDrawer}
                  loading={dnaFetch.loading}
                  error={dnaFetch.error && !dna ? dnaFetch.error : null}
                  onRetry={dnaFetch.refetch}
                  durationMs={dnaFetch.durationMs}
                  fetchedAt={dnaFetch.fetchedAt}
                />
              </ErrorBoundary>
              <ErrorBoundary fallbackMessage="Failed to load portfolio">
                <PortfolioTable
                  portfolio={portfolio}
                  loading={portfolioFetch.loading}
                  error={portfolioFetch.error && !portfolio ? portfolioFetch.error : null}
                  onRetry={portfolioFetch.refetch}
                  durationMs={portfolioFetch.durationMs}
                  fetchedAt={portfolioFetch.fetchedAt}
                />
              </ErrorBoundary>
              <ErrorBoundary fallbackMessage="Failed to load news feed">
                <NewsFeed
                  news={news}
                  loading={newsFetch.loading}
                  error={newsFetch.error && !news ? newsFetch.error : null}
                  onRetry={newsFetch.refetch}
                  durationMs={newsFetch.durationMs}
                  fetchedAt={newsFetch.fetchedAt}
                />
              </ErrorBoundary>
              <ErrorBoundary fallbackMessage="Failed to load alerts">
                <AlertsPanel
                  news={news}
                  portfolio={portfolio}
                  portfolioConflicts={(portfolio as any)?.conflicts || []}
                  loading={dnaFetch.loading || portfolioFetch.loading || newsFetch.loading}
                  selectedId={selectedId}
                  triggerEvent={clients?.find(c => c.id === selectedId)?.triggerEvent}
                />
              </ErrorBoundary>
              {/* Knowledge Graph row — 2 cols to leave room for a second graph */}
              <div className="grid grid-cols-2 gap-6">
                <ErrorBoundary fallbackMessage="Failed to load knowledge graph">
                  <KnowledgeGraphPanel clientId={selectedId} />
                </ErrorBoundary>
              </div>
            </div>
          )}
        </main>
      </div>

      {chatOpen ? (
        <>
          <ResizeHandle onMouseDown={startChatResize} />
          <div className="flex flex-col h-screen bg-slate-900 overflow-hidden" style={{ width: chatWidth, flexShrink: 0 }}>
            {selectedId ? (
              <ErrorBoundary fallbackMessage="Failed to load RM assistant">
                <ChatPanel
                  clientId={selectedId}
                  clientName={clients?.find(c => c.id === selectedId)?.name ?? selectedId}
                  history={chatHistories[selectedId] ?? []}
                  onHistoryChange={(msgs) => handleChatHistoryChange(selectedId, msgs)}
                  onClose={() => setChatOpen(false)}
                />
              </ErrorBoundary>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <MessageCircle className="h-8 w-8 text-slate-600 mb-3" strokeWidth={1.5} />
                <p className="text-sm text-slate-500">Select a client to start a conversation</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <button
          onClick={() => setChatOpen(true)}
          title="Open chat (Ctrl+\)"
          className="flex flex-col items-center justify-center w-8 h-screen bg-slate-900 border-l border-slate-700 hover:bg-slate-800 transition-colors shrink-0 group"
        >
          <ChevronLeft className="h-4 w-4 text-slate-500 group-hover:text-six-orange transition-colors" />
        </button>
      )}

      <AuditDrawer isOpen={auditOpen} onClose={() => setAuditOpen(false)} />

      {/* Trait drawer — rendered at root so it can be positioned relative to chat column */}
      <TraitDrawer
        open={drawer.open}
        trait={drawer.trait}
        category={drawer.category}
        evidence={dna?.evidence ?? []}
        clientId={selectedId ?? ""}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}

export default App;
