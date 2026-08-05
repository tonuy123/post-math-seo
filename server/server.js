/**
 * ============================================================================
 *  Điểm vào của CMS Server
 * ============================================================================
 *  - Nạp các biến môi trường
 *  - Khởi tạo Express app
 *  - Khởi tạo Firebase Admin SDK
 *  - Seed admin user mặc định (idempotent)
 *  - Gắn /health + /api/v1
 * ============================================================================
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const { initializeFirebase } = require('./config/firebase');
const apiRouter = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const usersService = require('./services/users.service');
const postsService = require('./services/posts.service');

const app = express();
const PORT = process.env.PORT || 5000;

// -------------------- Middleware --------------------
// CLIENT_ORIGIN hỗ trợ nhiều origin phân cách bằng dấu phẩy:
//   CLIENT_ORIGIN=http://localhost:5173,https://cms.example.com
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Không có Origin (curl, Googlebot, tool) → cho phép
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' })); // Ảnh Base64 có thể rất lớn
app.use(express.urlencoded({ extended: true }));

// -------------------- Bootstrap --------------------
const firebaseAdmin = initializeFirebase();

// Lên lịch seed admin mặc định một lần + tự dọn thùng rác ban đầu.
// Đây là các bước best-effort; lỗi ở đây không làm sập server.
if (firebaseAdmin) {
  (async () => {
    try {
      const result = await usersService.seedDefaultAdmin({
        username: process.env.SEED_ADMIN_USERNAME || 'admin',
        password: process.env.SEED_ADMIN_PASSWORD,
      });
      console.log(`[bootstrap] seed-admin: ${result.created ? 'created' : 'skipped'} (${result.reason || 'ok'})`);
    } catch (e) {
      console.warn('[bootstrap] seed-admin failed:', e.message);
    }
    try {
      const r = await postsService.autoCleanTrash();
      console.log(`[bootstrap] auto-clean: ${r.cleaned} trashed post(s) removed`);
    } catch (e) {
      console.warn('[bootstrap] auto-clean failed:', e.message);
    }
  })();
}

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'cms-server',
    firebase: !!firebaseAdmin,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1', apiRouter);

// Handler 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// Handler lỗi toàn cục (phải giữ ở cuối)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[cms-server] listening on http://localhost:${PORT}`);
  console.log(`[cms-server] environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;