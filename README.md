# Post_Math SEO — CMS Monorepo

Decoupled rebuild of the legacy monolithic CMS (`D:\Project\admin\admin\`).

## Status
- **Phase 0** Clean slate — done
- **Phase 1** Project scaffolding — done
- **Phase 2** Backend routes & auth — **DONE** (verified booting cleanly, Firebase Admin SDK initialized against `cms-tuyensinh`, idempotent seed-admin + 24h trash auto-clean both ran with zero errors)
- **Phase 3** React + Tailwind frontend — **DONE** (Vite production build green: 331 KB JS / 20.8 KB CSS / 107 KB gzipped; Login, Dashboard, Posts list, Post Editor with Rank Math SEO panel, and User Management page all wired with AuthContext/ToastContext/ConfirmContext/i18n)

## Phase 2 — Backend API surface

All endpoints live under `/api/v1`.

| Method | Path                       | Auth            | Notes                                   |
|--------|----------------------------|-----------------|-----------------------------------------|
| POST   | `/auth/login`              | public          | username/password → JWT + user profile  |
| GET    | `/auth/me`                 | bearer          | current authenticated user              |
| POST   | `/auth/logout`             | bearer          | stateless 204                           |
| GET    | `/posts`                   | bearer          | query: `status`, `author`, `search`, `category` |
| GET    | `/posts/:id`               | bearer          |                                         |
| POST   | `/posts`                   | admin/mgr/staff | create                                  |
| PUT    | `/posts/:id`               | admin/mgr/staff | update                                  |
| POST   | `/posts/:id/trash`         | admin/mgr/staff | soft delete (24h auto-clean)            |
| POST   | `/posts/:id/restore`       | admin/mgr/staff | restore                                 |
| DELETE | `/posts/:id`               | admin/mgr/staff | permanent delete                        |
| POST   | `/posts/bulk`              | admin/mgr/staff | `{ action: 'trash'\|'restore'\|'delete', ids: [] }` |
| POST   | `/posts/auto-clean`        | admin           | run trash auto-clean immediately        |
| GET    | `/users/me`                | bearer          |                                         |
| GET    | `/users`                   | admin/mgr       | RBAC-filtered list                      |
| GET    | `/users/:id`               | admin/mgr       |                                         |
| POST   | `/users`                   | admin/mgr       | managers forced to staff role           |
| PUT    | `/users/:id`               | bearer          | self always; RBAC for others            |
| DELETE | `/users/:id`               | admin/mgr       | not self, not admin                     |
| GET    | `/health`                  | public          | liveness + firebase flag                |
t
## Structure
```
post-math-seo/
├─ server/   Express + Firebase Admin (Phase 2 onwards)
└─ client/   React (Vite) + Tailwind + React Router (Phase 2 onwards)
```

## Development

In two terminals:
```bash
# Terminal 1 — backend
cd server
cp .env.example .env
# Place your Firebase service account JSON at config/serviceAccountKey.json
npm install
npm run dev          # starts on http://localhost:5000

# Terminal 2 — frontend
cd client
cp .env.example .env
npm install
npm run dev          # starts on http://localhost:5173
```

The Vite dev server proxies `/api/*` to the Express server.