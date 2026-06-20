import { useState } from "react";
import type { NewsDigest } from "../../types/api";
import { Card, CardTitle } from "../shared/Card";
import { SkeletonBlock } from "../shared/SkeletonLoader";
import { ErrorState } from "../shared/ErrorState";
import { EmptyState } from "../shared/EmptyState";
import { FadeIn } from "../shared/FadeIn";
import { Newspaper, ExternalLink } from "lucide-react";
import clsx from "clsx";

interface NewsFeedProps {
  news: NewsDigest | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  durationMs?: number | null;
  fetchedAt?: string | null;
}

const sentimentStyles: Record<string, string> = {
  BULLISH: "bg-green-900/50 text-green-300",
  NEUTRAL: "bg-slate-600 text-slate-300",
  BEARISH: "bg-red-900/50 text-red-300",
};

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-CH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function NewsFeed({ news, loading, error, onRetry, durationMs, fetchedAt }: NewsFeedProps) {
  const [filter, setFilter] = useState<"all" | "live" | "alerts">("all");

  if (loading) return <Card><CardTitle icon={Newspaper}>News Feed</CardTitle><SkeletonBlock lines={4} /></Card>;
  if (error) return <Card><CardTitle icon={Newspaper}>News Feed</CardTitle><ErrorState message={error} onRetry={onRetry} /></Card>;
  if (!news || news.articles.length === 0) return <Card><CardTitle icon={Newspaper}>News Feed</CardTitle><EmptyState message="No recent news articles" /></Card>;

  const articles = [...news.articles].sort((a, b) => b.relevanceScore - a.relevanceScore);

  const displayed = filter === "all" ? articles
    : filter === "live" ? articles.filter(a => a.sourceType === "live")
    : articles.filter(a => a.isAlert);

  const bullishCount = articles.filter(a => a.sentimentLabel === "BULLISH").length;
  const bearishCount = articles.filter(a => a.sentimentLabel === "BEARISH").length;
  const neutralCount = articles.filter(a => a.sentimentLabel === "NEUTRAL").length;
  const total = articles.length || 1;

  return (
    <Card>
      <FadeIn>
      <div className="flex items-center justify-between mb-4">
        <CardTitle icon={Newspaper}>News Feed</CardTitle>
        <span className="flex items-center gap-2">
          {fetchedAt && <span className="text-xs text-slate-600">Updated {fetchedAt}</span>}
          {durationMs != null && <span className="text-xs text-slate-600">{durationMs}ms</span>}
        </span>
      </div>
      {news && news.articles.length > 0 && (
        <div className="flex items-center gap-4 mb-3 text-xs">
          <span className="text-slate-400">{news.articles.length} articles</span>
          <span className="text-slate-400">{news.alerts.length} alerts</span>
          <span className="text-slate-400">
            {news.articles.filter(a => a.sourceType === "live").length} live
          </span>
          <span className="text-slate-400">
            Updated {new Date(news.generatedAt).toLocaleTimeString()}
          </span>
        </div>
      )}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-slate-400">Sentiment</span>
          <span className="text-xs text-green-400">{bullishCount} bullish</span>
          <span className="text-xs text-slate-400">{neutralCount} neutral</span>
          <span className="text-xs text-red-400">{bearishCount} bearish</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-700 flex overflow-hidden">
          <div className="bg-green-500 h-full" style={{ width: `${(bullishCount/total)*100}%` }} />
          <div className="bg-slate-500 h-full" style={{ width: `${(neutralCount/total)*100}%` }} />
          <div className="bg-red-500 h-full" style={{ width: `${(bearishCount/total)*100}%` }} />
        </div>
      </div>
      <div className="flex gap-2 mb-3">
        {(["all", "live", "alerts"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              filter === f
                ? "bg-six-orange text-white"
                : "bg-slate-700 text-slate-400 hover:text-slate-200"
            }`}
          >
            {f === "all" ? `All (${articles.length})` : f === "live" ? `Live (${articles.filter(a => a.sourceType === "live").length})` : `Alerts (${articles.filter(a => a.isAlert).length})`}
          </button>
        ))}
      </div>
      <div className="max-h-[400px] overflow-y-auto space-y-3">
        {displayed.map((article) => (
          <div
            key={article.id}
            className={clsx(
              "p-3 rounded-lg bg-slate-700/50 transition-all duration-200 hover:bg-slate-700",
              article.isAlert && article.alertType === "conflict" && "border-l-2 border-red-400",
              article.isAlert && article.alertType === "opportunity" && "border-l-2 border-green-400"
            )}
          >
            {article.url && article.url !== "#" && article.url !== "#scenario" && article.url !== "#cio" ? (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sm text-slate-100 hover:text-six-orange-bright transition-colors"
              >
                {article.title}
                <ExternalLink className="inline h-3 w-3 ml-1 text-slate-500" />
              </a>
            ) : (
              <p className="font-medium text-sm text-slate-100">{article.title}</p>
            )}

            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-slate-400">{article.source}</span>
              <span className="text-xs text-slate-500">{formatDate(article.publishedAt)}</span>
              <span className={clsx("text-xs px-2 py-0.5 rounded-full", sentimentStyles[article.sentimentLabel] || sentimentStyles.NEUTRAL)}>
                {article.sentimentLabel}
              </span>
              {article.sourceType === "scenario" && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-900/50 text-cyan-300">Scenario</span>
              )}
              {article.affectedPositions && article.affectedPositions.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-600 text-slate-300">
                  {article.affectedPositions.length} position{article.affectedPositions.length > 1 ? "s" : ""} affected
                </span>
              )}
            </div>

            <div className="mt-2 h-1 rounded-full bg-slate-600">
              <div
                className="h-full rounded-full bg-six-orange"
                style={{ width: `${Math.round(article.relevanceScore * 100)}%` }}
              />
            </div>

            {article.summary && (
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{article.summary}</p>
            )}
          </div>
        ))}
      </div>
      </FadeIn>
    </Card>
  );
}
