import type { HomeSourceArticle, HomeTodo } from "../types/api";

export const todoSeverityPills: Record<HomeTodo["severity"], { className: string; label: string; rank: number }> = {
  high: {
    className: "bg-red-500/15 text-red-500 border-red-500/40",
    label: "High",
    rank: 3,
  },
  medium: {
    className: "bg-amber-500/15 text-amber-600 border-amber-500/40",
    label: "Medium",
    rank: 2,
  },
  low: {
    className: "bg-blue-500/15 text-blue-500 border-blue-500/40",
    label: "Low",
    rank: 1,
  },
};

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

export function firstSentence(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  const sentence = normalized.match(/^(.+?[.!?])(\s|$)/)?.[1] ?? normalized;
  return sentence.length > 180 ? `${sentence.slice(0, 177).trim()}...` : sentence;
}

export function maxTodoRelevance(todo: HomeTodo): number {
  return Math.max(0, ...todo.affectedClients.map(client => client.relevanceScore));
}

export function topTodoSources(todo: HomeTodo, limit = 3): HomeSourceArticle[] {
  const sourceArticles = todo.sourceArticles?.length ? todo.sourceArticles : [todo.sourceArticle];

  return [...sourceArticles]
    .filter(Boolean)
    .sort((a, b) => b.relevanceScore - a.relevanceScore || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, limit);
}
