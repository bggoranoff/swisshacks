import { ArrowLeft, Clock, ExternalLink, ListChecks, Newspaper, Users } from "lucide-react";
import type { HomeTodo } from "../types/api";
import { Card, CardTitle } from "../components/shared/Card";
import { EmptyState } from "../components/shared/EmptyState";
import { TodoClientCard } from "../components/todo/TodoClientCard";
import { formatDate, formatScore, todoSeverityPills, topTodoSources } from "./home.helpers";

interface TodoPageProps {
  todo: HomeTodo | null;
  language?: string;
  onBack: () => void;
  onSelectClient: (id: string) => void;
}

export function TodoPage({ todo, language, onBack, onSelectClient }: TodoPageProps) {
  if (!todo) {
    return (
      <Card colSpan2>
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </button>
        <EmptyState message="This action item is no longer available. It may have been refreshed — return home to see the current list." />
      </Card>
    );
  }

  const sourceArticles = topTodoSources(todo, 6);
  const primarySource = sourceArticles[0] ?? todo.sourceArticle;
  const sortedClients = [...todo.affectedClients].sort((a, b) =>
    todoSeverityPills[b.severity].rank - todoSeverityPills[a.severity].rank ||
    b.relevanceScore - a.relevanceScore
  );
  const severityPill = todoSeverityPills[todo.severity];

  return (
    <div className="flex flex-col gap-6">
      {/* Header card */}
      <Card>
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to home
        </button>

        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${severityPill.className}`}>
            {severityPill.label}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Clock className="h-3 w-3" />
            {formatDate(primarySource.publishedAt)}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Users className="h-3 w-3" />
            {todo.affectedClients.length} affected client{todo.affectedClients.length === 1 ? "" : "s"}
          </span>
        </div>

        <h1 className="text-lg font-semibold leading-6 text-slate-50">{todo.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">{todo.summary}</p>

        <div className="mt-4 rounded-lg border border-slate-700/80 bg-slate-800/40 px-3 py-2.5">
          <p className="text-xs font-medium uppercase text-slate-500">Suggested action item</p>
          <p className="mt-1 text-sm leading-5 text-slate-200">{todo.recommendedAction}</p>
        </div>

        {sourceArticles.length > 0 && (
          <div className="mt-3 rounded-lg border border-slate-700/80 bg-slate-950/35 px-3 py-2.5">
            <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium uppercase text-slate-500">
              <Newspaper className="h-3.5 w-3.5" />
              News sources
            </p>
            <div className="space-y-2">
              {sourceArticles.map(article => {
                const hasUrl = article.url && !article.url.startsWith("#");
                const content = (
                  <>
                    <span className="min-w-0 flex-1 truncate">{article.title}</span>
                    <span className="shrink-0 text-slate-500">{article.source}</span>
                    <span className="shrink-0 text-slate-500">{formatScore(article.relevanceScore)}</span>
                    {hasUrl && <ExternalLink className="h-3.5 w-3.5 shrink-0" />}
                  </>
                );
                return hasUrl ? (
                  <a
                    key={`${article.id}-${article.url}`}
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-xs text-slate-300 transition-colors hover:text-slate-50"
                  >
                    {content}
                  </a>
                ) : (
                  <div key={`${article.id}-${article.url}`} className="flex items-center gap-2 text-xs text-slate-400">
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Per-client breakdown */}
      <Card>
        <CardTitle icon={ListChecks}>Per-client action plan</CardTitle>
        <div className="flex flex-col gap-4">
          {sortedClients.map(client => (
            <TodoClientCard
              key={client.id}
              todo={todo}
              client={client}
              language={language}
              onSelectClient={onSelectClient}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
