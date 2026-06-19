import clsx from "clsx";

export function ConfidenceBadge({ score }: { score: number }) {
  return (
    <span className={clsx(
      "text-xs px-2 py-0.5 rounded-full font-medium",
      score >= 0.7 ? "bg-green-900/50 text-green-300" :
      score >= 0.4 ? "bg-amber-900/50 text-amber-300" :
      "bg-red-900/50 text-red-300"
    )}>
      {Math.round(score * 100)}%
    </span>
  );
}
