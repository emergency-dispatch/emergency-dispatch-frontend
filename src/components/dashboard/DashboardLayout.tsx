import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { DispatchProvider } from '../../context/DispatchContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const DashboardLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <DispatchProvider>
      <div className="h-screen w-screen flex bg-white text-slate-900 overflow-hidden">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto cad-grid-bg">
            <Outlet />
          </main>
        </div>
      </div>
    </DispatchProvider>
  );
};
