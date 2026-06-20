import { ExternalLink, FileText, Newspaper } from "lucide-react";
import type { HomeSourceArticle } from "../../types/api";
import type { CrmCitation } from "./CrmCitationModal";
import { formatScore } from "../../pages/home.helpers";

export function NewsCitationChip({ article }: { article: HomeSourceArticle }) {
  const hasUrl = article.url && !article.url.startsWith("#");

  const inner = (
    <>
      <Newspaper className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
      <span className="min-w-0 max-w-[260px] truncate">{article.title}</span>
      <span className="shrink-0 text-slate-500">{article.source}</span>
      <span className="shrink-0 text-slate-500">{formatScore(article.relevanceScore)}</span>
      {hasUrl && <ExternalLink className="h-3.5 w-3.5 shrink-0" />}
    </>
  );

  const className =
    "inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-100 transition-colors hover:border-emerald-400/60 hover:bg-emerald-500/20";

  return hasUrl ? (
    <a href={article.url} target="_blank" rel="noreferrer" className={className}>
      {inner}
    </a>
  ) : (
    <span className={`${className} cursor-default`}>{inner}</span>
  );
}

export function CrmCitationChip({ citation, onOpen }: { citation: CrmCitation; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      title={citation.crmExcerpt}
      className="inline-flex items-center gap-1.5 rounded-lg border border-six-red/30 bg-six-red/10 px-2.5 py-1.5 text-xs text-amber-100 transition-colors hover:border-six-red/60 hover:bg-six-red/20"
    >
      <FileText className="h-3.5 w-3.5 shrink-0 text-six-red" />
      <span className="min-w-0 max-w-[260px] truncate">{citation.trait}</span>
      <span className="shrink-0 text-slate-500">CRM</span>
    </button>
  );
}
