import clsx from "clsx";

export function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5" title={`${label}: ${ok ? "Connected" : "Disconnected"}`}>
      <span className="relative flex h-2 w-2">
        {ok && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-30" />}
        <span className={clsx("relative inline-flex h-2 w-2 rounded-full", ok ? "bg-green-400" : "bg-red-400")} />
      </span>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}
