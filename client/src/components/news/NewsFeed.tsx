import type { NewsDigest } from "../../types/api";
import { Card, CardTitle } from "../shared/Card";
import { SkeletonBlock } from "../shared/LoadingSpinner";
import { ErrorState } from "../shared/ErrorState";
import { EmptyState } from "../shared/EmptyState";
import { Newspaper } from "lucide-react";
import clsx from "clsx";

interface NewsFeedProps {
  news: NewsDigest | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
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

export function NewsFeed({ news, loading, error, onRetry }: NewsFeedProps) {
  if (loading) return <Card><CardTitle icon={Newspaper}>News Feed</CardTitle><SkeletonBlock /></Card>;
  if (error) return <Card><CardTitle icon={Newspaper}>News Feed</CardTitle><ErrorState message={error} onRetry={onRetry} /></Card>;
  if (!news || news.articles.length === 0) return <Card><CardTitle icon={Newspaper}>News Feed</CardTitle><EmptyState message="No recent news articles" /></Card>;

  const articles = [...news.articles].sort((a, b) => b.relevanceScore - a.relevanceScore);

  return (
    <Card>
      <CardTitle icon={Newspaper}>News Feed</CardTitle>
      <div className="max-h-[400px] overflow-y-auto space-y-3">
        {articles.map((article) => (
          <div
            key={article.id}
            className={clsx(
              "p-3 rounded-lg bg-slate-700/50 transition-all duration-200 hover:bg-slate-700",
              article.isAlert && article.alertType === "conflict" && "border-l-2 border-red-400",
              article.isAlert && article.alertType === "opportunity" && "border-l-2 border-green-400"
            )}
          >
            {article.url ? (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sm text-slate-100 hover:text-blue-400 transition-colors"
              >
                {article.title}
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
            </div>

            <div className="mt-2 h-1 rounded-full bg-slate-600">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${Math.round(article.relevanceScore * 100)}%` }}
              />
            </div>

            {article.summary && (
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{article.summary}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
