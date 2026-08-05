/**
 * ============================================================================
 *  Hằng số ứng dụng (nguồn sự thật duy nhất)
 * ============================================================================
 *  Mirror lại khối constants của `script.js` bản cũ. Mọi module cần tên
 *  collection, role, hoặc chính sách lưu giữ phải import từ đây.
 * ============================================================================
 */

module.exports = Object.freeze({
  // Các collection Firestore
  POSTS_COLLECTION: process.env.FIRESTORE_POSTS_COLLECTION || 'posts',
  USERS_COLLECTION: process.env.FIRESTORE_USERS_COLLECTION || 'users',

  // Các role
  ROLES: Object.freeze({
    ADMIN: 'admin',
    MANAGER: 'manager',
    STAFF: 'staff',
  }),

  // Giới hạn ảnh (Base64) — giữ đồng nhất với quy tắc 500KB bản cũ
  MAX_FEATURED_IMAGE_BYTES: Number(process.env.MAX_FEATURED_IMAGE_BYTES) || 524288,

  // Thùng rác
  TRASH_RETENTION_HOURS: Number(process.env.TRASH_RETENTION_HOURS) || 24,

  // Domain (giá trị hard-code từ bản cũ)
  DEFAULT_BASE_DOMAIN:
    process.env.DEFAULT_BASE_DOMAIN || 'https://tuyensinh.quocteviet.edu.vn/',

  // Các giá trị trạng thái post
  POST_STATUS: Object.freeze({
    DRAFT: 'draft',
    PUBLISHED: 'published',
    PRIVATE: 'private',
    TRASHED: 'trashed',
  }),

  // Categories (mirror từ danh sách checkbox của index.html bản cũ)
  CATEGORIES: Object.freeze([
    'Technology',
    'Lifestyle',
    'Business',
    'Design',
    'Marketing',
  ]),

  // Seed admin (chỉ tạo ở lần khởi động đầu nếu chưa tồn tại admin user nào).
  // Password BẮT BUỘC đọc từ process.env — không có default hardcode.
  // Server sẽ từ chối seed nếu thiếu SEED_ADMIN_PASSWORD.
  SEED_ADMIN_USERNAME: process.env.SEED_ADMIN_USERNAME || 'admin',
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD,
});