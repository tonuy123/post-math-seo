/**
 * scripts/generate-static.js
 *
 * Sinh toàn bộ trang public tĩnh (blog + sitemap + robots) từ Firestore.
 * Đây là bước quan trọng để "Rank Math SEO" chạy thật trên Google:
 * mọi SEO data (metaTitle, metaDescription, canonical, robots, OG,
 * JSON-LD schema) được in thẳng vào source HTML — Googlebot đọc được
 * mà không cần chạy JavaScript.
 *
 * Cách dùng:
 *   node scripts/generate-static.js                  # output → ./build-public
 *   node scripts/generate-static.js --out ./dist     # output tùy chỉnh
 *
 * Sau đó upload thư mục output lên cPanel: node scripts/deploy-ftp.js
 */
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { initializeFirebase, getDb } = require('../config/firebase');
const { POSTS_COLLECTION, DEFAULT_BASE_DOMAIN } = require('../config/constants');

// ─────────────────────────────────────────────────────────────────────
//  Config
// ─────────────────────────────────────────────────────────────────────
const BASE_URL = (process.env.PUBLIC_BASE_URL || DEFAULT_BASE_DOMAIN).replace(/\/+$/, '');
const SITE_NAME = process.env.PUBLIC_SITE_NAME || 'Tuyển Sinh Thạc Sĩ - Tập đoàn Quốc Tế Việt';

function parseArgs() {
  const args = { out: path.join(__dirname, '..', 'build-public') };
  process.argv.slice(2).forEach((a) => {
    if (a.startsWith('--out=')) args.out = path.resolve(a.slice(6));
  });
  return args;
}

// ─────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s) {
  return escapeHtml(s);
}

/** URL-encode slug để link/sitemap hợp lệ (slug có thể chứa dấu tiếng Việt). */
function encodeUrlPath(s) {
  return String(s ?? '')
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('vi-VN', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return ''; }
}

/** Lấy 1 field từ seo object với nhiều tên legacy khác nhau. */
function seoField(seo, ...keys) {
  if (!seo) return '';
  for (const k of keys) {
    if (seo[k] !== undefined && seo[k] !== null && String(seo[k]).trim() !== '') {
      return seo[k];
    }
  }
  return '';
}

// ─────────────────────────────────────────────────────────────────────
//  Image pipeline: tách Base64 data URL ra thành file thật
// ─────────────────────────────────────────────────────────────────────
const MIME_EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
};

function decodeDataUrl(dataUrl) {
  const m = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl || '');
  if (!m) return null;
  const ext = MIME_EXT[m[1].toLowerCase()] || null;
  if (!ext) return null;
  try {
    return { ext, buffer: Buffer.from(m[2], 'base64') };
  } catch { return null; }
}

/**
 * Giải mã ảnh Base64 trong content HTML (ảnh dán thẳng vào TinyMCE)
 * thành file tĩnh rồi rewrite src → relative path.
 */
