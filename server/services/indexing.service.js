/**
 * Service Google Indexing API — tự ping Google sau khi HTML tĩnh đã build xong.
 *
 * Dùng đúng service account của Firebase (cùng cấu trúc JSON Google Cloud):
 *   - Credential lấy từ process.env.FIREBASE_SERVICE_ACCOUNT_JSON
 *   - Scope: https://www.googleapis.com/auth/indexing
 *   - Endpoint: POST /v3/urlNotifications:publish (googleapis, version v3)
 *
 * ⚠️ ĐIỀU KIỆN BẮT BUỘC trước khi gọi:
 *   1. HTML của URL phải ĐÃ build xong (gọi sau gen:static thành công) —
 *      nếu không Googlebot mò vào sẽ ăn 404.
 *   2. Service account phải được thêm làm OWNER trong Google Search Console
 *      (Settings → Users and permissions) — thiếu bước này API trả 403.
 *   3. Hạn mức Indexing API: 200 URL/ngày.
 */
const { google } = require('googleapis');

const INDEXING_SCOPE = 'https://www.googleapis.com/auth/indexing';

/** Đọc credential service account từ env (JSON của Firebase dùng chung được).
 *  Trả về parsed object, hoặc null nếu chưa cấu hình. */
function loadCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw || !raw.trim()) return null;
  try {
    const key = JSON.parse(raw);
    if (!key.client_email || !key.private_key) return null;
    return key;
  } catch {
    return null;
  }
}

/**
 * Gửi yêu cầu index URL lên Google Indexing API.
 *
 * @param {string} postUrl  URL tuyệt đối của bài viết (vd: https://site/blog/slug/)
 * @param {object} [options]
 * @param {'URL_UPDATED'|'URL_REMOVED'} [options.type='URL_UPDATED']
 * @returns {Promise<{ok: boolean, reason?: string, status?: number, data?: object}>}
 */
async function notifyGoogle(postUrl, { type = 'URL_UPDATED' } = {}) {
  if (!postUrl || !/^https?:\/\//i.test(postUrl)) {
    // eslint-disable-next-line no-console
    console.error('[indexing] notifyGoogle bỏ qua: URL không hợp lệ:', postUrl);
    return { ok: false, reason: 'invalid-url' };
  }

  const key = loadCredential();
  if (!key) {
    // eslint-disable-next-line no-console
    console.warn('[indexing] notifyGoogle bỏ qua: thiếu FIREBASE_SERVICE_ACCOUNT_JSON (chưa config credential)');
    return { ok: false, reason: 'no-credential' };
  }

  try {
    // Lưu ý: googleapis bản mới phải khởi tạo JWT theo dạng options-object
    // (email + key + scopes), không dùng được dạng positional cũ.
    const jwt = new google.auth.JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: [INDEXING_SCOPE],
    });
    const indexing = google.indexing({ version: 'v3', auth: jwt });

    const res = await indexing.urlNotifications.publish({
      requestBody: { url: postUrl, type },
    });

    // eslint-disable-next-line no-console
    console.log(`[indexing] notifyGoogle OK → ${res.status}: ${type} ${postUrl}`);
    return { ok: true, status: res.status, data: res.data };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`[indexing] notifyGoogle FAILED: ${type} ${postUrl} → ${e.message}`);
    return { ok: false, reason: e.message };
  }
}

module.exports = { notifyGoogle };
