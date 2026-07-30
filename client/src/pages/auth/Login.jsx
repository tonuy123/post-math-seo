import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogIn } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input, Label } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';

export default function Login() {
  const { login } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError(t('loginErrorEmpty'));
      return;
    }
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      const dest = location.state?.from?.pathname || '/posts?filter=all';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err?.message || t('loginError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-cover bg-center"
      style={{
        backgroundImage: `url('/login-bg.jpg')`,
        backgroundColor: '#1d2327',
      }}
    >
      <div className="w-full max-w-md mx-4 p-10 rounded-2xl bg-black/25 backdrop-blur-xl border border-white/15 shadow-2xl">
        <div className="text-center mb-7">
          <div className="inline-block mb-5">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="60" height="60" rx="12" fill="#2271b1" />
              <path d="M20 18h20v4H20v-4zm0 8h20v4H20v-4zm0 8h14v4H20v-4zm0 8h20v4H20v-4z" fill="white" />
            </svg>
          </div>
          <h1 className="text-[26px] font-semibold text-white mb-2 drop-shadow">{t('cmsLogin')}</h1>
          <p className="text-sm text-white/70">{t('loginSubtitle')}</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username" className="text-white/90">{t('username')}</Label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('enterUsername')}
              required
              className="w-full px-4 py-3.5 rounded-[10px] bg-white/10 border border-white/20 text-white placeholder-white/50 text-[15px] focus:outline-none focus:bg-white/15 focus:border-white/50 focus:ring-2 focus:ring-white/10"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className="text-white/90">{t('password')}</Label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('enterPassword')}
              required
              className="w-full px-4 py-3.5 rounded-[10px] bg-white/10 border border-white/20 text-white placeholder-white/50 text-[15px] focus:outline-none focus:bg-white/15 focus:border-white/50 focus:ring-2 focus:ring-white/10"
            />
          </div>

          {error && (
            <div className="px-4 py-3 rounded-[10px] bg-wp-red/30 border border-wp-red/60 text-white text-sm text-center">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={submitting}
            leftIcon={submitting ? <Spinner size={16} className="text-white" /> : <LogIn size={16} />}
            className="w-full bg-wp-blue/90 hover:bg-wp-blue border-wp-blue"
          >
            {t('signIn')}
          </Button>
        </form>
      </div>
    </div>
  );
}