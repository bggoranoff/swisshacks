import type { ReactNode } from "react";
import clsx from "clsx";

export function Card({ children, className, colSpan2 }: { children: ReactNode; className?: string; colSpan2?: boolean }) {
  return (
    <div className={clsx(
      "bg-slate-800 border border-slate-700 rounded-xl p-5 shadow-sm shadow-black/10 transition-shadow duration-300 hover:shadow-md hover:shadow-black/20",
      colSpan2 && "col-span-2",
      className
    )}>
      {children}
    </div>
  );
}

export function CardTitle({ icon: Icon, children }: { icon?: any; children: ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4 flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-six-red/70" />}
      {children}
    </h2>
  );
}
