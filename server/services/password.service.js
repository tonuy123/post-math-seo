/**
 * Service băm mật khẩu.
 * Code cũ lưu mật khẩu dạng plaintext — điều này không thể chấp nhận được.
 * Phase 2 băm khi lưu và xác minh khi đăng nhập bằng bcryptjs.
 *
 * Hash được lưu trong field `password` để tương thích ngược với các
 * user documents hiện có. Giá trị plaintext được phát hiện và băm lại
 * khi đăng nhập thành công (xem `verifyPassword`).
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

async function hashPassword(plain) {
  if (!plain || typeof plain !== 'string') {
    throw new Error('Password is required');
  }
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Xác minh mật khẩu so với hash đã lưu.
 * - Nếu `stored` trông giống hash bcrypt, dùng bcrypt.compare.
 * - Nếu `stored` là plaintext (bản cũ), so sánh trực tiếp và trả về cờ
 *   cho biết mật khẩu cần được băm lại ở lần lưu tiếp theo.
 */
async function verifyPassword(plain, stored) {
  if (!stored) return { ok: false, needsRehash: false };

  const isHash = typeof stored === 'string' && stored.startsWith('$2');

  if (isHash) {
    const ok = await bcrypt.compare(plain, stored);
    return { ok, needsRehash: false };
  }

  // Nhánh plaintext kế thừa từ bản cũ — dùng so sánh thời gian hằng định để
  // tránh rò rỉ timing ngay cả trong khoảng thời gian ngắn đang rehash.
  const a = Buffer.from(plain || '', 'utf8');
  const b = Buffer.from(stored, 'utf8');
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { ok, needsRehash: ok };
}

module.exports = { hashPassword, verifyPassword };