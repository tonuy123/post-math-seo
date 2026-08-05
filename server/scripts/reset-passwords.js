/**
 * scripts/reset-passwords.js
 *
 * Reset mật khẩu cho tất cả user (hoặc theo --username), đồng thời ghi
 * `passwordPlain` vào Firestore để UI có thể hiển thị (yêu cầu
 * ALLOW_PASSWORD_LEAK=1 trên server đã bật).
 *
 * Cách dùng:
 *   node scripts/reset-passwords.js                  # reset tất cả → "123456"
 *   node scripts/reset-passwords.js --user=admin    # reset 1 user
 *   node scripts/reset-passwords.js --password=abc  # custom password
 *
 * LƯU Ý: chỉ chạy trong môi trường dev. KHÔNG chạy production.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { initializeFirebase, getDb } = require('../config/firebase');
const { USERS_COLLECTION } = require('../config/constants');
const { hashPassword } = require('../services/password.service');

function parseArgs() {
  const args = { user: null, password: '123456' };
  process.argv.slice(2).forEach((a) => {
    if (a.startsWith('--user='))     args.user     = a.slice(7);
    if (a.startsWith('--username=')) args.user     = a.slice(11);
    if (a.startsWith('--password=')) args.password = a.slice(11);
  });
  return args;
}

async function main() {
  if (process.env.ALLOW_PASSWORD_LEAK !== '1') {
    console.warn('[WARN] ALLOW_PASSWORD_LEAK chưa bật trong .env. Bật trước khi chạy script này.');
  }

  const { user: targetUser, password } = parseArgs();
  initializeFirebase();
  const db = getDb();
  const snap = await db.collection(USERS_COLLECTION).get();

  let updated = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (targetUser && data.username !== targetUser) continue;

    const hashed = await hashPassword(password);
    await doc.ref.update({
      password: hashed,
      passwordPlain: password,
      updatedAt: new Date(),
    });
    console.log(`[OK] ${data.username} → password="${password}" (plaintext stored for UI display)`);
    updated += 1;
  }

  console.log(`\nDone. Updated ${updated} user(s).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});