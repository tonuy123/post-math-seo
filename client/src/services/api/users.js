import { api } from './client';

// Vỏ bọc phản hồi của backend: { success, message, data: {...} }.
// `r.data` là body của axios, nên `r.data.data` mới là payload.
const body = (r) => r?.data?.data;

export const usersApi = {
  list:  ()         => api.get('/users').then(body),
  create:(data)     => api.post('/users', data).then(body),
  update:(id, data) => api.put(`/users/${id}`, data).then(body),
  remove:(id)       => api.delete(`/users/${id}`).then(body),
};

export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }).then(body),
  me:    ()                   => api.get('/auth/me').then(body),
  logout:()                   => api.post('/auth/logout').then(() => true).catch(() => true),
};