/**
 * Posts controller — wires HTTP verbs to the posts service.
 *
 * Routes (all require auth; only admin/manager/staff may mutate):
 *   GET    /posts              list with ?status=, ?author=, ?search=, ?category=
 *   POST   /posts              create
 *   GET    /posts/:id          fetch
 *   PUT    /posts/:id          update
 *   POST   /posts/:id/trash    soft delete
 *   POST   /posts/:id/restore  restore
 *   DELETE /posts/:id          permanent delete
 *   POST   /posts/bulk         { action: 'trash'|'restore'|'delete', ids: [] }
 *   POST   /posts/auto-clean   runs trash auto-clean (admin)
 *
 * Public routes (no auth — for guest homepage):
 *   GET    /posts/public       list ONLY status='published' posts
 *   GET    /posts/public/:slug get single published post by slug
 */
const postsService = require('../services/posts.service');
const ok = (res, data, message = 'OK') => res.status(200).json({ success: true, message, data });
const created = (res, data, message = 'Created') => res.status(201).json({ success: true, message, data });
const notFound = (res, msg = 'Post not found') => res.status(404).json({ success: false, error: 'NotFound', message: msg });

async function list(req, res, next) {
  try {
    const { status, author, search, category } = req.query;
    const data = await postsService.listPosts({ status, author, search, category });
    return ok(res, { posts: data, count: data.length });
  } catch (err) {
    return next(err);
  }
}

// Public: chỉ trả về post status='published'. Không nhận status từ query
// để guest không thể trick lấy draft/private.
async function listPublic(req, res, next) {
  try {
    const { search, category } = req.query;
    const data = await postsService.listPosts({
      status: 'published',
      search,
      category,
    });
    return ok(res, { posts: data, count: data.length });
  } catch (err) {
    return next(err);
  }
}

async function getPublicBySlug(req, res, next) {
  try {
    const post = await postsService.getPostBySlug(req.params.slug);
    if (!post || post.status !== 'published') return notFound(res);
    return ok(res, { post });
  } catch (err) {
    return next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const post = await postsService.getPost(req.params.id);
    if (!post) return notFound(res);
    return ok(res, { post });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const post = await postsService.createPost(req.body || {}, req.user.username);
    return created(res, { post }, 'Post saved');
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const post = await postsService.updatePost(req.params.id, req.body || {});
    if (!post) return notFound(res);
    return ok(res, { post }, 'Post updated');
  } catch (err) {
    return next(err);
  }
}

async function trash(req, res, next) {
  try {
    const post = await postsService.trashPost(req.params.id);
    if (!post) return notFound(res);
    return ok(res, { post }, 'Post moved to trash');
  } catch (err) {
    return next(err);
  }
}

async function restore(req, res, next) {
  try {
    const post = await postsService.restorePost(req.params.id);
    if (!post) return notFound(res);
    return ok(res, { post }, 'Post restored');
  } catch (err) {
    return next(err);
  }
}

async function permanentDelete(req, res, next) {
  try {
    const existing = await postsService.getPost(req.params.id);
    if (!existing) return notFound(res);
    const result = await postsService.permanentDelete(req.params.id);
    return ok(res, result, 'Post permanently deleted');
  } catch (err) {
    return next(err);
  }
}

async function bulk(req, res, next) {
  try {
    const { action, ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'BadRequest', message: 'ids must be a non-empty array' });
    }
    let result;
    switch (action) {
      case 'trash':   result = await postsService.bulkTrash(ids); break;
      case 'restore': result = await postsService.bulkRestore(ids); break;
      case 'delete':  result = await postsService.bulkPermanentDelete(ids); break;
      default:
        return res.status(400).json({ success: false, error: 'BadRequest', message: "action must be 'trash'|'restore'|'delete'" });
    }
    return ok(res, result, `Bulk ${action} complete`);
  } catch (err) {
    return next(err);
  }
}

async function autoClean(req, res, next) {
  try {
    const result = await postsService.autoCleanTrash();
    return ok(res, result, 'Auto-clean complete');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  list,
  listPublic,
  getPublicBySlug,
  getOne,
  create,
  update,
  trash,
  restore,
  permanentDelete,
  bulk,
  autoClean,
};