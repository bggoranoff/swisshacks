import { useState, useCallback, useRef } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { TraceDrawer } from "./components/traces/TraceDrawer";
import { DNAPanel } from "./components/dna/DNAPanel";
import { PortfolioTable } from "./components/portfolio/PortfolioTable";
import { NewsFeed } from "./components/news/NewsFeed";
import { AlertsPanel } from "./components/alerts/AlertsPanel";
import { AdvisoryPanel } from "./components/advisory/AdvisoryPanel";
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
  const [advisory, setAdvisory] = useState<AdvisoryMessage | null>(null);
  const [advisoryLoading, setAdvisoryLoading] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
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
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedId) return;
    setAdvisoryLoading(true);
    try {
      const res = await fetch(`/api/clients/${selectedId}/advisory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
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
  }, [selectedId]);

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
        body: JSON.stringify({}),
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

  return (
    <div className="grid grid-cols-[260px_1fr] h-screen bg-slate-900 text-slate-100 font-sans">
      <Sidebar
        clients={clients}
        selectedId={selectedId}
        onSelect={handleSelectClient}
        loading={clientsFetch.loading}
      />
      <div className="flex flex-col h-screen overflow-hidden">
        <Header onDemo={handleDemo} onTracesClick={() => setTracesOpen(true)} />
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
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                  <span className="text-2xl font-bold text-white">W</span>
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2 tracking-tight">Welcome to <span className="text-blue-400">Wealth</span>Advisor</h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Select a client from the sidebar to view their DNA profile, portfolio analysis, and generate personalised advisory notes.
                </p>
                <div className="mt-6 flex items-center justify-center gap-2 text-slate-500 text-xs">
                  <div className="h-px w-8 bg-slate-700" />
                  <span>or click Demo for a guided walkthrough</span>
                  <div className="h-px w-8 bg-slate-700" />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <div id="dna-panel">
                <DNAPanel
                  dna={dna}
                  loading={dnaFetch.loading}
                  error={dnaFetch.error && !dna ? dnaFetch.error : null}
                  onRetry={dnaFetch.refetch}
                />
              </div>
              <PortfolioTable
                portfolio={portfolio}
                loading={portfolioFetch.loading}
                error={portfolioFetch.error && !portfolio ? portfolioFetch.error : null}
                onRetry={portfolioFetch.refetch}
              />
              <NewsFeed
                news={news}
                loading={newsFetch.loading}
                error={newsFetch.error && !news ? newsFetch.error : null}
                onRetry={newsFetch.refetch}
              />
              <div id="alerts-panel">
                <AlertsPanel
                  news={news}
                  portfolio={portfolio}
                  loading={dnaFetch.loading || portfolioFetch.loading || newsFetch.loading}
                  selectedId={selectedId}
                />
              </div>
              <div ref={advisoryRef} className="col-span-2">
                <AdvisoryPanel
                  advisory={advisory}
                  loading={advisoryLoading}
                  clientId={selectedId}
                  onGenerate={handleGenerate}
                  onRegenerate={handleRegenerate}
                />
              </div>
            </div>
          )}
        </main>
      </div>
      <TraceDrawer isOpen={tracesOpen} onClose={() => setTracesOpen(false)} />
    </div>
  );
}

export default App;
