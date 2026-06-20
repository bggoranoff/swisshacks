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
  HomeTodoSeverity,
} from "../types/api";

interface HomePageProps {
  data: HomeDashboard | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectClient: (id: string) => void;
}

const severityStyles: Record<HomeTodoSeverity, string> = {
  critical: "bg-red-500/15 text-red-200 border-red-500/40",
  high: "bg-orange-500/15 text-orange-200 border-orange-500/40",
  medium: "bg-amber-500/15 text-amber-200 border-amber-500/40",
  low: "bg-slate-600/40 text-slate-200 border-slate-500/40",
};

const sourceStyles: Record<HomeNewsItem["sourceType"], string> = {
  live: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30",
  scenario: "bg-violet-500/15 text-violet-200 border-violet-500/30",
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

function ClientPills({
  clients,
  onSelectClient,
}: {
  clients: HomeAffectedClient[];
  onSelectClient: (id: string) => void;
}) {
  if (clients.length === 0) {
    return <span className="text-xs text-slate-500">No affected clients detected</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {clients.map(client => (
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
    </div>
  );
}

function TodoItem({ todo, onSelectClient }: { todo: HomeTodo; onSelectClient: (id: string) => void }) {
  const firstClient = todo.affectedClients[0];

  return (
    <article className="rounded-lg border border-slate-700 bg-slate-900/35 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${severityStyles[todo.severity]}`}>
              {todo.severity}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase ${sourceStyles[todo.sourceArticle.sourceType]}`}>
              {todo.sourceArticle.sourceType}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              {formatDate(todo.sourceArticle.publishedAt)}
            </span>
          </div>
          <h3 className="text-sm font-semibold leading-5 text-white">{todo.title}</h3>
        </div>
        {firstClient && (
          <button
            onClick={() => onSelectClient(firstClient.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-100 transition-colors hover:bg-blue-500/20"
          >
            Open client
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-300">{todo.summary}</p>

      <div className="mt-3 rounded-lg border border-slate-700/80 bg-slate-800/40 px-3 py-2">
        <p className="text-xs font-medium uppercase text-slate-500">Suggested RM action</p>
        <p className="mt-1 text-sm leading-5 text-slate-200">{todo.recommendedAction}</p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {todo.riskTags.map(tag => (
          <span key={tag} className="rounded-full bg-slate-700/60 px-2 py-1 text-[11px] text-slate-300">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4">
        <ClientPills clients={todo.affectedClients} onSelectClient={onSelectClient} />
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

export function HomePage({ data, loading, error, onRetry, onSelectClient }: HomePageProps) {
  const criticalCount = data?.todos.filter(todo => todo.severity === "critical").length ?? 0;
  const highCount = data?.todos.filter(todo => todo.severity === "high").length ?? 0;
  const affectedClientCount = new Set(data?.todos.flatMap(todo => todo.affectedClients.map(client => client.id))).size;

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
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

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
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
              <p className="text-lg font-semibold text-red-200">{criticalCount}</p>
              <p className="text-[11px] uppercase text-slate-500">Critical</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2">
              <p className="text-lg font-semibold text-orange-200">{highCount}</p>
              <p className="text-[11px] uppercase text-slate-500">High</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2">
              <p className="text-lg font-semibold text-blue-200">{affectedClientCount}</p>
              <p className="text-[11px] uppercase text-slate-500">Clients</p>
            </div>
          </div>
        </div>

        {data.todos.length === 0 ? (
          <EmptyState message="No RM todos generated from current news triggers" />
        ) : (
          <div className="space-y-4">
            {data.todos.map(todo => (
              <TodoItem key={todo.id} todo={todo} onSelectClient={onSelectClient} />
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

        {data.latestNews.length === 0 ? (
          <EmptyState message="No recent news articles found" />
        ) : (
          <div className="space-y-4">
            {data.latestNews.map(item => (
              <NewsItem key={item.id} item={item} onSelectClient={onSelectClient} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
