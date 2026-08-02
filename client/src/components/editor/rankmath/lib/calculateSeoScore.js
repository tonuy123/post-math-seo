/**
 * calculateSeoScore(state)
 * ------------------------
 * Weighted, Rank-Math-style SEO scoring engine.
 *
 * Pure function. No React, no DOM mutation, no I/O — safe to import
 * from Node tests and from React components alike.
 *
 * Returns:
 *   {
 *     score  : number 0..100,
 *     tone   : 'good' | 'ok' | 'bad' | 'empty',
 *     checks : Array<{ id, section, label, passed, fieldKey }>
 *   }
 *
 * Sections used by the consumer (<SeoChecklist />):
 *   'basic' | 'additional' | 'readability'
 *
 * INPUT SHAPE (state):
 *   {
 *     focusKeywords    : string[]      // [0] = primary, others = secondary
 *     metaTitle        : string,
 *     metaDescription  : string,
 *     slug             : string,
 *     content          : string        // RAW HTML (e.g. TinyMCE body)
 *     baseDomain?      : string        // e.g. 'https://example.com/'
 *                                  // Used to classify Internal vs External
 *                                  // links. Falls back gracefully if absent.
 *   }
 *
 * SCORING WEIGHTS (Total = 100):
 *   Basic            45 pts
 *     - KW in Title          15
 *     - KW in Meta Desc      10
 *     - KW in URL (slug)     10
 *     - KW in first 10%      10
 *
 *   Additional       40 pts
 *     - KW in H2/H3          10
 *     - Image with KW in alt 10
 *     - Has Internal link    10
 *     - Has External link    10
 *
 *   Readability & Density 15 pts
 *     - Keyword Density 1%-2.5%  10
 *     - Title contains number    5
 *
 *   The 45 + 40 + 15 = 100 budget is intentionally tight — passing all
 *   checks saturates the bar at 100. Tones: >=80 good, >=50 ok, else bad.
 */

import {
  SCORE_GOOD,
  SCORE_OK,
} from './seoConstants.js';

// ────────────────────────────────────────────────────────────────────────
//  Helpers
// ────────────────────────────────────────────────────────────────────────

/** Normalise Vietnamese tone marks + lower-case + collapse whitespace.
 *  We NFD-strip combining marks so 'ố' and 'o' compare equal-ish when
 *  paired with diacritic-aware matching. Falls back to plain lower-case
 *  when Intl.Segmenter is missing (older browsers / SSR). */
function norm(s) {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Build a word-boundary regex from a keyword. Returns null for empty/
 *  regex-unsafe input. Tones are normalised on both sides.
 *
 *  Multi-word keywords ("nghiep vu bao mau") match the WHOLE phrase
 *  as a contiguous run with optional whitespace between tokens —
 *  NOT a disjunction that would let "nghiep" alone satisfy the check.
 *  That distinction is exactly what previous iterations got wrong. */
function buildKwRegex(keyword) {
  const normKw = norm(keyword);
  if (!normKw) return null;
  const escaped = normKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = escaped.split(/\s+/).filter(Boolean);
  // `\s+` between tokens tolerates variable whitespace; the outer
  // lookbehind/lookahead still keep "cat" from matching "category".
  const inner = parts.length > 1
    ? `(${parts.join('\\s+')})`
    : parts[0];
  try {
    return new RegExp(`(?<![\\p{L}\\p{N}])${inner}(?![\\p{L}\\p{N}])`, 'gu');
  } catch {
    return null;
  }
}

/** Counts whole-word occurrences of `keyword` in `text`. Returns 0 for
 *  empty inputs or unsupported regex. Handles Vietnamese by
 *  diacritic-insensitive matching (both sides NFD-stripped). */
function countOccurrences(text, keyword) {
  const re = buildKwRegex(keyword);
  if (!re) return 0;
  // Match on normalised text so diacritics collapse on both sides.
  const matches = norm(text).match(re);
  return matches ? matches.length : 0;
}

/** Whole-word presence check. */
function exactMatch(text, keyword) {
  return countOccurrences(text, keyword) > 0;
}

/** Tokenise text into words (used for density). Numbers count too. */
function tokeniseWords(text) {
  if (!text) return [];
  return norm(text).match(/[\p{L}\p{N}]+/gu) || [];
}

/* ─── HTML structure extraction ────────────────────────────────────────
 * We deliberately use DOMParser (browser) so we can pull <a>, <img>, and
 * heading text without bringing in a 200kB HTML parser. On the server /
 * in Node tests we transparently fall back to a regex-based extractor
 * that covers the common TinyMCE output (well-formed, single-line tags).
 */

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined';
}

/** Pull all <a href="..."> values out of HTML. */
function extractAnchorHrefs(html) {
  if (!html) return [];
  if (isBrowser()) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return Array.from(doc.querySelectorAll('a[href]')).map((a) => a.getAttribute('href'));
  }
  // Regex fallback: matches href values, single or double quoted.
  const out = [];
  const re = /<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1] || m[2] || m[3] || '');
  return out;
}

