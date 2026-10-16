import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { PendingReviewModal } from './components/auth/PendingReviewModal';
import { BlockedAccountModal } from './components/auth/BlockedAccountModal';

// Pages
import { UnifiedLoginPage } from './pages/UnifiedLoginPage';
import { UnifiedPortalPage } from './pages/UnifiedPortalPage';
import { DonorDashboardPage } from './pages/DonorDashboardPage';
import { RequesterDashboardPage } from './pages/RequesterDashboardPage';
import { BothDashboardPage } from './pages/BothDashboardPage';
import { DonorSearchPage } from './pages/DonorSearchPage';
import { CoordinatorWorkspacePage } from './pages/CoordinatorWorkspacePage';
import { AdminManagementPage } from './pages/AdminManagementPage';
import { NotificationCenterPage } from './pages/NotificationCenterPage';
import { ProfilePage } from './pages/ProfilePage';
import { VerifyEmailPage, ForgotPasswordPage, ResetPasswordPage } from './pages/AuthActionPages';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
  systemRoles?: string[];
}> = ({ children, allowedRoles, systemRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs font-semibold text-slate-500">
        Verifying college session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (systemRoles && !systemRoles.includes(user.systemRole)) {
    return <Navigate to={user.systemRole === 'admin' ? '/admin' : user.systemRole === 'coordinator' ? '/coordinator' : '/portal'} replace />;
  }

  const currentRole = user.portalRole || user.selectedRole;
  if (allowedRoles && !allowedRoles.includes(currentRole) && currentRole !== 'Both') {
    return <Navigate to="/portal" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const {
    pendingReviewNotice,
    setPendingReviewNotice,
    blockedNotice,
    setBlockedNotice,
  } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      {location.pathname !== '/login' && location.pathname !== '/' && <Navbar />}

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<UnifiedLoginPage />} />

          {/* Unified All-in-One Portal Login & Dashboard */}
          <Route path="/login" element={<UnifiedLoginPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/portal"
            element={
              <ProtectedRoute systemRoles={['student']}>
                <UnifiedPortalPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute systemRoles={['student']}>
                <UnifiedPortalPage />
              </ProtectedRoute>
            }
          />

          {/* Keep legacy role entry URLs on the shared email/password sign-in. */}
          <Route path="/login/donor" element={<Navigate to="/login" replace />} />
          <Route path="/login/requester" element={<Navigate to="/login" replace />} />
          <Route path="/login/both" element={<Navigate to="/login" replace />} />
          <Route path="/login/admin" element={<Navigate to="/login" replace />} />
          <Route path="/admin/sign-in" element={<Navigate to="/login" replace />} />
          <Route path="/admin/verify" element={<Navigate to="/login" replace />} />
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />

          {/* Dedicated Role Dashboards */}
          <Route
            path="/dashboard/donor"
            element={
              <ProtectedRoute systemRoles={['student']} allowedRoles={['Donor', 'Both']}>
                <DonorDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/requester"
            element={
              <ProtectedRoute systemRoles={['student']} allowedRoles={['Requester', 'Both']}>
                <RequesterDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/both"
            element={
              <ProtectedRoute systemRoles={['student']} allowedRoles={['Both']}>
                <BothDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Shared Tools */}
          <Route
            path="/donors/search"
            element={
              <ProtectedRoute>
                <DonorSearchPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/coordinator"
            element={
              <ProtectedRoute systemRoles={['coordinator', 'admin']}>
                <CoordinatorWorkspacePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute systemRoles={['admin']}>
                <AdminManagementPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationCenterPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {location.pathname !== '/login' && location.pathname !== '/' && <Footer />}

      <PendingReviewModal
        isOpen={Boolean(pendingReviewNotice)}
        onClose={() => setPendingReviewNotice(null)}
        message={pendingReviewNotice}
      />

      <BlockedAccountModal
        isOpen={Boolean(blockedNotice)}
        onClose={() => setBlockedNotice(null)}
        message={blockedNotice}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

