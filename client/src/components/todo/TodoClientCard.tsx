import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Users } from "lucide-react";
import type { ClientDNA, CrmLogEntry, HomeAffectedClient, HomeTodo } from "../../types/api";
import { useFetch } from "../../hooks/useFetch";
import { ConfidenceBadge } from "../shared/ConfidenceBadge";
import { CrmCitationChip, NewsCitationChip } from "./CitationChip";
import { CrmCitationModal, type CrmCitation } from "./CrmCitationModal";
import { DraftEmail } from "./DraftEmail";

const alertStyles: Record<string, string> = {
  conflict: "bg-red-500/15 text-red-200 border-red-500/40",
  opportunity: "bg-emerald-500/15 text-emerald-200 border-emerald-500/40",
};

function actionSuggestions(alertType?: HomeAffectedClient["alertType"]): string[] {
  if (alertType === "conflict") {
    return [
      "Review the client's affected holdings against this development",
      "Check suitability versus the client's DNA and risk constraints",
      "Prepare client communication with swap or rebalance options",
    ];
  }
  if (alertType === "opportunity") {
    return [
      "Assess suitability of the opportunity against the client's DNA",
      "Size a possible allocation within the client's strategy",
      "Prepare a short opportunity note for the client",
    ];
  }
  return [
    "Review how relevant this development is to the client",
    "Decide whether proactive client outreach is needed",
  ];
}

function buildCrmCitations(dna: ClientDNA | null, crmEntries: CrmLogEntry[] | null, limit = 3): CrmCitation[] {
  if (!dna?.evidence?.length) return [];
  const seen = new Set<string>();
  const citations: CrmCitation[] = [];

  for (const ev of dna.evidence) {
    const key = `${ev.crmDate}::${ev.crmExcerpt.slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // DNA evidence is LLM-inferred: the excerpt is reliable but the attached
    // crmDate can be off. Match on the excerpt text first, then fall back to date.
    const probe = ev.crmExcerpt.slice(0, 50);
    const entry =
      crmEntries?.find(e => probe.length > 0 && e.note.includes(probe)) ??
      crmEntries?.find(e => e.rawDate === ev.crmDate);
    citations.push({ trait: ev.trait, crmDate: ev.crmDate, crmExcerpt: ev.crmExcerpt, entry });
    if (citations.length >= limit) break;
  }

  return citations;
}

export function TodoClientCard({
  todo,
  client,
  language,
  onSelectClient,
}: {
  todo: HomeTodo;
  client: HomeAffectedClient;
  language?: string;
  onSelectClient: (id: string) => void;
}) {
  const dnaFetch = useFetch<ClientDNA>(`/api/clients/${client.id}/dna`);
  const crmFetch = useFetch<CrmLogEntry[]>(`/api/clients/${client.id}/crm`);
  const [activeCitation, setActiveCitation] = useState<CrmCitation | null>(null);

  const crmCitations = useMemo(
    () => buildCrmCitations(dnaFetch.data, crmFetch.data),
    [dnaFetch.data, crmFetch.data]
  );
  const suggestions = actionSuggestions(client.alertType);
  const alertId = todo.sourceArticle?.id ? `news-${todo.sourceArticle.id}` : undefined;

  return (
    <article className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 flex-none text-blue-300" />
            <h3 className="text-sm font-semibold text-white">{client.name}</h3>
            <ConfidenceBadge score={client.relevanceScore} />
            {client.alertType && (
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase ${alertStyles[client.alertType] ?? ""}`}>
                {client.alertType}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">{client.strategy} strategy</p>
        </div>
        <button
          onClick={() => onSelectClient(client.id)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-100 transition-colors hover:bg-blue-500/20"
        >
          Open client
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Reason + citations */}
      <div className="mt-3 rounded-lg border border-slate-700/80 bg-slate-950/35 px-3 py-2.5">
        <p className="text-xs font-medium uppercase text-slate-500">Why this matters for {client.name.split(" ")[0]}</p>
        <p className="mt-1 text-sm leading-6 text-slate-300">{client.reason}</p>

        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-medium uppercase text-slate-500">Sources</p>
          <div className="flex flex-wrap gap-2">
            {todo.sourceArticles.map(article => (
              <NewsCitationChip key={`${article.id}-${article.url}`} article={article} />
            ))}
            {crmCitations.map((citation, i) => (
              <CrmCitationChip key={`crm-${i}`} citation={citation} onOpen={() => setActiveCitation(citation)} />
            ))}
          </div>
          {(dnaFetch.loading || crmFetch.loading) && crmCitations.length === 0 && (
            <p className="mt-1.5 text-[11px] text-slate-600">Loading CRM context…</p>
          )}
        </div>
      </div>

      {/* Action suggestions */}
      <div className="mt-3">
        <p className="mb-1.5 text-xs font-medium uppercase text-slate-500">Suggested actions</p>
        <ul className="space-y-1.5">
          {suggestions.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm leading-5 text-slate-300">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none text-six-red/70" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Email */}
      <div className="mt-3">
        <DraftEmail clientId={client.id} clientName={client.name} alertId={alertId} language={language} />
      </div>

      {activeCitation && <CrmCitationModal citation={activeCitation} onClose={() => setActiveCitation(null)} />}
    </article>
  );
}
