/**
 * Axios API client.
 * - baseURL is taken from VITE_API_BASE_URL (defaults to "/api/v1")
 * - Auto-attaches Authorization: Bearer <token> when available
 * - Normalizes errors into { status, message, raw }
 */
import axios from 'axios';
import { tokenStore } from '../storage';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = tokenStore.getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Request failed';

    // 401 globally: clear token and broadcast a logout event so any
    // subscribed store (e.g. AuthContext) can re-evaluate immediately.
    if (status === 401) {
      tokenStore.clear();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
    }

    return Promise.reject({ status, message, raw: error });
  }
);

