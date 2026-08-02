/**
 * Constants for the SEO scoring engine.
 * Keep all magic numbers in one place so they can be tuned without
 * hunting through components.
 */

/** Recommended length ranges for Google SERP snippets. */
export const TITLE_MIN = 40;
export const TITLE_MAX = 60;
export const DESC_MIN  = 110;
export const DESC_MAX  = 160;

/** Score thresholds (0-100). Drives the badge colour. */
export const SCORE_GOOD = 80;
export const SCORE_OK   = 50;

/**
 * Sections used by <SeoChecklist />. Order matters — it dictates the
 * render order inside the checklist card.
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

/** Tab definitions for <SeoTabs />. */
export const SEO_TABS = [
  { id: 'overview', labelKey: 'seoTabOverview' },   // "Tổng quan"
  { id: 'advanced', labelKey: 'seoTabAdvanced' },   // "Nâng cao"
  { id: 'schema',   labelKey: 'seoTabSchema'   },   // "Schema"
  { id: 'social',   labelKey: 'seoTabSocial'   },   // "Mạng xã hội"
];
