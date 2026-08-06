# Post_Math SEO — CMS Quản lý Bài viết + SEO

CMS quản lý bài viết kèm panel SEO phong cách **Rank Math** cho website tuyển sinh.
Bao gồm 2 phần:

| Thư mục | Công nghệ | Vai trò |
|---|---|---|
| `server/` | Node.js + Express + Firebase Admin SDK | REST API, auth JWT, CRUD posts/users, sinh trang tĩnh SEO |
| `client/` | React + Vite + TailwindCSS | Admin dashboard: login, danh sách bài, editor + Rank Math SEO panel, quản lý user |

Dữ liệu lưu trong **Firestore** (project `cms-tuyensinh`, collection `posts` + `users`).

---

## 1. Cấu trúc thư mục

```
server/
├─ server.js                 # Entry point (Express app)
├─ config/                   # Firebase init, hằng số
├─ routes/                   # /api/v1: auth, posts, users
├─ controllers/              # Xử lý HTTP request
├─ services/                 # Logic nghiệp vụ (posts, users, password, slug)
├─ middlewares/              # authRequired, requireRole, errorHandler
└─ scripts/                  # generate-static, deploy-ftp, reset-passwords, wipe-users
client/
└─ src/
   ├─ pages/posts/           # PostEditor (TinyMCE + RankMathSeoBox), PostsList
   ├─ components/editor/     # Widget sidebar + rankmath/ (tabs, modal, engine chấm điểm)
   ├─ hooks/ services/ context/ utils/ i18n/
```

## 2. Yêu cầu
- **Node.js 18+**
- **Firebase service account** (xem mục 4)
- Tài khoản Google Cloud / Firestore của project `cms-tuyensinh`

---

## 3. Chạy Dev

### Bước 1 — Backend
```bash
cd server
copy .env.example .env      # điền giá trị thật
npm install
npm run dev                 # http://localhost:5000 (health: /api/v1/health)
```

### Bước 2 — Frontend
```bash
cd client
npm install
npm run dev                 # http://localhost:5173 — proxy /api → localhost:5000
```
Không cần file `.env` cho dev (đã proxy sẵn). Chỉ cần khi build production (mục 7.2).

### Login mặc định
`admin` / pass lấy từ `SEED_ADMIN_PASSWORD` trong `server/.env` (bản `.env.example` mẫu là `admin123`).
**Code KHÔNG có password mặc định** — thiếu env là không seed được admin. Đổi pass ngay sau khi deploy.

Quên mật khẩu: `node scripts/reset-passwords.js --user=admin --password=pass-mới`
(Thêm `ALLOW_PASSWORD_LEAK=1` nếu muốn API trả plaintext — **chỉ dev**).

---

## 4. Firebase Service Account

1. Firebase Console → Project Settings → **Service Accounts** → *Generate new private key* → tải file JSON
2. Đặt tại `server/config/serviceAccountKey.json` (đã có trong `.gitignore`)

Server nạp theo thứ tự ưu tiên:
1. `FIREBASE_SERVICE_ACCOUNT_JSON` — dán toàn bộ nội dung JSON (chuẩn Render.com)
2. `FIREBASE_SERVICE_ACCOUNT_B64` — JSON mã hoá base64
3. `FIREBASE_SERVICE_ACCOUNT_PATH` — đường dẫn file (local dev)

---

## 5. Biến môi trường `server/.env`

### Bắt buộc
| Biến | Ghi chú |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Đường dẫn file service account JSON (local dev) — trên Render dùng `FIREBASE_SERVICE_ACCOUNT_JSON` thay thế |
| `SEED_ADMIN_PASSWORD` | Mật khẩu admin khi tạo lần đầu (không có default) |
| `JWT_SECRET` | **Bắt buộc đổi** thành chuỗi dài ngẫu nhiên trước khi deploy |

### Khuyên dùng (có default)
| Biến | Default | Ghi chú |
|---|---|---|
| `CLIENT_ORIGIN` | `http://localhost:5173` | Origin được phép gọi API, phân cách dấu phẩy. Prod = domain CMS thật |
| `PUBLIC_BASE_URL` | `DEFAULT_BASE_DOMAIN` | Domain public của blog tĩnh (không trailing slash) — cho canonical/OG/JSON-LD |
| `DEFAULT_BASE_DOMAIN` | `https://tuyensinh.quocteviet.edu.vn/` | Phân loại internal/external link + canonical fallback |
| `PUBLIC_SITE_NAME` | Tên mặc định | Tên publisher trong JSON-LD |
| `JWT_EXPIRES_IN` | `12h` | Thời hạn token |
| `SEED_ADMIN_USERNAME` | `admin` | Username admin seed |

### Tùy chọn
`PORT` (Render tự inject), `FIRESTORE_POSTS_COLLECTION` (`posts`), `FIRESTORE_USERS_COLLECTION` (`users`),
`TRASH_RETENTION_HOURS` (24 — auto-clean thùng rác), `MAX_FEATURED_IMAGE_BYTES` (524288),
`FTP_HOST`/`FTP_USER`/`FTP_PASS`/`FTP_PORT`/`FTP_ROOT` (chỉ khi dùng deploy FTP cho blog tĩnh).

> ⚠️ `ALLOW_PASSWORD_LEAK=1` chỉ cho script reset local — **cấm trên production**.

---

