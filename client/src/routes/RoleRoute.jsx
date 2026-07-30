import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

export function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const allowed = Array.isArray(roles) && !!user && roles.includes(user.role);

  useEffect(() => {
    if (!allowed) showToast(t('noPermission'), 'error');
  }, [allowed, showToast, t]);

  if (!allowed) return <Navigate to="/dashboard" replace />;
  return children;
}