function extractContentImages(content, slug, outRoot) {
  if (!content) return content;
  const assetDir = path.join(outRoot, 'assets', 'blog', slug);
  const regex = /src\s*=\s*(["'])data:([^;,]+);base64,([^"']+)\1/g;
  let html = String(content);
  let n = 0;
  let match;
  while ((match = regex.exec(html))) {
    const ext = MIME_EXT[match[2].toLowerCase()];
    if (!ext) continue;
    let buffer;
    try { buffer = Buffer.from(match[3], 'base64'); } catch { continue; }
    if (!buffer.length) continue;
    n += 1;
    const fileName = `img-${n}.${ext}`;
    fs.mkdirSync(assetDir, { recursive: true });
    fs.writeFileSync(path.join(assetDir, fileName), buffer);
    const rel = `../../assets/blog/${encodeUrlPath(slug)}/${fileName}`;
    html = html.replace(match[0], `src="${rel}"`);
  }
  return html;
}

/** Trích featuredImage (Base64 hoặc URL tuyệt đối) về file/URL công khai. */
function saveFeaturedImage(featuredImage, slug, outRoot) {
  if (!featuredImage) return null;
  if (featuredImage.startsWith('data:')) {
    const decoded = decodeDataUrl(featuredImage);
    if (!decoded) return null;
    const assetDir = path.join(outRoot, 'assets', 'blog', slug);
    fs.mkdirSync(assetDir, { recursive: true });
    const fileName = `featured.${decoded.ext}`;
    fs.writeFileSync(path.join(assetDir, fileName), decoded.buffer);
    return `../../assets/blog/${encodeUrlPath(slug)}/${fileName}`;
  }
  // URL tuyệt đối có sẵn — dùng nguyên
  return featuredImage;
}

function absUrl(relPath) {
  if (!relPath) return '';
  if (/^https?:\/\//i.test(relPath)) return relPath;
  return `${BASE_URL}/${relPath.replace(/^\/+/, '')}`;
}

// ─────────────────────────────────────────────────────────────────────
//  Meta tags builder
// ─────────────────────────────────────────────────────────────────────
function buildRobotsMeta(seo) {
  const robots = seo?.robots ?? {};
  const advanced = seo?.advanced ?? {};
  const tokens = [];

  const noIndex = robots.noIndex === true || robots.index === false;
  tokens.push(noIndex ? 'noindex' : 'index');
  tokens.push(robots.nofollow === true ? 'nofollow' : 'follow');
  if (robots.noArchive === true) tokens.push('noarchive');
  if (robots.noSnippet === true) tokens.push('nosnippet');
  if (robots.noImageIndex === true) tokens.push('noimageindex');
  const maxSnippet = Number(advanced.maxSnippet);
  if (!Number.isNaN(maxSnippet) && maxSnippet >= 0) tokens.push(`max-snippet:${maxSnippet}`);
  const maxImage = advanced.maxImagePreview;
  if (maxImage === 'small' || maxImage === 'standard' || maxImage === 'large') {
    tokens.push(`max-image-preview:${maxImage}`);
  }
  return tokens.join(', ');
}

function buildJsonLd(post, meta, absPostUrl, featuredAbs) {
  const type = (post.seo?.schemaType || 'article').toLowerCase();
  const base = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: meta.title,
    description: meta.description,
    image: featuredAbs ? [featuredAbs] : [],
    author: { '@type': 'Person', name: post.author || 'Admin' },
    publisher: { '@type': 'Organization', name: SITE_NAME },
    mainEntityOfPage: { '@type': 'WebPage', '@id': absPostUrl },
    datePublished: post.createdAt ? new Date(post.createdAt).toISOString() : undefined,
    dateModified: post.updatedAt ? new Date(post.updatedAt).toISOString() : undefined,
    keywords: Array.isArray(post.tags) ? post.tags.join(', ') : undefined,
    articleSection: Array.isArray(post.categories) ? post.categories.join(', ') : undefined,
  };

  switch (type) {
    case 'product':
      return { ...base, '@type': 'Product', name: meta.title, description: meta.description };
    case 'event':
      return { ...base, '@type': 'Event', name: meta.title, description: meta.description };
    case 'recipe':
      return { ...base, '@type': 'Recipe', name: meta.title, description: meta.description };
    default:
      return base;
  }
}

function buildMetaTags(post, postUrl, featuredRel) {
  const seo = post.seo || {};
  const title = seoField(seo, 'metaTitle', 'seoTitle') || post.title || '';
  const description = seoField(seo, 'metaDescription', 'seoDescription') || post.excerpt || '';
  const canonical = seoField(seo, 'canonicalUrl') || postUrl;
  const socialTitle = seoField(seo, 'socialTitle') || title;
  const socialDesc = seoField(seo, 'socialDescription') || description;
  const socialImage = seoField(seo, 'socialImage');
  const featuredAbs = absUrl(featuredRel);
  const ogImage = socialImage || featuredAbs;
  const robots = buildRobotsMeta(seo);
  const jsonLd = buildJsonLd(post, { title, description }, canonical, ogImage);

  const ogLocale = 'vi_VN';
  return {
    title,
    description,
    canonical,
    robots,
    og: {
      site_name: SITE_NAME,
      locale: ogLocale,
      type: 'article',
      title: socialTitle,
      description: socialDesc,
      url: canonical,
      image: ogImage,
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: socialTitle,
      description: socialDesc,
      image: ogImage,
    },
    jsonLd: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
  };
}

// ─────────────────────────────────────────────────────────────────────
//  Page templates
// ─────────────────────────────────────────────────────────────────────
const PAGE_CSS = `
  :root { --ink:#1f2937; --muted:#6b7280; --line:#e5e7eb; --brand:#1e40af; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: 'Open Sans', system-ui, -apple-system, sans-serif; color:var(--ink); background:#fff; line-height:1.7; }
  .site-header { border-bottom:1px solid var(--line); }
  .site-header .inner { max-width:820px; margin:0 auto; padding:16px 20px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .site-header a { text-decoration:none; color:var(--brand); font-weight:700; font-size:18px; }
  .site-header nav a { color:var(--ink); font-weight:500; font-size:14px; }
  main { max-width:820px; margin:0 auto; padding:32px 20px 64px; }
  .post-hero img { width:100%; max-height:420px; object-fit:cover; border-radius:10px; }
  .post-meta { color:var(--muted); font-size:14px; margin:10px 0 4px; }
  .post-categories { margin:0 0 6px; }
  .post-categories a { color:var(--brand); font-size:13px; text-decoration:none; margin-right:8px; }
  .post-content img { max-width:100%; height:auto; border-radius:8px; }
  .post-content h2 { margin-top:2em; }
  .post-list { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
  .post-card { border:1px solid var(--line); border-radius:10px; overflow:hidden; text-decoration:none; color:inherit; display:block; transition:box-shadow .15s; }
  .post-card:hover { box-shadow:0 6px 18px rgba(0,0,0,.08); }
  .post-card img { width:100%; height:180px; object-fit:cover; display:block; }
  .post-card .body { padding:14px 16px; }
  .post-card h3 { margin:0 0 6px; font-size:17px; line-height:1.4; }
  .post-card p { margin:0; color:var(--muted); font-size:14px; }
  .post-card time { color:var(--muted); font-size:12px; }
  .site-footer { border-top:1px solid var(--line); padding:24px 20px; text-align:center; color:var(--muted); font-size:13px; }
  @media (max-width:640px) { .post-list { grid-template-columns:1fr; } }
`;

function renderPostPage(post, meta, featuredRel, contentHtml) {
  const postUrl = `${BASE_URL}/blog/${encodeUrlPath(post.slug)}/`;
  const date = formatDate(post.createdAt);
  const categories = (post.categories || [])
    .map((c) => `<a href="${BASE_URL}/blog/?category=${encodeUrlPath(c)}">${escapeHtml(c)}</a>`)
    .join('');
  const tags = (post.tags || [])
    .map((t) => `<a href="${BASE_URL}/blog/?tag=${encodeUrlPath(t)}">#${escapeHtml(t)}</a>`)
    .join(' ');

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(meta.title)}</title>
<meta name="description" content="${escapeAttr(meta.description)}" />
<meta name="robots" content="${escapeAttr(meta.robots)}" />
<link rel="canonical" href="${escapeAttr(meta.canonical)}" />
<meta property="og:site_name" content="${escapeAttr(meta.og.site_name)}" />
<meta property="og:locale" content="${meta.og.locale}" />
<meta property="og:type" content="${meta.og.type}" />
<meta property="og:title" content="${escapeAttr(meta.og.title)}" />
<meta property="og:description" content="${escapeAttr(meta.og.description)}" />
<meta property="og:url" content="${escapeAttr(meta.og.url)}" />
${meta.og.image ? `<meta property="og:image" content="${escapeAttr(meta.og.image)}" />` : ''}
<meta name="twitter:card" content="${meta.twitter.card}" />
<meta name="twitter:title" content="${escapeAttr(meta.twitter.title)}" />
<meta name="twitter:description" content="${escapeAttr(meta.twitter.description)}" />
${meta.twitter.image ? `<meta name="twitter:image" content="${escapeAttr(meta.twitter.image)}" />` : ''}
<script type="application/ld+json">${meta.jsonLd}</script>
<style>${PAGE_CSS}</style>
</head>
<body>
<header class="site-header">
  <div class="inner">
    <a href="${BASE_URL}/">${escapeHtml(SITE_NAME)}</a>
    <nav><a href="${BASE_URL}/blog/">Tin tức</a></nav>
  </div>
</header>
<main>
  <article>
    <header>
      <h1>${escapeHtml(post.title)}</h1>
      <p class="post-meta">
        ${date ? `<time datetime="${escapeAttr(post.createdAt || '')}">${escapeHtml(date)}</time>` : ''}
        ${post.author ? ` · ${escapeHtml(post.author)}` : ''}
      </p>
      <p class="post-categories">${categories}</p>
    </header>
    ${featuredRel ? `<div class="post-hero"><img src="${escapeAttr(featuredRel)}" alt="${escapeAttr(post.title)}" /></div>` : ''}
    <div class="post-content">${contentHtml}</div>
    ${tags ? `<p class="post-meta">${tags}</p>` : ''}
  </article>
</main>
<footer class="site-footer">${escapeHtml(SITE_NAME)} — ${new Date().getFullYear()}</footer>
</body>
</html>`;
}

function renderBlogIndex(posts, baseUrl) {
  const cards = posts
    .map((p) => {
      const url = `${baseUrl}/blog/${encodeUrlPath(p.slug)}/`;
      const img = p.__featuredRel
        ? `<img src="${escapeAttr(absUrl(p.__featuredRel))}" alt="${escapeAttr(p.title)}" loading="lazy" />`
        : '';
      const date = formatDate(p.createdAt);
      const excerpt = escapeHtml(stripHtml(p.excerpt || p.content || '').slice(0, 160));
      return `<a class="post-card" href="${escapeAttr(url)}">${img}<div class="body"><h3>${escapeHtml(p.title)}</h3>${date ? `<time datetime="${escapeAttr(p.createdAt || '')}">${escapeHtml(date)}</time>` : ''}<p>${excerpt}</p></div></a>`;
    })
    .join('\n  ');

  const listJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: posts.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${baseUrl}/blog/${encodeUrlPath(p.slug)}/`,
    })),
  }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Tin tức — ${escapeHtml(SITE_NAME)}</title>
