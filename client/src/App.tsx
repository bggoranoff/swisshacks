import { useState, useCallback, useRef, useEffect } from "react";
import { Briefcase } from "lucide-react";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { TraceDrawer } from "./components/traces/TraceDrawer";
import { AuditDrawer } from "./components/audit/AuditDrawer";
import { DNAPanel } from "./components/dna/DNAPanel";
import { PortfolioTable } from "./components/portfolio/PortfolioTable";
import { NewsFeed } from "./components/news/NewsFeed";
import { AlertsPanel } from "./components/alerts/AlertsPanel";
import { AdvisoryPanel } from "./components/advisory/AdvisoryPanel";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import { KnowledgeGraphPanel } from "./components/graph/KnowledgeGraphPanel";
import { useFetch } from "./hooks/useFetch";
import { mockClients, mockDNA, mockPortfolios, mockNews, mockAdvisory } from "./data/mock";
import type {
  ClientSummary,
  ClientDNA,
  PortfolioAnalysis,
  NewsDigest,
  AdvisoryMessage,
} from "./types/api";

function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tracesOpen, setTracesOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [advisory, setAdvisory] = useState<AdvisoryMessage | null>(null);
  const [advisoryLoading, setAdvisoryLoading] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  const [approvedAlertId, setApprovedAlertId] = useState<string | null>(null);
  const advisoryRef = useRef<HTMLDivElement>(null);

  // Fetch clients list
  const clientsFetch = useFetch<ClientSummary[]>("/api/clients");
  const clients = clientsFetch.data ?? mockClients;

  // Fetch client-specific data when a client is selected
  const dnaFetch = useFetch<ClientDNA>(selectedId ? `/api/clients/${selectedId}/dna` : null);
  const portfolioFetch = useFetch<PortfolioAnalysis>(selectedId ? `/api/clients/${selectedId}/portfolio` : null);
  const newsFetch = useFetch<NewsDigest>(selectedId ? `/api/clients/${selectedId}/news` : null);

  // Use mock fallbacks when API fails
  const dna = dnaFetch.data ?? (selectedId && dnaFetch.error ? (mockDNA[selectedId] ?? null) : null);
  const portfolio = portfolioFetch.data ?? (selectedId && portfolioFetch.error ? (mockPortfolios[selectedId] ?? null) : null);
  const news = newsFetch.data ?? (selectedId && newsFetch.error ? (mockNews[selectedId] ?? null) : null);

  const anyError = clientsFetch.error || dnaFetch.error || portfolioFetch.error || newsFetch.error;

  const handleSelectClient = useCallback((id: string) => {
    setSelectedId(id);
    setAdvisory(null);
    setApprovedAlertId(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedId) return;
    setAdvisoryLoading(true);
    // Pick the approved alert first, then fall back to the first news alert
    const firstNewsAlertId = news?.alerts?.[0]?.id ? `news-${news.alerts[0].id}` : undefined;
    const contextAlertId = approvedAlertId ?? firstNewsAlertId ?? undefined;
    const body: Record<string, unknown> = {};
    if (contextAlertId) body.alertId = contextAlertId;
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
        setAdvisory(mockAdvisory[selectedId] ?? null);
      }
    } catch {
      setAdvisory(mockAdvisory[selectedId] ?? null);
    } finally {
      setAdvisoryLoading(false);
    }
  }, [selectedId, approvedAlertId, news]);

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  // Demo mode: auto-walkthrough of Schneider scenario
  const handleDemo = useCallback(() => {
    setSelectedId("schneider");
    setAdvisory(null);
    setDemoActive(true);

    // 2s: scroll DNA panel into view
    setTimeout(() => {
      const dnaEl = document.getElementById("dna-panel");
      if (dnaEl) dnaEl.scrollIntoView({ behavior: "smooth" });
    }, 2000);

    // 4s: scroll alerts panel into view
    setTimeout(() => {
      const alertsEl = document.getElementById("alerts-panel");
      if (alertsEl) alertsEl.scrollIntoView({ behavior: "smooth" });
    }, 4000);

    // 6s: auto-click Generate Advisory
    setTimeout(() => {
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
            setAdvisory(mockAdvisory["schneider"] ?? null);
          }
          if (advisoryRef.current) {
            advisoryRef.current.scrollIntoView({ behavior: "smooth" });
          }
        })
        .catch(() => {
          setAdvisory(mockAdvisory["schneider"] ?? null);
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
      } else if (e.key === "t" || e.key === "T") {
        setTracesOpen(prev => !prev);
      } else if (e.key === "a" || e.key === "A") {
        setAuditOpen(prev => !prev);
      } else if (e.key === "Escape") {
        setTracesOpen(false);
        setAuditOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleDemo, handleSelectClient]);

  // Scroll main content to top when switching clients
  useEffect(() => {
    const main = document.querySelector("main");
    if (main) main.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedId]);

  const dnaLoading = dnaFetch.loading;
  const portLoading = portfolioFetch.loading;
  const newsLoading = newsFetch.loading;

  return (
    <div className="grid grid-cols-[260px_1fr] h-screen bg-slate-900 text-slate-100 font-sans">
      {(dnaLoading || portLoading || newsLoading) && (
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-slate-800 z-[60]">
          <div className="h-full bg-blue-500 animate-pulse" style={{ width: "60%", transition: "width 0.5s" }} />
        </div>
      )}
      <Sidebar
        clients={clients}
        selectedId={selectedId}
        onSelect={handleSelectClient}
        loading={clientsFetch.loading}
      />
      <div className="flex flex-col h-screen overflow-hidden">
        <Header onDemo={handleDemo} onTracesClick={() => setTracesOpen(true)} onAuditClick={() => setAuditOpen(true)} />
        {demoActive && (
          <div className="bg-blue-700/90 border-b border-blue-500 px-6 py-2 flex items-center justify-between text-white text-xs font-medium">
            <span>Demo Mode — Walking through Schneider scenario...</span>
            <button
              onClick={() => setDemoActive(false)}
              className="ml-4 text-blue-200 hover:text-white transition-colors"
              aria-label="Dismiss demo banner"
            >
              Dismiss
            </button>
          </div>
        )}
        {anyError && (
          <div className="bg-amber-900/30 border-b border-amber-700/50 px-6 py-2 text-amber-200 text-xs font-medium flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Offline — showing sample data. Connect the backend API for live results.
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-6">
          {!selectedId ? (
            <div className="grid grid-cols-2">
              <div className="col-span-2 flex flex-col items-center justify-center h-96 text-center">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-lg">
                  <div className="h-16 w-16 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="h-8 w-8 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white mb-2">Welcome to WealthAdvisor AI</h2>
                  <p className="text-slate-400 text-sm mb-4">
                    Select a client from the sidebar to view their investment DNA, portfolio analysis,
                    news alerts, and generate personalised advisory messages.
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-left">
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-xs text-blue-400 font-medium">Client DNA</p>
                      <p className="text-xs text-slate-500 mt-1">AI-extracted values, priorities &amp; style</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-xs text-green-400 font-medium">Portfolio Analysis</p>
                      <p className="text-xs text-slate-500 mt-1">Holdings, drift &amp; allocation charts</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-xs text-purple-400 font-medium">News Monitoring</p>
                      <p className="text-xs text-slate-500 mt-1">Live news scored by relevance</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <p className="text-xs text-amber-400 font-medium">Advisory Messages</p>
                      <p className="text-xs text-slate-500 mt-1">Personalised RM communication</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {/* Client Header */}
              <div className="col-span-2 bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-semibold text-white ${
                    selectedId === "schneider" ? "bg-blue-600" :
                    selectedId === "huber" ? "bg-green-600" :
                    selectedId === "raeber" ? "bg-amber-600" : "bg-purple-600"
                  }`}>
                    {selectedId === "schneider" ? "MS" :
                     selectedId === "huber" ? "PH" :
                     selectedId === "raeber" ? "RR" : "CA"}
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
                    <p className="text-xs text-slate-400">Strategy</p>
                    <p className="text-sm font-medium text-white">{clients?.find(c => c.id === selectedId)?.strategy}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">CRM Notes</p>
                    <p className="text-sm font-medium text-white">{clients?.find(c => c.id === selectedId)?.crmEntryCount}</p>
                  </div>
                  {dna && (
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Comm. Style</p>
                      <p className="text-sm font-medium text-white capitalize">{dna.communicationStyle}</p>
                    </div>
                  )}
                </div>
              </div>
              <div id="dna-panel">
                <ErrorBoundary fallbackMessage="Failed to load DNA profile">
                  <DNAPanel
                    dna={dna}
                    loading={dnaFetch.loading}
                    error={dnaFetch.error && !dna ? dnaFetch.error : null}
                    onRetry={dnaFetch.refetch}
                  />
                </ErrorBoundary>
              </div>
              <ErrorBoundary fallbackMessage="Failed to load portfolio">
                <PortfolioTable
                  portfolio={portfolio}
                  loading={portfolioFetch.loading}
                  error={portfolioFetch.error && !portfolio ? portfolioFetch.error : null}
                  onRetry={portfolioFetch.refetch}
                />
              </ErrorBoundary>
              <ErrorBoundary fallbackMessage="Failed to load news feed">
                <NewsFeed
                  news={news}
                  loading={newsFetch.loading}
                  error={newsFetch.error && !news ? newsFetch.error : null}
                  onRetry={newsFetch.refetch}
                />
              </ErrorBoundary>
              <div id="alerts-panel">
                <ErrorBoundary fallbackMessage="Failed to load alerts">
                  <AlertsPanel
                    news={news}
                    portfolio={portfolio}
                    loading={dnaFetch.loading || portfolioFetch.loading || newsFetch.loading}
                    selectedId={selectedId}
                    triggerEvent={clients?.find(c => c.id === selectedId)?.triggerEvent}
                    onApprove={(id) => setApprovedAlertId(id)}
                  />
                </ErrorBoundary>
              </div>
              <ErrorBoundary fallbackMessage="Failed to load knowledge graph">
                <KnowledgeGraphPanel clientId={selectedId} />
              </ErrorBoundary>
              <div ref={advisoryRef} className="col-span-2">
                {(() => {
                  // Resolve the alert title to show in the AdvisoryPanel banner.
                  // Prefer the approved alert; fall back to the first news alert.
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
                      />
                    </ErrorBoundary>
                  );
                })()}
              </div>
            </div>
          )}
        </main>
      </div>
      <TraceDrawer isOpen={tracesOpen} onClose={() => setTracesOpen(false)} />
      <AuditDrawer isOpen={auditOpen} onClose={() => setAuditOpen(false)} />
    </div>
  );
}

export default App;
