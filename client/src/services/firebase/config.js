// Khởi tạo Firebase Web SDK.
//
// CÁCH KÍCH HOẠT
// ---------------
// 1. `cd client && npm install firebase`
// 2. Mở Firebase Console → Project Settings → "Your apps" → Web app
// 3. Sao chép config object và dán vào bên dưới (thay cho dấu ngoặc rỗng)
// 4. Đảm bảo Firestore được bật trong console và các security rules
//    cho phép đọc/ghi trên collection `categories`.
//
// Trước khi đó, `db` cố tình là `null` để consumer có thể dò theo tính năng
// thay vì sập. Phần còn lại của app (posts, auth, v.v.) không
// bị ảnh hưởng — chỉ các widget dùng Firebase như <CategorySidebar />
// quan tâm đến điều này.
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
  // Chỉ khởi tạo khi ít nhất projectId đã được điền. Object rỗng
  // ở trên sẽ ném lỗi, và ta nuốt lỗi đó để app tiếp tục chạy.
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