<meta name="description" content="Cập nhật tin tức tuyển sinh, chương trình đào tạo và hoạt động của ${escapeHtml(SITE_NAME)}." />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="${escapeAttr(baseUrl)}/blog/" />
<meta property="og:type" content="website" />
<meta property="og:title" content="Tin tức — ${escapeHtml(SITE_NAME)}" />
<meta property="og:locale" content="vi_VN" />
<script type="application/ld+json">${listJson}</script>
<style>${PAGE_CSS}</style>
</head>
<body>
<header class="site-header">
  <div class="inner">
    <a href="${baseUrl}/">${escapeHtml(SITE_NAME)}</a>
    <nav><a href="${baseUrl}/blog/">Tin tức</a></nav>
  </div>
</header>
<main>
  <h1>Tin tức</h1>
  <div class="post-list">${cards}</div>
</main>
<footer class="site-footer">${escapeHtml(SITE_NAME)} — ${new Date().getFullYear()}</footer>
</body>
</html>`;
}

function renderSitemap(posts, baseUrl) {
  const now = new Date().toISOString();
  const urls = [
    `  <url><loc>${baseUrl}/</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
    `  <url><loc>${baseUrl}/blog/</loc><lastmod>${now}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>`,
    ...posts.map((p) => `  <url><loc>${baseUrl}/blog/${encodeUrlPath(p.slug)}/</loc><lastmod>${p.updatedAt || now}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

function renderRobotsTxt(baseUrl) {
  return `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;
}

