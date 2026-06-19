import { AlertTriangle, RefreshCw } from "lucide-react";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="h-12 w-12 rounded-full bg-red-900/30 flex items-center justify-center">
        <AlertTriangle className="h-6 w-6 text-red-400" />
      </div>
      <p className="text-sm text-red-300 text-center max-w-xs">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  );
}
