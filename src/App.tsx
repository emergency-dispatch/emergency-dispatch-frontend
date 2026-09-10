import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RoleRoute } from './routes/RoleRoute';
import { UserRole } from './types/auth';

import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { UnauthorizedPage } from './pages/auth/UnauthorizedPage';

import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { LiveMapPage } from './pages/dashboard/command-center/LiveMapPage';
import { IncidentQueuePage } from './pages/dashboard/command-center/IncidentQueuePage';
import { AnalyticsPage } from './pages/dashboard/command-center/AnalyticsPage';
import { StationsPage } from './pages/dashboard/backoffice/StationsPage';
import { VehiclesPage } from './pages/dashboard/backoffice/VehiclesPage';
import { AccountsPage } from './pages/dashboard/backoffice/AccountsPage';
import { EscalationConfigPage } from './pages/dashboard/backoffice/EscalationConfigPage';
import { StaffPage } from './pages/staff/StaffPage';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/signup" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Staff Field Operations Portal (Protected: RescueStaff, Admin) */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={[UserRole.RescueStaff, UserRole.Admin]}>
                  <StaffPage />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          {/* Operator Command Center (Protected: Operator, Admin) & Backoffice (Protected: Admin only) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={[UserRole.Operator, UserRole.Admin]}>
                  <DashboardLayout />
                </RoleRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="command-center/live-map" replace />} />
            <Route path="command-center/live-map" element={<LiveMapPage />} />
            <Route path="command-center/incidents" element={<IncidentQueuePage />} />
            <Route path="command-center/analytics" element={<AnalyticsPage />} />

            <Route element={<RoleRoute allowedRoles={[UserRole.Admin]} />}>
              <Route path="backoffice/stations" element={<StationsPage />} />
              <Route path="backoffice/vehicles" element={<VehiclesPage />} />
              <Route path="backoffice/accounts" element={<AccountsPage />} />
              <Route path="backoffice/escalation" element={<EscalationConfigPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