// ─────────────────────────────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────────────────────────────
async function main() {
  const { out } = parseArgs();
  initializeFirebase();
  const db = getDb();

  const snap = await db.collection(POSTS_COLLECTION).where('status', '==', 'published').get();
  const raw = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || null,
    };
  }).filter((p) => p.slug);

  raw.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

  // Xoá output cũ để không còn bài đã gỡ
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(path.join(out, 'blog'), { recursive: true });
  fs.mkdirSync(path.join(out, 'assets', 'blog'), { recursive: true });

  let generated = 0;
  for (const post of raw) {
    const featuredRel = saveFeaturedImage(post.featuredImage, post.slug, out);
    post.__featuredRel = featuredRel;
    const contentHtml = extractContentImages(post.content || '', post.slug, out);
    const postUrl = `${BASE_URL}/blog/${encodeUrlPath(post.slug)}/`;
    const meta = buildMetaTags(post, postUrl, featuredRel);

    const pageDir = path.join(out, 'blog', post.slug);
    fs.mkdirSync(pageDir, { recursive: true });
    fs.writeFileSync(path.join(pageDir, 'index.html'), renderPostPage(post, meta, featuredRel, contentHtml), 'utf8');
    generated += 1;
  }

  fs.writeFileSync(path.join(out, 'blog', 'index.html'), renderBlogIndex(raw, BASE_URL), 'utf8');
  fs.writeFileSync(path.join(out, 'sitemap.xml'), renderSitemap(raw, BASE_URL), 'utf8');
  fs.writeFileSync(path.join(out, 'robots.txt'), renderRobotsTxt(BASE_URL), 'utf8');

  console.log(`[generate-static] ${generated} post(s) → ${out}`);
  console.log(`[generate-static] blog/index.html + sitemap.xml + robots.txt done`);
  console.log(`[generate-static] base url: ${BASE_URL}`);
}

main().catch((e) => {
  console.error('[generate-static] FAILED:', e);
  process.exit(1);
});
