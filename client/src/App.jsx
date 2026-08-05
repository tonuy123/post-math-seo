/**
 * Gốc của App.
 *
 * Chồng các Provider:
 *   i18n            (đã được khởi tạo qua src/i18n/index.js)
 *   AuthProvider    (JWT + người dùng)
 *   LoadingProvider (overlay)
 *   ToastProvider   (toasts)
 *   ConfirmProvider (modal xác nhận)
 *
 * Các route:
 *   /login            công khai
 *   /dashboard        yêu cầu đăng nhập
 *   /posts            yêu cầu đăng nhập (mọi vai trò)
 *   /posts/new        yêu cầu đăng nhập (mọi vai trò — admin/mgr/staff đều thay đổi được)
 *   /posts/:id/edit   yêu cầu đăng nhập (mọi vai trò)
 *   /users            yêu cầu đăng nhập + chỉ admin/manager
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
              {/* Công khai */}
              <Route path="/login" element={<Login />} />

              {/* Yêu cầu đăng nhập — bọc trong DashboardLayout */}
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