/** Pull all <img alt="..."> values out of HTML. */
function extractImageAlts(html) {
  if (!html) return [];
  if (isBrowser()) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return Array.from(doc.querySelectorAll('img')).map((i) => i.getAttribute('alt') || '');
  }
  const out = [];
  const re = /<img\b[^>]*?\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1] || m[2] || '');
  return out;
}

/** Pull inner text of H2 and H3 headings (case-insensitive tag match). */
function extractHeadingTexts(html, levels = [2, 3]) {
  if (!html) return [];
  const tags = levels.map((l) => `h${l}`).join('|');
  if (isBrowser()) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return Array.from(doc.querySelectorAll(levels.map((l) => `h${l}`).join(','))).map((el) => el.textContent || '');
  }
  // Regex fallback: capture everything between <hN ...> and </hN>.
  // tag alternation must be INSIDE the group, not as a comma-list
  // (which would only match the literal string "h2,h3").
  const out = [];
  const re = new RegExp(`<(${tags})\\b[^>]*>([\\s\\S]*?)<\\/\\1>`, 'gi');
  let m;
  while ((m = re.exec(html))) {
    out.push(m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  }
  return out;
}

/** Strip HTML to plain text — only used for length / density math, not
 *  for keyword presence (which uses raw HTML so <h2><strong>kw</strong>
 *  </h2> still counts as kw appearing inside an H2). */
function htmlToText(html) {
  if (!html) return '';
  if (isBrowser()) {
    return (new DOMParser().parseFromString(html, 'text/html')).body.textContent || '';
  }
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Classify a single href as internal / external / other.
 *  Internal: matches `baseDomain` host (when provided), OR is a relative
 *  path, fragment, or mailto-less absolute link to the same origin. */
function classifyHref(href, baseDomain) {
  if (!href) return 'other';
  const trimmed = href.trim();

  // Skip non-navigating anchors
  if (trimmed.startsWith('#') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
    return 'other';
  }

  // Pure relative path -> internal
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return 'internal';
  }
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    // No scheme at all (e.g. "about", "post-1") -> treat as internal
    return 'internal';
  }

  // Absolute URL — compare hosts.
  if (baseDomain) {
    try {
      const baseHost = new URL(baseDomain).host.toLowerCase();
      const linkHost = new URL(trimmed).host.toLowerCase();
      if (baseHost && linkHost) {
        return baseHost === linkHost ? 'internal' : 'external';
      }
    } catch {
      /* fall through */
    }
  }
  // No baseDomain (or URL parse failed) — best-effort guess.
  return 'external';
}

// ────────────────────────────────────────────────────────────────────────
//  Check definitions (id, section, label, fieldKey, weight, predicate)
// ────────────────────────────────────────────────────────────────────────

/** One check. `weight` is how many points it adds when `predicate` returns
 *  true. The id/label are stable so the UI can render consistent copy. */
function makeCheck({ id, section, label, fieldKey, weight, predicate }) {
  const passed = !!predicate();
  return { id, section, label, passed, fieldKey, weight };
}

// ────────────────────────────────────────────────────────────────────────
//  Public API
// ────────────────────────────────────────────────────────────────────────

