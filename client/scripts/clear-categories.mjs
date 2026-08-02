/* eslint-disable no-console */
/**
 * scripts/clear-categories.mjs
 * -----------------------------
 * One-shot cleanup: deletes every document in the `categories`
 * collection of the cms-tuyensinh Firestore project.
 *
 * Run from the `client/` directory:
 *   node scripts/clear-categories.mjs
 *
 * After running, your sidebar will show "Chưa có danh mục nào".
 * Re-seed via the in-app "+ Thêm Danh Mục" form, or write a
 * separate seed script.
 */
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyCZfzB_KZKUc9LI9MiAoHgChojcFKbCkZE',
  authDomain:        'cms-tuyensinh.firebaseapp.com',
  projectId:         'cms-tuyensinh',
  storageBucket:     'cms-tuyensinh.firebasestorage.app',
  messagingSenderId: '218318178724',
  appId:             '1:218318178724:web:7d4b2018381cf2005b5931',
  measurementId:     'G-C041RFKEB8',
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

async function clearCategories() {
  console.log('▶ Connecting to Firestore…');
  const snap = await getDocs(collection(db, 'categories'));
  const docs = snap.docs;

  if (docs.length === 0) {
    console.log('✓ No documents to delete. Collection already empty.');
    process.exit(0);
  }

  console.log(`▶ Found ${docs.length} document(s) in "categories":`);
  docs.forEach((d) => {
    const data = d.data();
    console.log(`    - ${d.id}  "${data.name ?? '(no name)'}"  postCount=${data.postCount ?? 0}`);
  });

  console.log('▶ Deleting…');
  await Promise.all(docs.map((d) => deleteDoc(d.ref)));
  console.log(`✓ Deleted ${docs.length} document(s).`);
  process.exit(0);
}

clearCategories().catch((err) => {
  console.error('✗ Failed:', err);
  process.exit(1);
});
