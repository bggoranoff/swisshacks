import {
  AlertTriangle,
  ArrowRight,
  Clock,
  ExternalLink,
  ListTodo,
  Newspaper,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardTitle } from "../components/shared/Card";
import { EmptyState } from "../components/shared/EmptyState";
import { ErrorState } from "../components/shared/ErrorState";
import { SkeletonBlock } from "../components/shared/SkeletonLoader";
import type {
  HomeAffectedClient,
  HomeDashboard,
  HomeNewsItem,
  HomeTodo,
} from "../types/api";
import {
  firstSentence,
  formatDate,
  formatScore,
  maxTodoRelevance,
  severityLabels,
  severityStyles,
  sourceStyles,
  topTodoSources,
} from "./home.helpers";

interface HomePageProps {
  data: HomeDashboard | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectClient: (id: string) => void;
  onOpenTodo: (id: string) => void;
}

function ClientPills({
  clients,
  onSelectClient,
  showReason = false,
}: {
  clients: HomeAffectedClient[];
  onSelectClient: (id: string) => void;
  showReason?: boolean;
}) {
  if (clients.length === 0) {
    return <span className="text-xs text-slate-500">No affected clients detected</span>;
  }

  const sortedClients = [...clients].sort((a, b) => b.relevanceScore - a.relevanceScore);
  const maxVisible = showReason ? 6 : 10;
  const visibleClients = sortedClients.slice(0, maxVisible);
  const hiddenCount = sortedClients.length - visibleClients.length;

  if (showReason) {
    return (
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {visibleClients.map(client => (
          <button
            key={client.id}
            onClick={() => onSelectClient(client.id)}
            className="rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-left transition-colors hover:border-blue-500/60 hover:bg-slate-900"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-200">
                <Users className="h-3 w-3 flex-none text-blue-300" />
                <span className="truncate">{client.name}</span>
              </span>
              <span className="shrink-0 text-xs text-slate-500">{formatScore(client.relevanceScore)}</span>
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-400">{firstSentence(client.reason)}</span>
          </button>
        ))}
        {hiddenCount > 0 && (
          <div className="rounded-lg border border-slate-700 bg-slate-900/30 px-3 py-2 text-xs text-slate-500">
            +{hiddenCount} more affected clients
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visibleClients.map(client => (
        <button
          key={client.id}
          onClick={() => onSelectClient(client.id)}
          title={client.reason}
          className="inline-flex max-w-[220px] items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-900/50 px-2.5 py-1 text-xs text-slate-200 transition-colors hover:border-blue-500/60 hover:text-white"
        >
          <Users className="h-3 w-3 flex-none text-blue-300" />
          <span className="truncate">{client.name}</span>
          <span className="text-slate-500">{formatScore(client.relevanceScore)}</span>
        </button>
      ))}
      {hiddenCount > 0 && (
        <span className="rounded-lg border border-slate-700 bg-slate-900/40 px-2.5 py-1 text-xs text-slate-500">
          +{hiddenCount} more
        </span>
      )}
    </div>
  );
}

function TodoItem({
  todo,
  onSelectClient,
  onOpenTodo,
}: {
  todo: HomeTodo;
  onSelectClient: (id: string) => void;
  onOpenTodo: (id: string) => void;
}) {
  const sourceArticles = todo.triggerType === "news" ? topTodoSources(todo) : [];
  const primarySource = sourceArticles[0] ?? todo.sourceArticle;

  return (
    <article className="rounded-lg border border-slate-700 bg-slate-900/35 p-4 transition-colors hover:border-slate-600">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button onClick={() => onOpenTodo(todo.id)} className="min-w-0 text-left">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${severityStyles[todo.severity]}`}>
              {severityLabels[todo.severity]}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase ${sourceStyles[primarySource.sourceType]}`}>
              {primarySource.sourceType}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              {formatDate(primarySource.publishedAt)}
            </span>
          </div>
          <h3 className="text-sm font-semibold leading-5 text-white transition-colors hover:text-blue-200">{todo.title}</h3>
        </button>
        <button
          onClick={() => onOpenTodo(todo.id)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-100 transition-colors hover:bg-blue-500/20"
        >
          View details
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-300">{todo.summary}</p>

      <div className="mt-3 rounded-lg border border-slate-700/80 bg-slate-800/40 px-3 py-2">
        <p className="text-xs font-medium uppercase text-slate-500">Suggested RM action</p>
        <p className="mt-1 text-sm leading-5 text-slate-200">{todo.recommendedAction}</p>
      </div>

      {sourceArticles.length > 0 && (
        <div className="mt-3 rounded-lg border border-slate-700/80 bg-slate-950/35 px-3 py-2">
          <p className="text-xs font-medium uppercase text-slate-500">News sources</p>
          <div className="mt-2 space-y-2">
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
                  className="flex items-center gap-2 text-xs text-slate-300 transition-colors hover:text-white"
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

      <div className="mt-3 flex flex-wrap gap-2">
        {todo.riskTags.map(tag => (
          <span key={tag} className="rounded-full bg-slate-700/60 px-2 py-1 text-[11px] text-slate-300">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium uppercase text-slate-500">Affected clients</p>
        <ClientPills clients={todo.affectedClients} onSelectClient={onSelectClient} showReason />
      </div>
    </article>
  );
}

function NewsItem({ item, onSelectClient }: { item: HomeNewsItem; onSelectClient: (id: string) => void }) {
  const scoreWidth = `${Math.max(4, Math.round(item.relevanceScore * 100))}%`;

  return (
    <article className="rounded-lg border border-slate-700 bg-slate-900/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase ${sourceStyles[item.sourceType]}`}>
              {item.sourceType}
            </span>
            <span>{item.source}</span>
            <span>{formatDate(item.publishedAt)}</span>
          </div>
          <h3 className="text-sm font-semibold leading-5 text-white">{item.title}</h3>
        </div>
        {item.url && item.url !== "#" && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-600 p-2 text-slate-300 transition-colors hover:border-blue-500/60 hover:text-white"
            aria-label="Open source article"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-400">{item.summary}</p>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-slate-500">Max client relevance</span>
          <span className="font-medium text-slate-300">{formatScore(item.relevanceScore)}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
          <div className="h-full rounded-full bg-blue-400" style={{ width: scoreWidth }} />
        </div>
      </div>

      <div className="mt-4">
        <ClientPills clients={item.affectedClients} onSelectClient={onSelectClient} />
      </div>
    </article>
  );
}

export function HomePage({ data, loading, error, onRetry, onSelectClient, onOpenTodo }: HomePageProps) {
  const highCount = data?.todos.filter(todo => todo.severity === "high").length ?? 0;
  const mediumCount = data?.todos.filter(todo => todo.severity === "medium").length ?? 0;
  const lowCount = data?.todos.filter(todo => todo.severity === "low").length ?? 0;

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardTitle icon={ListTodo}>Relationship Manager Todos</CardTitle>
          <SkeletonBlock lines={6} />
        </Card>
        <Card>
          <CardTitle icon={Newspaper}>Latest News</CardTitle>
          <SkeletonBlock lines={6} />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card colSpan2>
        <CardTitle icon={AlertTriangle}>Home Dashboard</CardTitle>
        <ErrorState message={error} onRetry={onRetry} />
      </Card>
    );
  }

  if (!data) {
    return (
      <Card colSpan2>
        <CardTitle icon={ListTodo}>Home Dashboard</CardTitle>
        <EmptyState message="No home dashboard data available" />
      </Card>
    );
  }

  const sortedTodos = [...data.todos].sort((a, b) => maxTodoRelevance(b) - maxTodoRelevance(a));
  const sortedNews = [...data.latestNews].sort((a, b) => b.relevanceScore - a.relevanceScore);

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="min-h-[520px]">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle icon={ListTodo}>Relationship Manager Todos</CardTitle>
            <p className="text-sm text-slate-400">
              Aggregated from relevant news triggers and grouped by action for affected clients.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2">
              <p className="text-lg font-semibold text-red-200">{highCount}</p>
              <p className="text-[11px] uppercase text-slate-500">High</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2">
              <p className="text-lg font-semibold text-amber-200">{mediumCount}</p>
              <p className="text-[11px] uppercase text-slate-500">Medium</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2">
              <p className="text-lg font-semibold text-blue-200">{lowCount}</p>
              <p className="text-[11px] uppercase text-slate-500">Low</p>
            </div>
          </div>
        </div>

        {sortedTodos.length === 0 ? (
          <EmptyState message="No RM todos generated from current news triggers" />
        ) : (
          <div className="space-y-4">
            {sortedTodos.map(todo => (
              <TodoItem key={todo.id} todo={todo} onSelectClient={onSelectClient} onOpenTodo={onOpenTodo} />
            ))}
          </div>
        )}
      </Card>

      <Card className="min-h-[520px]">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle icon={Newspaper}>Latest News</CardTitle>
            <p className="text-sm text-slate-400">
              Latest monitored articles with source type, relevance, and affected clients.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
            <TrendingUp className="h-4 w-4 text-blue-300" />
            {formatDate(data.generatedAt)}
          </div>
        </div>

        {sortedNews.length === 0 ? (
          <EmptyState message="No recent news articles found" />
        ) : (
          <div className="space-y-4">
            {sortedNews.map(item => (
              <NewsItem key={item.id} item={item} onSelectClient={onSelectClient} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
