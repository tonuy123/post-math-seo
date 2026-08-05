/**
 * Các hằng số tập trung — bản sao của `server/config/constants.js` cho
 * client. Giữ cả hai file đồng bộ.
 */

export const ROLES = Object.freeze({
  ADMIN:   'admin',
  MANAGER: 'manager',
  STAFF:   'staff',
});

export const POST_STATUS = Object.freeze({
  DRAFT:     'draft',
  PUBLISHED: 'published',
  PRIVATE:   'private',
  TRASHED:   'trashed',
});

export const CATEGORIES = Object.freeze([
  'Technology',
  'Lifestyle',
  'Business',
  'Design',
  'Marketing',
]);

export const POST_STATUS_FILTERS = Object.freeze([
  { key: 'all',       labelKey: 'allPosts'    },
  { key: 'drafts',    labelKey: 'drafts'      },
  { key: 'published', labelKey: 'published'   },
  { key: 'private',   labelKey: 'privateTab'  },
  { key: 'trashed',   labelKey: 'trash'       },
]);

export const DEFAULT_BASE_DOMAIN = 'https://tuyensinh.quocteviet.edu.vn/';

export const MAX_FEATURED_IMAGE_BYTES = 524288; // 500 KB

export const TRASH_RETENTION_HOURS = 24;

export const POSTS_PER_PAGE = 10;