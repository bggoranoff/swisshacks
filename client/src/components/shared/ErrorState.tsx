import { AlertTriangle } from "lucide-react";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6">
      <AlertTriangle className="h-6 w-6 text-red-400" />
      <p className="text-sm text-red-300">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-xs text-blue-400 hover:underline">Retry</button>
      )}
    </div>
  );
}
