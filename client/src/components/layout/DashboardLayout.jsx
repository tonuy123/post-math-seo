import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

import { Button } from '../ui/Button';
import { UserDropdown, LanguageSelect } from './UserDropdown';

export function DashboardLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#f1f1f1]">
      <header className="bg-white border border-wp-gray rounded mx-5 mt-5 mb-5 px-5 py-3 flex items-center justify-between relative z-10 shadow-md">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-ink-primary">{t('dashboard')}</h1>
          {(location.pathname === '/posts' || location.pathname.startsWith('/dashboard')) && (
            <Button
              variant="primary"
              leftIcon={<Plus size={16} />}
              onClick={() => navigate('/posts/new')}
            >
              {t('addNew')}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelect />
          <UserDropdown />
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-5 pb-10">
        <Outlet />
      </main>
    </div>
  );
}