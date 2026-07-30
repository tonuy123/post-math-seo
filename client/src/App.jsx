/**
 * App root.
 *
 * Provider stack:
 *   i18n            (already initialized via src/i18n/index.js)
 *   AuthProvider    (JWT + user)
 *   LoadingProvider (overlay)
 *   ToastProvider   (toasts)
 *   ConfirmProvider (modal confirms)
 *
 * Routes:
 *   /login            public
 *   /dashboard        protected
 *   /posts            protected (any role)
 *   /posts/new        protected (any role — admin/mgr/staff can mutate)
 *   /posts/:id/edit   protected (any role)
 *   /users            protected + admin/manager only
 */
import './i18n';

import { Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import { LoadingProvider } from './context/LoadingContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';

import { ProtectedRoute } from './routes/ProtectedRoute';
import { RoleRoute } from './routes/RoleRoute';

import { DashboardLayout } from './components/layout/DashboardLayout';
import Login from './pages/auth/Login';
import PostsList from './pages/posts/PostsList';
import PostEditor from './pages/posts/PostEditor';
import UserManagement from './pages/users/UserManagement';
import MyProfile from './pages/users/MyProfile';

import { ROLES } from './utils/constants';

export default function App() {
  return (
    <AuthProvider>
      <LoadingProvider>
        <ToastProvider>
          <ConfirmProvider>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />

              {/* Protected — wrapped in DashboardLayout */}
              <Route
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Navigate to="/posts?filter=all" replace />} />
                <Route path="/posts" element={<PostsList />} />
                <Route path="/posts/new" element={<PostEditor />} />
                <Route path="/posts/:id/edit" element={<PostEditor />} />
                <Route path="/posts/:id/restore" element={<PostEditor />} />
                <Route
                  path="/users"
                  element={
                    <RoleRoute roles={[ROLES.ADMIN, ROLES.MANAGER]}>
                      <UserManagement />
                    </RoleRoute>
                  }
                />
                <Route path="/profile" element={<MyProfile />} />
              </Route>

              <Route path="/" element={<Navigate to="/posts?filter=all" replace />} />
              <Route path="*" element={<Navigate to="/posts?filter=all" replace />} />
            </Routes>
          </ConfirmProvider>
        </ToastProvider>
      </LoadingProvider>
    </AuthProvider>
  );
}