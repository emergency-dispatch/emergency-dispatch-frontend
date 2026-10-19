import React, { lazy } from 'react';
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
import { StaffPage } from './pages/staff/StaffPage';
import { AdminLayout } from './components/admin/AdminLayout';

// Các trang /admin tách bundle riêng — Suspense nằm trong AdminLayout.
const AdminPlaceholderPage = lazy(() => import('./pages/admin/AdminPlaceholderPage'));
const AdminStationsPage = lazy(() => import('./pages/admin/StationsPage'));
const AdminVehiclesPage = lazy(() => import('./pages/admin/VehiclesPage'));
const AdminAccountsPage = lazy(() => import('./pages/admin/AccountsPage'));
const AdminEscalationSettingsPage = lazy(() => import('./pages/admin/EscalationSettingsPage'));
const AdminDispatchSettingsPage = lazy(() => import('./pages/admin/DispatchSettingsPage'));

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

          {/* Operator Command Center (Protected: Operator only — Admin được chuyển về /admin) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleRoute
                  allowedRoles={[UserRole.Operator]}
                  redirectByRole={{ [UserRole.Admin]: '/admin/overview' }}
                >
                  <DashboardLayout />
                </RoleRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="command-center/live-map" replace />} />
            <Route path="command-center/live-map" element={<LiveMapPage />} />
            <Route path="command-center/incidents" element={<IncidentQueuePage />} />
          </Route>

          {/* Admin Portal (Protected: Admin only) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={[UserRole.Admin]}>
                  <AdminLayout />
                </RoleRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<AdminPlaceholderPage />} />
            <Route path="stations" element={<AdminStationsPage />} />
            <Route path="vehicles" element={<AdminVehiclesPage />} />
            <Route path="shifts" element={<AdminPlaceholderPage />} />
            <Route path="accounts" element={<AdminAccountsPage />} />
            <Route path="citizens" element={<AdminPlaceholderPage />} />
            <Route path="blocked-numbers" element={<AdminPlaceholderPage />} />
            <Route path="settings/escalation" element={<AdminEscalationSettingsPage />} />
            <Route path="settings/dispatch" element={<AdminDispatchSettingsPage />} />
            <Route path="audit-trail" element={<AdminPlaceholderPage />} />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
