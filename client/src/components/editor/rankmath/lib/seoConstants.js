/**
 * Hằng số cho công cụ chấm điểm SEO.
 * Tập trung mọi số "ma thuật" vào một chỗ để dễ tinh chỉnh mà không
 * phải tìm kiếm khắp các component.
 */

/** Khoảng chiều dài khuyến nghị cho đoạn trích SERP trên Google. */
export const TITLE_MIN = 40;
export const TITLE_MAX = 60;
export const DESC_MIN  = 110;
export const DESC_MAX  = 160;

/** Ngưỡng điểm (0-100). Quyết định màu huy hiệu. */
export const SCORE_GOOD = 80;
export const SCORE_OK   = 50;

/**
 * Các phần (section) được dùng bởi <SeoChecklist />. Thứ tự quan trọng —
 * nó quyết định thứ tự hiển thị bên trong thẻ checklist.
 */
export const CHECKLIST_SECTIONS = [
  {
    id: 'basic',
    labelKey: 'seoSectionBasic',           // "SEO cơ bản"
  },
  {
    id: 'additional',
    labelKey: 'seoSectionAdditional',      // "Bổ sung"
  },
  {
    id: 'readability',
    labelKey: 'seoSectionReadability',     // "Có thể đọc được"
  },
];

/** Định nghĩa tab cho <SeoTabs />. */
export const SEO_TABS = [
  { id: 'overview', labelKey: 'seoTabOverview' },   // "Tổng quan"
  { id: 'advanced', labelKey: 'seoTabAdvanced' },   // "Nâng cao"
  { id: 'schema',   labelKey: 'seoTabSchema'   },   // "Schema"
  { id: 'social',   labelKey: 'seoTabSocial'   },   // "Mạng xã hội"
];