export function calculateSeoScore(state) {
  const focusKeywords   = state?.focusKeywords   || [];
  const metaTitle       = state?.metaTitle       || '';
  const metaDescription = state?.metaDescription || '';
  const slug            = state?.slug            || '';
  const content         = state?.content         || '';
  const baseDomain      = state?.baseDomain      || '';

  const primary = focusKeywords[0];

  // ── Empty-state branch ─────────────────────────────────────────────
  if (!primary || !primary.trim()) {
    return {
      score: 0,
      tone: 'empty',
      checks: [
        {
          id: 'has-kw',
          section: 'basic',
          label: 'Hãy thêm từ khoá chính để bắt đầu chấm điểm.',
          passed: false,
          fieldKey: 'focusKeywords',
          weight: 15,
        },
      ],
    };
  }

  // Pre-compute everything once per call.
  const titleNorm = norm(metaTitle);
  const descNorm  = norm(metaDescription);
  const slugNorm  = norm(slug);
  const bodyText  = htmlToText(content);
  const bodyNorm  = norm(bodyText);
  const words     = tokeniseWords(bodyText);
  const totalWords = words.length;

  const first10Pct = bodyNorm.slice(0, Math.max(0, Math.floor(bodyNorm.length * 0.1)));

  const headingsText = extractHeadingTexts(content, [2, 3]).join(' ');
  const headingsNorm = norm(headingsText);

  const imageAlts    = extractImageAlts(content);
  const anchorHrefs  = extractAnchorHrefs(content);

  const linkKinds = anchorHrefs.reduce(
    (acc, h) => {
      const k = classifyHref(h, baseDomain);
      if (k === 'internal') acc.internal++;
      else if (k === 'external') acc.external++;
      return acc;
    },
    { internal: 0, external: 0 },
  );

  const kwCount      = countOccurrences(bodyText, primary);
  const density      = totalWords > 0 ? (kwCount / totalWords) * 100 : 0;
  const densityOk    = density >= 1 && density <= 2.5;
  const titleHasNum  = /\d/.test(metaTitle);

  // ── Build weighted checks ──────────────────────────────────────────
  const checks = [
    // ── Basic (45 pts) ────────────────────────────────────────────────
    makeCheck({
      id: 'title-has-kw',
      section: 'basic',
      label: 'Từ khoá chính xuất hiện trong Tiêu đề SEO.',
      fieldKey: 'metaTitle',
      weight: 15,
      predicate: () => exactMatch(titleNorm, primary),
    }),
    makeCheck({
      id: 'desc-has-kw',
      section: 'basic',
      label: 'Từ khoá chính xuất hiện trong Meta description.',
      fieldKey: 'metaDescription',
      weight: 10,
      predicate: () => exactMatch(descNorm, primary),
    }),
    makeCheck({
      id: 'slug-has-kw',
      section: 'basic',
      label: 'Từ khoá chính xuất hiện trong URL (slug).',
      fieldKey: 'slug',
      weight: 10,
      predicate: () => exactMatch(slugNorm, primary),
    }),
    makeCheck({
      id: 'kw-in-first-10pct',
      section: 'basic',
      label: 'Từ khoá chính xuất hiện trong 10% nội dung đầu tiên.',
      fieldKey: 'content',
      weight: 10,
      predicate: () => first10Pct.length > 0 && exactMatch(first10Pct, primary),
    }),

    // ── Additional (40 pts) ───────────────────────────────────────────
    makeCheck({
      id: 'kw-in-headings',
      section: 'additional',
      label: 'Từ khoá chính xuất hiện trong ít nhất một thẻ H2 hoặc H3.',
      fieldKey: 'content',
      weight: 10,
      predicate: () => headingsNorm.length > 0 && exactMatch(headingsNorm, primary),
    }),
    makeCheck({
      id: 'img-alt-has-kw',
      section: 'additional',
      label: 'Có ít nhất 1 ảnh có thuộc tính alt chứa từ khoá chính.',
      fieldKey: 'content',
      weight: 10,
      predicate: () => imageAlts.some((alt) => exactMatch(alt, primary)),
    }),
    makeCheck({
      id: 'has-internal-link',
      section: 'additional',
      label: 'Bài viết chứa ít nhất 1 internal link.',
      fieldKey: 'content',
      weight: 10,
      predicate: () => linkKinds.internal > 0,
    }),
    makeCheck({
      id: 'has-external-link',
      section: 'additional',
      label: 'Bài viết chứa ít nhất 1 external link.',
      fieldKey: 'content',
      weight: 10,
      predicate: () => linkKinds.external > 0,
    }),

    // ── Readability & Density (15 pts) ────────────────────────────────
    makeCheck({
      id: 'keyword-density',
      section: 'readability',
      label:
        totalWords > 0
          ? `Mật độ từ khoá là ${density.toFixed(2)}% — nên nằm trong khoảng 1%–2.5%.`
          : 'Mật độ từ khoá chưa xác định được (bài viết trống).',
      fieldKey: 'content',
      weight: 10,
      predicate: () => densityOk,
    }),
    makeCheck({
      id: 'title-has-number',
      section: 'readability',
      label: 'Tiêu đề SEO chứa chữ số (ví dụ: "7 cách để...").',
      fieldKey: 'metaTitle',
      weight: 5,
      predicate: () => titleHasNum,
    }),
  ];

  // ── Aggregate ──────────────────────────────────────────────────────
  // Score is the sum of weights of passed checks. We cap at 100 because
  // weights already total exactly 100 (45 + 40 + 15), but defensive cap
  // means future tweaks can't accidentally push the badge into 120/100.
  const score = Math.min(
    100,
    Math.round(checks.reduce((sum, c) => sum + (c.passed ? c.weight : 0), 0)),
  );

  let tone = 'bad';
  if (score >= SCORE_GOOD) tone = 'good';
  else if (score >= SCORE_OK) tone = 'ok';

  return { score, tone, checks };
}

// ────────────────────────────────────────────────────────────────────────
//  groupChecksBySection — unchanged signature, kept here so consumers can
//  import both helpers from the same module. (Also re-exported via index.js.)
// ────────────────────────────────────────────────────────────────────────

export function groupChecksBySection(checks, sections) {
  const order = sections.map((s) => s.id);
  const out = {};
  checks.forEach((c) => {
    if (!out[c.section]) out[c.section] = [];
    out[c.section].push(c);
  });
  return order
    .filter((id) => out[id]?.length)
    .map((id) => ({ section: sections.find((s) => s.id === id), items: out[id] }));
}