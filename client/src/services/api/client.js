/**
 * Axios API client (bọc axios cho toàn bộ request).
 * - baseURL được lấy từ VITE_API_BASE_URL (mặc định "/api/v1")
 * - Tự gắn Authorization: Bearer <token> khi có
 * - Chuẩn hoá lỗi thành { status, message, raw }
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

    // 401 trên toàn cục: xoá token và phát sự kiện đăng xuất để mọi
    // store đã đăng ký (ví dụ AuthContext) có thể đánh giá lại ngay lập tức.
    if (status === 401) {
      tokenStore.clear();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
    }

    return Promise.reject({ status, message, raw: error });
  }
);