## 6. API chính (prefix `/api/v1`)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/auth/login` | public | username/password → JWT |
| GET | `/auth/me` | bearer | Thông tin user hiện tại |
| GET | `/health` | public | Healthcheck + trạng thái Firebase |
| GET | `/posts/public` | public | Bài đã `published` (cho web public) |
| GET | `/posts/public/:slug` | public | Bài published theo slug |
| GET | `/posts` | bearer | Danh sách (?status, ?author, ?search, ?category) |
| GET | `/posts/:id` | bearer | Chi tiết |
| POST | `/posts` | admin/manager/staff | Tạo bài |
| PUT | `/posts/:id` | admin/manager/staff | Cập nhật (kèm `seo` object) |
| POST | `/posts/:id/trash` / `/restore` | admin/manager/staff | Xóa mềm / khôi phục |
| DELETE | `/posts/:id` | admin/manager/staff | Xóa vĩnh viễn |
| POST | `/posts/bulk` | admin/manager/staff | Trash/restore/delete hàng loạt |
| POST | `/posts/auto-clean` | **admin only** | Dọn bài quá hạn trong thùng rác |
| GET/PUT | `/users` | admin/manager | Quản lý user (RBAC) |

Response chuẩn: `{ success, message, data }`.

---

## 7. Deploy Production

### 7.1 Backend — Render.com
1. Tạo **Web Service** trỏ tới folder `server/`
2. Build: `npm install` — Start: `npm start`
3. Set env (theo mục 5), đặc biệt:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` (dán nguyên JSON, không dùng PATH)
   - `JWT_SECRET` mạnh, `SEED_ADMIN_PASSWORD` mới, `CLIENT_ORIGIN` = domain CMS thật
4. `PORT` để Render tự inject

### 7.2 Frontend CMS
```bash
cd client
# Sửa file client/.env.production → VITE_API_BASE_URL=https://<render-service>.onrender.com/api/v1
npm run build                # → dist/
```
Upload `dist/` lên hosting tĩnh (cPanel/Plesk/Vercel). Nếu API cùng domain thì dùng `VITE_API_BASE_URL=/api/v1`.

### 7.3 🚀 Sinh trang public tĩnh — SEO chạy thật trên Google

Google đọc được SEO data (title, meta description, canonical, robots, OG, JSON-LD)
**chỉ khi** data được in thẳng vào source HTML — nên phải sinh HTML tĩnh rồi upload lên hosting.

```bash
cd server
npm run gen:static        # → server/build-public/ (blog/, sitemap.xml, robots.txt)
npm run deploy:ftp        # upload lên cPanel (cần FTP_* trong .env)
# Hoặc gộp:
npm run publish:static
```

Kết quả trên hosting:
```
public_html/
├─ blog/<slug>/index.html    # bài viết + đầy đủ meta tags từ seo object
├─ blog/index.html           # danh sách bài
├─ sitemap.xml               # tự cập nhật mỗi lần gen
└─ robots.txt                # trỏ tới sitemap
```

**Quy trình chuẩn khi đăng bài:** viết bài trong CMS → set status `published` → `npm run publish:static` → Request indexing trong Search Console.
Script chỉ upload 3 thứ trên, KHÔNG đụng file khác của landing page. Xóa bài khỏi blog = xóa/chuyển draft bài rồi gen lại.

### 7.4 Google Search Console (làm 1 lần)
1. search.google.com/search-console → **Add property** → **Domain**
2. Nhập `tuyensinh.quocteviet.edu.vn` → verify bằng TXT record (DNS)
3. Sitemaps → submit `https://tuyensinh.quocteviet.edu.vn/sitemap.xml`
4. Sau mỗi lần publish: URL Inspection → **Request indexing**

---

## 8. Scripts tiện ích (`server/scripts/`)

| Script | Công dụng |
|---|---|
| `generate-static.js` | Sinh HTML tĩnh blog + sitemap + robots từ Firestore |
| `deploy-ftp.js` | Upload `build-public/` lên cPanel |
| `reset-passwords.js` | Reset mật khẩu user |
| `wipe-users.js` | Xóa toàn bộ user trừ admin (dev) |

---

## 9. Panel Rank Math SEO — thật hay giả?

**Thật.** Toàn bộ dữ liệu trong panel (focus keyword, meta title/description, slug,
robots, canonical, schema type, social) lưu vào object `seo` của post trong Firestore
và được in ra HTML tĩnh ở mục 7.3. Điểm SEO (0–100) tính **real-time** với 10 tiêu chí
(keyword trong title/meta/slug/10% đầu/H2-H3/alt ảnh/mật độ 1–2.5%, internal+external
link, số trong title — xử lý tiếng Việt bỏ dấu).

> Điểm số chỉ là **gợi ý cho người viết bài**, không phải thứ hạng Google.
> Thứ hạng phụ thuộc content, backlink, thời gian — không gì đảm bảo top Google.

## 10. Hạn chế đã biết (quan trọng khi bàn giao)

| Hạn chế | Trạng thái |
|---|---|
| Widget "Thống kê bài viết" (views/CTR) chưa có dữ liệu | Hiện "Chưa kết nối GA4" — chờ nối GA4/Search Console (Phase 2) |
| Google Search Console API chưa nối (kế hoạch: bảng top queries trong modal keyword) | Phase 2 |
| `@google-analytics/data` đã cài nhưng chưa dùng | Dự trữ Phase 2 |
| Ảnh bài viết lưu Base64 trong Firestore | Generator tách ra file tĩnh khi gen |
| Engine chấm điểm chưa có check độ dài title ≤60 / description ≤160 như Rank Math thật | Có thể nâng cấp sau |
| Trang blog tĩnh dùng CSS inline tối giản | Chưa đồng bộ theme landing page |
