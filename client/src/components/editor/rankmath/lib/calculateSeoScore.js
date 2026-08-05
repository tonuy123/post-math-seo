/**
 * calculateSeoScore(state)
 * ------------------------
 * Công cụ chấm điểm SEO theo phong cách Rank Math, có trọng số.
 *
 * Hàm thuần tuý (pure function). Không dùng React, không thao tác DOM,
 * không I/O — an toàn khi import từ test Node lẫn component React.
 *
 * Giá trị trả về:
 *   {
 *     score  : number 0..100,
 *     tone   : 'good' | 'ok' | 'bad' | 'empty',
 *     checks : Array<{ id, section, label, passed, fieldKey }>
 *   }
 *
 * Các phần (section) được dùng bởi bên tiêu thụ (<SeoChecklist />):
 *   'basic' | 'additional' | 'readability'
 *
 * HÌNH DẠNG ĐẦU VÀO (state):
 *   {
 *     focusKeywords    : string[]      // [0] = từ khoá chính, còn lại là phụ
 *     metaTitle        : string,
 *     metaDescription  : string,
 *     slug             : string,
 *     content          : string        // HTML THÔ (ví dụ thân bài TinyMCE)
 *     baseDomain?      : string        // ví dụ 'https://example.com/'
 *                                  // Dùng để phân loại liên kết Nội bộ vs
 *                                  // Ngoài. Tự rút lui (fallback) nếu thiếu.
 *   }
 *
 * TRỌNG SỐ CHẤM ĐIỂM (Tổng = 100):
 *   Cơ bản            45 điểm
 *     - Từ khoá trong Tiêu đề          15
 *     - Từ khoá trong Meta Desc        10
 *     - Từ khoá trong URL (slug)       10
 *     - Từ khoá trong 10% đầu          10
 *
 *   Bổ sung           40 điểm
 *     - Từ khoá trong H2/H3            10
 *     - Ảnh có từ khoá trong alt       10
 *     - Có liên kết nội bộ             10
 *     - Có liên kết ngoài              10
 *
 *   Khả năng đọc & Mật độ 15 điểm
 *     - Mật độ từ khoá 1%-2.5%          10
 *     - Tiêu đề chứa số                 5
 *
 *   Ngân sách 45 + 40 + 15 = 100 được cố tình siết chặt — vượt qua tất cả
 *   các tiêu chí sẽ đạt đủ 100. Mức điểm: >=80 tốt, >=50 khá, còn lại kém.
 */

import {
  SCORE_GOOD,
  SCORE_OK,
} from './seoConstants.js';

// ────────────────────────────────────────────────────────────────────────
//  Trợ giúp (helpers)
// ────────────────────────────────────────────────────────────────────────

/** Chuẩn hoá dấu tiếng Việt + chuyển chữ thường + gộp khoảng trắng.
 *  Ta tách tổ hợp dấu theo NFD để 'ố' và 'o' so sánh gần tương đương
 *  khi kết hợp với so khớp không phân biệt dấu. Rút lui về chữ thường
 *  thường khi thiếu Intl.Segmenter (trình duyệt cũ / SSR). */
function norm(s) {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // tách dấu (diacritics)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Xây dựng regex ranh giới từ từ một từ khoá. Trả về null nếu đầu vào
 *  rỗng / không an toàn cho regex. Dấu được chuẩn hoá ở cả hai bên.
 *
 *  Từ khoá nhiều từ ("nghiep vu bao mau") khớp TOÀN BỘ cụm từ
 *  như một chuỗi liên tục với khoảng trắng tuỳ ý giữa các từ —
 *  KHÔNG phải phép tuyển (disjunction) khiến chỉ riêng "nghiep"
 *  cũng đạt yêu cầu. Chính sự khác biệt đó là thứ các phiên bản
 *  trước đã làm sai. */
function buildKwRegex(keyword) {
  const normKw = norm(keyword);
  if (!normKw) return null;
  const escaped = normKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = escaped.split(/\s+/).filter(Boolean);
  // `\s+` giữa các từ cho phép khoảng trắng thay đổi; lookbehind/
  // lookahead bên ngoài vẫn ngăn "cat" khớp với "category".
  const inner = parts.length > 1
    ? `(${parts.join('\\s+')})`
    : parts[0];
  try {
    return new RegExp(`(?<![\\p{L}\\p{N}])${inner}(?![\\p{L}\\p{N}])`, 'gu');
  } catch {
    return null;
  }
}

/** Đếm số lần xuất hiện trọn từ của `keyword` trong `text`. Trả về 0 nếu
 *  đầu vào rỗng hoặc regex không hỗ trợ. Xử lý tiếng Việt bằng cách
 *  so khớp không phân biệt dấu (cả hai bên đều tách NFD). */
function countOccurrences(text, keyword) {
  const re = buildKwRegex(keyword);
  if (!re) return 0;
  // So khớp trên văn bản đã chuẩn hoá để dấu biến mất ở cả hai bên.
  const matches = norm(text).match(re);
  return matches ? matches.length : 0;
}

/** Kiểm tra sự hiện diện trọn từ. */
function exactMatch(text, keyword) {
  return countOccurrences(text, keyword) > 0;
}

/** Tách văn bản thành các từ (dùng cho mật độ từ khoá). Số cũng được tính. */
function tokeniseWords(text) {
  if (!text) return [];
  return norm(text).match(/[\p{L}\p{N}]+/gu) || [];
}

/* ─── Trích xuất cấu trúc HTML ────────────────────────────────────────
 * Ta cố ý dùng DOMParser (trình duyệt) để lấy <a>, <img> và văn bản tiêu
 * đề mà không cần kéo theo bộ phân tích HTML 200kB. Trên server / trong
 * test Node ta tự động rút lui về bộ trích xuất dựa trên regex
 * bao phủ đầu ra TinyMCE thông thường (thẻ đơn dòng, hợp lệ).
 */

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined';
}

