import { Loader2 } from "lucide-react";

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
    </div>
  );
}

export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div className={`h-3 rounded-full bg-slate-700 animate-pulse ${className}`} />
  );
}

export function SkeletonBlock() {
  return (
    <div className="space-y-3 py-4">
      <SkeletonLine className="w-3/4" />
      <SkeletonLine className="w-full" />
      <SkeletonLine className="w-5/6" />
      <div className="flex gap-2 mt-4">
        <div className="h-6 w-16 rounded-full bg-slate-700 animate-pulse" />
        <div className="h-6 w-20 rounded-full bg-slate-700 animate-pulse" />
        <div className="h-6 w-14 rounded-full bg-slate-700 animate-pulse" />
      </div>
      <SkeletonLine className="w-2/3 mt-2" />
      <SkeletonLine className="w-full" />
    </div>
  );
}
