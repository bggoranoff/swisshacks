import type { ReactNode } from "react";

export function DashboardLayout({ sidebar, header, children }: {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[260px_1fr] h-screen bg-slate-900 text-slate-100" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {sidebar}
      <div className="flex flex-col h-screen">
        {header}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
