/**
 * ============================================================================
 *  Application Constants (single source of truth)
 * ============================================================================
 *  Mirrors the legacy `script.js` constants block. Any module that needs a
 *  collection name, role, or retention policy must import from here.
 * ============================================================================
 */

module.exports = Object.freeze({
  // Firestore collections
  POSTS_COLLECTION: process.env.FIRESTORE_POSTS_COLLECTION || 'posts',
  USERS_COLLECTION: process.env.FIRESTORE_USERS_COLLECTION || 'users',

  // Roles
  ROLES: Object.freeze({
    ADMIN: 'admin',
    MANAGER: 'manager',
    STAFF: 'staff',
  }),

  // Image limits (Base64) — keep parity with legacy 500KB rule
  MAX_FEATURED_IMAGE_BYTES: Number(process.env.MAX_FEATURED_IMAGE_BYTES) || 524288,

  // Trash
  TRASH_RETENTION_HOURS: Number(process.env.TRASH_RETENTION_HOURS) || 24,

  // Domain (legacy hard-coded value)
  DEFAULT_BASE_DOMAIN:
    process.env.DEFAULT_BASE_DOMAIN || 'https://tuyensinh.quocteviet.edu.vn/',

  // Post status values
  POST_STATUS: Object.freeze({
    DRAFT: 'draft',
    PUBLISHED: 'published',
    PRIVATE: 'private',
    TRASHED: 'trashed',
  }),

  // Categories (mirrored from legacy index.html checkbox list)
  CATEGORIES: Object.freeze([
    'Technology',
    'Lifestyle',
    'Business',
    'Design',
    'Marketing',
  ]),

  // Seed admin (only created on first boot if no admin user exists)
  SEED_ADMIN_USERNAME: process.env.SEED_ADMIN_USERNAME || 'admin',
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || 'admin123',
});