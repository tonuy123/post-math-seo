/**
 * Password hashing service.
 * Legacy code stored plaintext passwords — this is unacceptable.
 * Phase 2 hashes on save and verifies on login using bcryptjs.
 *
 * Hashes are stored in the `password` field for backwards-compat with the
 * existing user documents. Plaintext values are detected and re-hashed on
 * successful login (see `verifyPassword`).
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
 * Verifies a password against the stored hash.
 * - If `stored` looks like a bcrypt hash, uses bcrypt.compare.
 * - If `stored` is plaintext (legacy), compares directly and returns a flag
 *   indicating the password should be re-hashed on the next save.
 */
async function verifyPassword(plain, stored) {
  if (!stored) return { ok: false, needsRehash: false };

  const isHash = typeof stored === 'string' && stored.startsWith('$2');

  if (isHash) {
    const ok = await bcrypt.compare(plain, stored);
    return { ok, needsRehash: false };
  }

  // Legacy plaintext branch — use constant-time compare to avoid timing
  // leaks even during the brief rehash window.
  const a = Buffer.from(plain || '', 'utf8');
  const b = Buffer.from(stored, 'utf8');
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  return { ok, needsRehash: ok };
}

module.exports = { hashPassword, verifyPassword };