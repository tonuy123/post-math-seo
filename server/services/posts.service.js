/**
 * Service posts — bọc CRUD Firestore kèm nghiệp vụ.
 *
 * Schema (mirror lại bản cũ):
 *   {
 *     title, slug, author, categories[], tags[],
 *     status: 'draft' | 'published' | 'private' | 'trashed',
 *     excerpt, content, schedule,
 *     featuredImage (Base64 data URL),
 *     createdAt, updatedAt, deletedAt, previousStatus
 *   }
 */
const { getDb } = require('../config/firebase');
const { POSTS_COLLECTION, MAX_FEATURED_IMAGE_BYTES } = require('../config/constants');
const { generateSlug } = require('./slug.service');

function postsCol() {
  return getDb().collection(POSTS_COLLECTION);
}

function serializePost(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || null,
    deletedAt: data.deletedAt?.toDate?.()?.toISOString() || data.deletedAt || null,
  };
}

const TITLE_MAX = 200;
const SLUG_MAX = 200;
const EXCERPT_MAX = 500;
const TAGS_MAX = 30;
const TAG_MAX_LEN = 40;

function validatePayload(payload, { partial = false } = {}) {
  const errors = [];
  const required = ['title'];
  if (!partial) {
    required.forEach((k) => {
      if (!payload[k] || !String(payload[k]).trim()) errors.push(`${k} is required`);
    });
  }
  if (payload.title && String(payload.title).length > TITLE_MAX) {
    errors.push(`title exceeds ${TITLE_MAX} chars`);
  }
  if (payload.slug && String(payload.slug).length > SLUG_MAX) {
    errors.push(`slug exceeds ${SLUG_MAX} chars`);
  }
  if (payload.excerpt && String(payload.excerpt).length > EXCERPT_MAX) {
    errors.push(`excerpt exceeds ${EXCERPT_MAX} chars`);
  }
  if (Array.isArray(payload.tags)) {
    if (payload.tags.length > TAGS_MAX) errors.push(`tags exceeds ${TAGS_MAX} entries`);
    payload.tags.forEach((tag, i) => {
      if (typeof tag !== 'string' || tag.length > TAG_MAX_LEN) {
        errors.push(`tags[${i}] too long`);
      }
    });
  }
  if (payload.featuredImage && payload.featuredImage.length > MAX_FEATURED_IMAGE_BYTES * 1.4) {
    // Base64 lớn hơn ~1.37 lần kích thước nhị phân; bước này bắt các upload vượt kích thước rõ ràng.
    errors.push('featuredImage exceeds 500 KB after Base64 encoding');
  }
  const ALLOWED_STATUSES = ['draft', 'published', 'private', 'trashed'];
  if (payload.status !== undefined && !ALLOWED_STATUSES.includes(payload.status)) {
    errors.push(`status must be one of: ${ALLOWED_STATUSES.join(', ')}`);
  }
  return errors;
}

async function listPosts({ status, author, search, category } = {}) {
  // Không dùng orderBy('createdAt') kết hợp where() vì Firestore đòi composite
  // index — mới deploy sẽ 500. Query đơn giản rồi sort trong memory.
  let query = postsCol();
  if (status) query = query.where('status', '==', status);
  if (author) query = query.where('author', '==', author);
  const snap = await query.get();
  let docs = snap.docs.map(serializePost);

  docs.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

  if (category) {
    docs = docs.filter((p) =>
      Array.isArray(p.categories) && p.categories.some((c) => c.toLowerCase() === category.toLowerCase())
    );
  }
  if (search) {
    const q = String(search).toLowerCase();
    docs = docs.filter((p) => {
      const hay = [
        p.title,
        p.author,
        ...(p.categories || []),
        ...(p.tags || []),
      ]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase());
      return hay.some((f) => f.includes(q));
    });
  }
  return docs;
}

async function getPost(id) {
  const doc = await postsCol().doc(id).get();
  if (!doc.exists) return null;
  return serializePost(doc);
}

async function getPostBySlug(slug) {
  if (!slug) return null;
  const snap = await postsCol().where('slug', '==', slug).limit(1).get();
  if (snap.empty) return null;
  return serializePost(snap.docs[0]);
}

async function createPost(payload, authorUsername) {
  const errors = validatePayload(payload);
  if (errors.length) {
    const err = new Error(errors.join('; '));
    err.status = 400;
    throw err;
  }
  const now = new Date();
  const doc = {
    title: payload.title,
    slug: payload.slug || generateSlug(payload.title),
    author: authorUsername || 'Unknown',
    categories: payload.categories || [],
    tags: payload.tags || [],
    status: payload.status || 'draft',
    excerpt: payload.excerpt || '',
    content: payload.content || '',
    schedule: payload.schedule || '',
    featuredImage: payload.featuredImage || null,
    seo: payload.seo || null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    previousStatus: null,
  };
  const ref = await postsCol().add(doc);
  return getPost(ref.id);
}

