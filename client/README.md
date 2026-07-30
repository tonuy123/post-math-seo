# CMS Client (React + Vite + Tailwind)

Phase 1 scaffold.

## Quick start
```bash
cp .env.example .env
npm install
npm run dev
```
The app starts on `http://localhost:5173` and proxies `/api/*` to `http://localhost:5000`.

## Folder layout
```
client/
├─ public/                  Static assets served as-is
├─ src/
│  ├─ assets/               Images, fonts (legacy 8950926.jpg goes here later)
│  ├─ components/
│  │  ├─ layout/            Header, Sidebar, DashboardLayout
│  │  ├─ ui/                Button, Modal, Toast, Spinner, Table, Badge
│  │  └─ editor/            TinyMCE wrapper, TagsInput, FeaturedImageUpload
│  ├─ context/              AuthContext, LanguageContext, ToastContext
│  ├─ hooks/                useTinyMCE, usePosts, useUsers, useDebounce
│  ├─ i18n/locales/         en.json, vi.json
│  ├─ pages/
│  │  ├─ auth/              Login
│  │  ├─ dashboard/         Dashboard home
│  │  ├─ posts/             PostsList, PostEditor
│  │  └─ users/             UserManagement, UserForm
│  ├─ routes/               Route guards, route constants
│  ├─ services/
│  │  ├─ api/               client.js, posts.js, users.js
│  │  └─ firebase/          config.js, auth.js
│  ├─ utils/                constants, helpers (slug, date, base64)
│  ├─ App.jsx
│  ├─ main.jsx
│  └─ index.css
├─ index.html
├─ vite.config.js
├─ tailwind.config.js
├─ postcss.config.js
└─ package.json
```