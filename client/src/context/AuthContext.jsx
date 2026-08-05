/**
 * Auth context — quản lý JWT và hồ sơ người dùng hiện tại.
 *
 * Khi khởi động:
 *  - Nếu có token trong localStorage, ta gọi /auth/me để làm mới thông tin người dùng.
 *  - Ngược lại ta giữ trạng thái chưa đăng nhập.
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
      // authApi.me() trả về payload đã bóc: { token, user }
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

  // Đăng ký nhận sự kiện đăng xuất 401 toàn cục do api/client.js phát
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
      // Đăng xuất phía server chỉ mang tính cố gắng; luôn xoá session cục bộ.
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