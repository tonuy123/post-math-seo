import { api } from './client';

// Backend response wrapper: { success, message, data: {...} }.
// `r.data` is the axios body, so `r.data.data` is the payload.
const body = (r) => r?.data?.data;

export const postsApi = {
  list:  (params)         => api.get('/posts', { params }).then(body),
  get:   (id)             => api.get(`/posts/${id}`).then(body),
  create:(data)           => api.post('/posts', data).then(body),
  update:(id, data)       => api.put(`/posts/${id}`, data).then(body),
  trash: (id)             => api.post(`/posts/${id}/trash`).then(body),
  restore:(id)            => api.post(`/posts/${id}/restore`).then(body),
  remove:(id)             => api.delete(`/posts/${id}`).then(body),
  bulk:  (action, ids)    => api.post('/posts/bulk', { action, ids }).then(body),
};
