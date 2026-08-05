/**
 * ============================================================================
 *  CMS Server Entry Point
 * ============================================================================
 *  - Loads environment variables
 *  - Initializes Express app
 *  - Initializes Firebase Admin SDK
 *  - Seeds default admin user (idempotent)
 *  - Mounts /health + /api/v1
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
app.use(express.json({ limit: '2mb' })); // Base64 images can be large
app.use(express.urlencoded({ extended: true }));

// -------------------- Bootstrap --------------------
const firebaseAdmin = initializeFirebase();

// Schedule a one-time default-admin seed + initial trash auto-clean.
// These are best-effort; failures here do not crash the server.
if (firebaseAdmin) {
  (async () => {
    try {
      const result = await usersService.seedDefaultAdmin({
        username: process.env.SEED_ADMIN_USERNAME || 'admin',
        password: process.env.SEED_ADMIN_PASSWORD || 'admin123',
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
});

// Global error handler (must remain last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[cms-server] listening on http://localhost:${PORT}`);
  console.log(`[cms-server] environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;