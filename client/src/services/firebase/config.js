// Firebase Web SDK bootstrap.
//
// HOW TO ACTIVATE
// ---------------
// 1. `cd client && npm install firebase`
// 2. Open the Firebase Console → Project Settings → "Your apps" → Web app
// 3. Copy the config object and paste it below (replacing the empty braces)
// 4. Make sure Firestore is enabled in the console and the security rules
//    allow read/write on the `categories` collection.
//
// Until then, `db` is intentionally `null` so consumers can feature-detect
// instead of crashing. The rest of the app (posts, auth, etc.) is
// unaffected — only Firebase-powered widgets like <CategorySidebar />
// care about this.
import { initializeApp }                from 'firebase/app';
import { getFirestore }                 from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyCZfzB_KZKUc9LI9MiAoHgChojcFKbCkZE',
  authDomain:        'cms-tuyensinh.firebaseapp.com',
  projectId:         'cms-tuyensinh',
  storageBucket:     'cms-tuyensinh.firebasestorage.app',
  messagingSenderId: '218318178724',
  appId:             '1:218318178724:web:7d4b2018381cf2005b5931',
  measurementId:     'G-C041RFKEB8',
};

let _db = null;
try {
  // Initialise only when at least the projectId is filled in. The empty
  // object above will throw, which we swallow so the app keeps running.
  if (firebaseConfig.projectId) {
    const app = initializeApp(firebaseConfig);
    _db = getFirestore(app);
  }
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('[firebase/config] Firestore not initialised — fill in firebaseConfig:', err);
}

export const db = _db;
export default _db;