/** Lấy toàn bộ giá trị <a href="..."> từ HTML. */
function extractAnchorHrefs(html) {
  if (!html) return [];
  if (isBrowser()) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return Array.from(doc.querySelectorAll('a[href]')).map((a) => a.getAttribute('href'));
  }
  // Rút lui bằng regex: khớp giá trị href, có thể nằm trong dấu nháy đơn hoặc kép.
  const out = [];
  const re = /<a\b[^>]*?\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1] || m[2] || m[3] || '');
  return out;
}

/** Lấy toàn bộ giá trị <img alt="..."> từ HTML. */
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

/** Lấy văn bản bên trong các tiêu đề H2 và H3 (khớp thẻ không phân biệt hoa thường). */
function extractHeadingTexts(html, levels = [2, 3]) {
  if (!html) return [];
  const tags = levels.map((l) => `h${l}`).join('|');
  if (isBrowser()) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return Array.from(doc.querySelectorAll(levels.map((l) => `h${l}`).join(','))).map((el) => el.textContent || '');
  }
  // Rút lui bằng regex: lấy toàn bộ nội dung giữa <hN ...> và </hN>.
  // Dấu | giữa các thẻ phải NẰM TRONG nhóm, không được viết dạng danh
  // sách cách nhau bằng dấu phẩy (vì chỉ khớp đúng chuỗi "h2,h3").
  const out = [];
  const re = new RegExp(`<(${tags})\\b[^>]*>([\\s\\S]*?)<\\/\\1>`, 'gi');
  let m;
  while ((m = re.exec(html))) {
    out.push(m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  }
  return out;
}

/** Bỏ thẻ HTML để lấy văn bản thường — chỉ dùng cho tính độ dài / mật độ,
 *  không dùng cho kiểm tra từ khoá (vốn dùng HTML thô để <h2><strong>kw
 *  </strong></h2> vẫn được tính là kw xuất hiện trong H2). */
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

/** Phân loại một href là nội bộ / ngoài / khác.
 *  Nội bộ: khớp host của `baseDomain` (nếu được cung cấp), HOẶC là đường
 *  dẫn tương đối, mảnh (fragment), hay liên kết tuyệt đối cùng origin. */
function classifyHref(href, baseDomain) {
  if (!href) return 'other';
  const trimmed = href.trim();

  // Bỏ qua các neo không điều hướng
  if (trimmed.startsWith('#') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) {
    return 'other';
  }

  // Đường dẫn tương đối thuần tuý -> nội bộ
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return 'internal';
  }
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    // Không có scheme (ví dụ "about", "post-1") -> coi là nội bộ
    return 'internal';
  }

  // URL tuyệt đối — so sánh host.
  if (baseDomain) {
    try {
      const baseHost = new URL(baseDomain).host.toLowerCase();
      const linkHost = new URL(trimmed).host.toLowerCase();
      if (baseHost && linkHost) {
        return baseHost === linkHost ? 'internal' : 'external';
      }
    } catch {
      /* rơi xuống */
    }
  }
  // Không có baseDomain (hoặc phân tích URL thất bại) — đoán theo khả năng tốt nhất.
  return 'external';
}

// ────────────────────────────────────────────────────────────────────────
//  Định nghĩa tiêu chí (id, section, label, fieldKey, weight, predicate)
// ────────────────────────────────────────────────────────────────────────

/** Một tiêu chí. `weight` là số điểm cộng khi `predicate` trả về true.
 *  id/label cố định để UI hiển thị nội dung nhất quán. */
function makeCheck({ id, section, label, fieldKey, weight, predicate }) {
  const passed = !!predicate();
  return { id, section, label, passed, fieldKey, weight };
}

// ────────────────────────────────────────────────────────────────────────
//  API công khai
// ────────────────────────────────────────────────────────────────────────

export function calculateSeoScore(state) {
  const focusKeywords   = state?.focusKeywords   || [];
  const metaTitle       = state?.metaTitle       || '';
  const metaDescription = state?.metaDescription || '';
  const slug            = state?.slug            || '';
  const content         = state?.content         || '';
  const baseDomain      = state?.baseDomain      || '';

  const primary = focusKeywords[0];

  // ── Nhánh trạng thái rỗng ─────────────────────────────────────────
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

  // Tính toán sẵn mọi thứ một lần mỗi lần gọi.
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

  // ── Xây dựng các tiêu chí có trọng số ──────────────────────────────
  const checks = [
    // ── Cơ bản (45 điểm) ────────────────────────────────────────────────
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

    // ── Bổ sung (40 điểm) ───────────────────────────────────────────────
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

    // ── Khả năng đọc & Mật độ (15 điểm) ─────────────────────────────────
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

  // ── Tổng hợp ──────────────────────────────────────────────────────
  // Điểm là tổng trọng số của các tiêu chí đạt. Ta chặn ở 100 vì trọng số
  // đã cộng đúng 100 (45 + 40 + 15), nhưng chặn phòng thủ giúp các điều
  // chỉnh tương lai không vô tình đẩy huy hiệu lên 120/100.
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
//  groupChecksBySection — chữ ký không đổi, giữ tại đây để bên tiêu thụ
//  import cả hai hàm trợ giúp từ cùng một module. (Cũng được re-export qua index.js.)
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