import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, LogOut, UserCog } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Avatar';

export function UserDropdown() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  if (!user) return null;

  function goAccount() {
    setOpen(false);
    navigate(user.role === 'staff' ? '/profile' : '/users');
  }

  return (
    <div ref={wrapperRef} className="relative cursor-pointer">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded bg-wp-gray hover:bg-wp-gray-dark transition text-sm font-medium text-ink-primary"
      >
        <Avatar src={user.avatar} size="sm" />
        <span>{t('welcome')}, {user.username}</span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 min-w-[220px] bg-white border border-wp-gray-dark rounded shadow-md z-[1000]">
          {/* 1. Quản lý tài khoản */}
          <button
            type="button"
            onClick={goAccount}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-wp-gray text-left text-ink-primary"
          >
            <UserCog size={16} />
            {t('manageUsers')}
          </button>

          <div className="h-px bg-wp-gray-dark" />

          {/* Logout */}
          <button
            type="button"
            onClick={async () => { setOpen(false); await logout(); navigate('/login'); }}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-wp-gray text-left text-ink-primary"
          >
            <LogOut size={16} />
            {t('logout')}
          </button>
        </div>
      )}
    </div>
  );
}

export function LanguageSelect() {
  const { i18n } = useTranslation();
  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className="px-2.5 py-1.5 rounded border border-wp-gray-dark bg-white text-sm cursor-pointer"
    >
      <option value="en">English</option>
      <option value="vi">Tiếng Việt</option>
    </select>
  );
}