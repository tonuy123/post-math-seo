/**
 * Auth context — owns the JWT and current user profile.
 *
 * On boot:
 *  - If a token is in localStorage, we call /auth/me to refresh the user.
 *  - Otherwise we stay logged-out.
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../services/api/users';
import { tokenStore } from '../services/storage';

const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(tokenStore.getUser());
  const [token, setToken]     = useState(tokenStore.getToken());
  const [loading, setLoading] = useState(!!tokenStore.getToken());

  const refresh = useCallback(async () => {
    if (!tokenStore.getToken()) {
      setLoading(false);
      return null;
    }
    try {
      // authApi.me() returns the unwrapped payload: { token, user }
      const payload = await authApi.me();
      const fetchedUser = payload?.user;

      if (!fetchedUser) {
        throw new Error('Auth payload missing user');
      }

      tokenStore.setUser(fetchedUser);
      setUser(fetchedUser);
      return fetchedUser;
    } catch {
      tokenStore.clear();
      setUser(null);
      setToken(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Subscribe to the global 401 logout event broadcast by api/client.js
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onForcedLogout = () => {
      tokenStore.clear();
      setUser(null);
      setToken(null);
    };
    window.addEventListener('auth:logout', onForcedLogout);
    return () => window.removeEventListener('auth:logout', onForcedLogout);
  }, []);

  // FIX LỖI: Móc đúng vào lỗ .data của thằng Backend trả về
  const login = useCallback(async (username, password) => {
    const payload = await authApi.login(username, password);

    if (!payload?.token || !payload?.user) {
      throw new Error('Server did not return token or user');
    }

    const { token: tk, user: u } = payload;

    tokenStore.setToken(tk);
    tokenStore.setUser(u);
    setToken(tk);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // Server-side logout is best-effort; always clear local session.
      // eslint-disable-next-line no-console
      console.warn('logout request failed:', e?.message);
    }
    tokenStore.clear();
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user,
      loading,
      login,
      logout,
      refresh,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}