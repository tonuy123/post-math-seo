/**
 * scripts/wipe-users.js
 *
 * Nuks every user in Firestore EXCEPT the admin role.
 *
 * Usage:
 *   cd server
 *   node scripts/wipe-users.js
 *
 * It prints the admin doc id it kept, and the list of every user doc it
 * deleted. Exits non-zero on any failure.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { initializeFirebase, getDb } = require('../config/firebase');

initializeFirebase();
const db = getDb();
const { ROLES, USERS_COLLECTION } = require('../config/constants');

async function wipeUsers() {
  const snap = await db.collection(USERS_COLLECTION).get();
  if (snap.empty) {
    console.log('[wipe-users] no users found — nothing to do.');
    return { deleted: 0, keptAdmin: null };
  }

  const kept = [];
  const toDelete = [];

  snap.forEach((doc) => {
    const data = doc.data();
    if (data.role === ROLES.ADMIN) {
      kept.push({ id: doc.id, username: data.username });
    } else {
      toDelete.push({ id: doc.id, username: data.username, role: data.role });
    }
  });

  if (kept.length === 0) {
    throw new Error('Refusing to wipe: no admin user found. Seed an admin first.');
  }

  console.log(`[wipe-users] keeping admin(s):`);
  kept.forEach((u) => console.log(`  - ${u.username} (${u.id})`));

  if (toDelete.length === 0) {
    console.log('[wipe-users] no non-admin users to delete.');
    return { deleted: 0, keptAdmin: kept };
  }

  console.log(`[wipe-users] deleting ${toDelete.length} user(s):`);
  // batch in chunks of 500 (Firestore limit)
  for (let i = 0; i < toDelete.length; i += 500) {
    const chunk = toDelete.slice(i, i + 500);
    const batch = db.batch();
    chunk.forEach((u) => batch.delete(db.collection(USERS_COLLECTION).doc(u.id)));
    await batch.commit();
    chunk.forEach((u) => console.log(`  - ${u.username} (${u.role}) [${u.id}]`));
  }

  return { deleted: toDelete.length, keptAdmin: kept };
}

wipeUsers()
  .then((r) => {
    console.log(`[wipe-users] done. deleted=${r.deleted} kept=${r.keptAdmin.length}`);
    process.exit(0);
  })
  .catch((e) => {
    console.error('[wipe-users] FAILED:', e.message);
    process.exit(1);
  });