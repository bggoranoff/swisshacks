import clsx from "clsx";

export function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5" title={`${label}: ${ok ? "Connected" : "Disconnected"}`}>
      <span className={clsx("h-2 w-2 rounded-full", ok ? "bg-green-400" : "bg-red-400")} />
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}
