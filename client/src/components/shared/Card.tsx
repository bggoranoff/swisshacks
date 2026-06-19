import type { ReactNode } from "react";
import clsx from "clsx";

export function Card({ children, className, colSpan2 }: { children: ReactNode; className?: string; colSpan2?: boolean }) {
  return (
    <div className={clsx("bg-slate-800 border border-slate-700 rounded-xl p-5", colSpan2 && "col-span-2", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ icon: Icon, children }: { icon?: any; children: ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4 flex items-center">
      {Icon && <Icon className="h-4 w-4 mr-2 text-slate-400" />}
      {children}
    </h2>
  );
}
