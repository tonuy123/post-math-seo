# CMS Server (Express + Firebase Admin)

Phase 1 scaffold. Phase 2 will add real route handlers.

## Quick start
```bash
cp .env.example .env
# Place your Firebase service account JSON at config/serviceAccountKey.json
npm install
npm run dev
```

## Folder layout
```
server/
├─ config/         Firebase Admin bootstrap, constants
├─ controllers/    Route handlers (Phase 2)
├─ middlewares/    Auth, RBAC, validation, error handler
├─ routes/         Express routers mounted under /api/v1
├─ services/       Shared business logic (slug, trash auto-clean, image validation)
├─ utils/          asyncHandler, response helpers
├─ logs/           Runtime logs
├─ server.js       Entry point
└─ package.json
```