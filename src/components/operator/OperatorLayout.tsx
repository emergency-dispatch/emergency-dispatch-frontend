import React, { useLayoutEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { DispatchProvider } from '../../context/DispatchContext';
import { useSyncUiLanguage } from '../../services/operatorAdminLanguage';
import { restoreStoredLanguage } from '../../i18n';
import { EscalationAlert } from './EscalationAlert';
import { IncomingIncidentToasts } from './IncomingIncidentToasts';
import { OperatorAlerts } from './OperatorAlerts';
import { OperatorSidebar } from './OperatorSidebar';
import { OperatorTopbar } from './OperatorTopbar';
import { ToastHost } from '../admin/common/ToastHost';

export const OperatorLayout: React.FC = () => {
  useLayoutEffect(restoreStoredLanguage, []);
  useSyncUiLanguage();
  return (
    <DispatchProvider>
      <div className="h-screen w-screen flex flex-col bg-white text-slate-900 overflow-hidden">
        <OperatorTopbar />

        <div className="flex-1 flex min-h-0 overflow-hidden">
          <OperatorSidebar />
          <main className="flex-1 overflow-hidden cad-grid-bg">
            <Outlet />
          </main>
        </div>
      </div>
      <EscalationAlert />
      <IncomingIncidentToasts />
      <OperatorAlerts />
      <ToastHost />
    </DispatchProvider>
  );
};
