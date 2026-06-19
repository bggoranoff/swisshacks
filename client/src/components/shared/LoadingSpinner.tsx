import { Loader2 } from "lucide-react";

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
    </div>
  );
}
