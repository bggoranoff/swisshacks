import type { ReactNode } from "react";

export function DashboardLayout({ sidebar, header, children }: {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] h-screen bg-slate-900 text-slate-100" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="flex flex-row overflow-x-auto h-auto border-b border-slate-700 p-2 gap-2 lg:flex-col lg:overflow-x-visible lg:h-full lg:border-b-0 lg:border-r lg:p-0 lg:gap-0">
        {sidebar}
      </div>
      <div className="flex flex-col h-screen">
        {header}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
