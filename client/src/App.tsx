import { useState, useCallback, useRef } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
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
  const [advisory, setAdvisory] = useState<AdvisoryMessage | null>(null);
  const [advisoryLoading, setAdvisoryLoading] = useState(false);
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

    setTimeout(() => {
      const alertsEl = document.getElementById("alerts-panel");
      if (alertsEl) {
        alertsEl.scrollIntoView({ behavior: "smooth" });
      }
    }, 2000);

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
        })
        .catch(() => {
          setAdvisory(mockAdvisory["schneider"] ?? null);
        })
        .finally(() => setAdvisoryLoading(false));
    }, 4000);

    setTimeout(() => {
      if (advisoryRef.current) {
        advisoryRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 7000);
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
        <Header onDemo={handleDemo} />
        {anyError && (
          <div className="bg-amber-900/50 border-b border-amber-700 px-6 py-2 text-amber-200 text-xs font-medium">
            Offline — showing sample data. Connect the backend API for live results.
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-6">
          {!selectedId ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-white mb-2">Welcome to WealthAdvisor AI</h2>
                <p className="text-slate-400 text-sm">Select a client from the sidebar to begin analysis</p>
                <p className="text-slate-500 text-xs mt-4">Or click Demo to see a guided walkthrough</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <DNAPanel
                dna={dna}
                loading={dnaFetch.loading}
                error={dnaFetch.error && !dna ? dnaFetch.error : null}
                onRetry={dnaFetch.refetch}
              />
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
    </div>
  );
}

export default App;