// Các field mà API client được phép sửa trên một bài viết. Mọi field khác
// trong payload (vd: id, createdAt, author, deletedAt, previousStatus) sẽ
// bị loại bỏ âm thầm để chống leo thang đặc quyền.
const UPDATABLE_POST_FIELDS = [
  'title', 'slug', 'categories', 'tags', 'status',
  'excerpt', 'content', 'schedule', 'featuredImage', 'seo',
];

async function updatePost(id, payload) {
  const errors = validatePayload(payload, { partial: true });
  if (errors.length) {
    const err = new Error(errors.join('; '));
    err.status = 400;
    throw err;
  }
  const update = { updatedAt: new Date() };
  for (const key of UPDATABLE_POST_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      update[key] = payload[key];
    }
  }
  // Đảm bảo status được nhét vào Firestore update khi client gửi lên.
  if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
    update.status = payload.status;
    // eslint-disable-next-line no-console
    console.log(`[posts.update] id=${id} status=${payload.status}`);
  }
  if (payload.title && !payload.slug) update.slug = generateSlug(payload.title);
  await postsCol().doc(id).update(update);
  return getPost(id);
}

async function trashPost(id) {
  const current = await getPost(id);
  if (!current) return null;
  await postsCol().doc(id).update({
    previousStatus: current.status === 'trashed' ? current.previousStatus : current.status,
    status: 'trashed',
    deletedAt: new Date(),
    updatedAt: new Date(),
  });
  return getPost(id);
}

async function restorePost(id) {
  const current = await getPost(id);
  if (!current) return null;
  await postsCol().doc(id).update({
    status: current.previousStatus || 'draft',
    deletedAt: null,
    previousStatus: null,
    updatedAt: new Date(),
  });
  return getPost(id);
}

async function permanentDelete(id) {
  await postsCol().doc(id).delete();
  return { id };
}

async function bulkUpdate(ids, patch) {
  const batch = getDb().batch();
  ids.forEach((id) => batch.update(postsCol().doc(id), { ...patch, updatedAt: new Date() }));
  await batch.commit();
  return { count: ids.length };
}

async function bulkTrash(ids) {
  // Lưu lại status trước đó để sau này khôi phục đúng trạng thái.
  const tasks = ids.map(async (id) => {
    const p = await getPost(id);
    if (!p) return;
    await postsCol().doc(id).update({
      previousStatus: p.status === 'trashed' ? p.previousStatus : p.status,
      status: 'trashed',
      deletedAt: new Date(),
      updatedAt: new Date(),
    });
  });
  await Promise.all(tasks);
  return { count: ids.length };
}

async function bulkRestore(ids) {
  const tasks = ids.map(async (id) => {
    const p = await getPost(id);
    if (!p) return;
    await postsCol().doc(id).update({
      status: p.previousStatus || 'draft',
      deletedAt: null,
      previousStatus: null,
      updatedAt: new Date(),
    });
  });
  await Promise.all(tasks);
  return { count: ids.length };
}

async function bulkPermanentDelete(ids) {
  const batch = getDb().batch();
  ids.forEach((id) => batch.delete(postsCol().doc(id)));
  await batch.commit();
  return { count: ids.length };
}

/**
 * Tự dọn thùng rác: xoá mọi post có status='trashed' VÀ deletedAt
 * cũ hơn TRASH_RETENTION_HOURS. Mirror lại `autoCleanTrash()` bản cũ.
 */
async function autoCleanTrash({ retentionHours } = {}) {
  const hours = retentionHours || Number(process.env.TRASH_RETENTION_HOURS) || 24;
  const threshold = new Date(Date.now() - hours * 60 * 60 * 1000);
  const snap = await postsCol().where('status', '==', 'trashed').get();
  const expired = snap.docs.filter((d) => {
    const t = d.data().deletedAt;
    if (!t) return false;
    const ts = t.toDate ? t.toDate() : new Date(t);
    return ts.getTime() < threshold.getTime();
  });
  if (!expired.length) return { cleaned: 0 };
  const batch = getDb().batch();
  expired.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return { cleaned: expired.length };
}

module.exports = {
  serializePost,
  listPosts,
  getPost,
  getPostBySlug,
  createPost,
  updatePost,
  trashPost,
  restorePost,
  permanentDelete,
  bulkTrash,
  bulkRestore,
  bulkPermanentDelete,
  bulkUpdate,
  autoCleanTrash,
};