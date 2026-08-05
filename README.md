# Post_Math SEO — CMS Monorepo

CMS quản lý bài viết + SEO (clone Rank Math) cho website tuyển sinh. Gồm 2 phần:

| Thư mục | Công nghệ | Vai trò |
|---|---|---|
| `server/` | Node.js + Express + Firebase Admin SDK | REST API, auth (JWT), CRUD posts/users, sinh trang tĩnh SEO |
| `client/` | React + Vite + Tailwind | Admin dashboard (login, danh sách bài, editor + Rank Math SEO panel, user management) |

Dữ liệu lưu trong **Firestore** (`posts`, `users` collections) — project `cms-tuyensinh`.

---

## 1. Cài đặt & chạy Dev

### Yêu cầu
- Node.js 18+
- Firebase service account (xem mục 1.2)

### Bước 1 — Backend (`server/`)
```bash
cd server
cp .env.example .env          # điền giá trị thật
npm install
npm run dev                   # http://localhost:5000
```

### Bước 2 — Frontend (`client/`)
```bash
cd client
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173 (proxy /api → :5000)
```

### 1.1 Biến môi trường bắt buộc (`server/.env`)
| Biến | Ghi chú |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Đường dẫn file service account JSON (KHÔNG commit lên git) |
| `JWT_SECRET` | **Bắt buộc đổi** thành chuỗi ngẫu nhiên dài trước khi deploy |
| `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` | Admin mặc định tạo khi boot lần đầu (đổi pass sau khi login) |
| `CLIENT_ORIGIN` | Danh sách origin được phép gọi API, phân cách bằng dấu phẩy |

### 1.2 Firebase service account
1. Firebase Console → Project Settings → Service Accounts
2. Generate new private key → tải file JSON
3. Đặt tại `server/config/serviceAccountKey.json` (hoặc chỉ đường dẫn qua `.env`)

### 1.3 Tài khoản login mặc định
`admin` / pass trong `SEED_ADMIN_PASSWORD` (mặc định `admin123`). **Đổi ngay sau khi deploy.**

> ⚠️ Nếu quên mật khẩu: `cd server && node scripts/reset-passwords.js --user=admin --password=pass-mới`
> (cần `ALLOW_PASSWORD_LEAK=1` trong `.env` nếu muốn UI hiển thị plaintext — dev only)

---

## 2. API chính (prefix `/api/v1`)

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| POST | `/auth/login` | public | username/password → JWT |
| GET | `/auth/me` | bearer | thông tin user hiện tại |
| GET | `/posts` | bearer | danh sách (query: status, author, search, category) |
| GET | `/posts/:id` | bearer | chi tiết |
| POST | `/posts` | staff+ | tạo bài |
| PUT | `/posts/:id` | staff+ | cập nhật |
| POST | `/posts/:id/trash` / `restore` | staff+ | xóa mềm / khôi phục |
| DELETE | `/posts/:id` | staff+ | xóa vĩnh viễn |
| GET | `/posts/public` | public | bài `published` (cho frontend public) |
| GET | `/posts/public/:slug` | public | bài published theo slug |
| GET | `/users`, `/users/:id` | admin/manager | quản lý user (RBAC) |
| GET | `/health` | public | healthcheck + firebase flag |

---

## 3. Deploy Production

### 3.1 Backend API (Node)
```bash
cd server
NODE_ENV=production npm start
```
- Nên chạy sau reverse proxy (Nginx/Caddy) với HTTPS
- Set `JWT_SECRET` mạnh, `SEED_ADMIN_PASSWORD` mới, `CLIENT_ORIGIN` = domain CMS thật

### 3.2 Frontend CMS
```bash
cd client
npm run build        # → dist/
```
Upload `client/dist/` lên hosting tĩnh (cPanel/Plesk). Nếu API khác origin,
set `VITE_API_BASE_URL=https://api.domain.com/api/v1` trong `client/.env` trước khi build.

### 3.3 🚀 Sinh trang public tĩnh (SEO chạy thật trên Google)
Cách duy nhất để SEO data (title, description, canonical, OG, JSON-LD) đến được
Google là **sinh HTML tĩnh** rồi upload lên hosting — Googlebot đọc thẳng source HTML,
không cần chạy JavaScript.

```bash
cd server
# 1. Sinh trang tĩnh từ các bài status='published' trong Firestore
npm run gen:static        # → server/build-public/ (blog/, sitemap.xml, robots.txt)

# 2. Upload lên cPanel qua FTP (cần FTP_HOST/FTP_USER/FTP_PASS/FTP_ROOT trong .env)
npm run deploy:ftp

# Hoặc gộp 1 lệnh:
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

**Quy trình chuẩn khi đăng bài:** viết bài trong CMS → set status `published`
→ chạy `npm run publish:static` → request indexing trong Search Console.

> Chỉ upload 3 thứ trên — script KHÔNG đụng tới file khác của landing page.
> Xóa bài khỏi blog: xóa (hoặc chuyển draft) bài trong Firestore rồi gen lại.

### 3.4 Google Search Console (làm 1 lần)
1. https://search.google.com/search-console → **Add property** → chọn **Domain**
2. Nhập `tuyensinh.quocteviet.edu.vn` → verify bằng TXT record (DNS)
3. Sitemaps → submit `https://tuyensinh.quocteviet.edu.vn/sitemap.xml`
4. Sau mỗi lần publish: URL Inspection → paste URL bài → **Request indexing**

---

## 4. Scripts tiện ích (`server/scripts/`)

| Script | Công dụng |
|---|---|
| `generate-static.js` | Sinh HTML tĩnh blog + sitemap + robots từ Firestore |
| `deploy-ftp.js` | Upload `build-public/` lên cPanel (thêm `--clean` để xóa blog cũ trước khi upload) |
| `reset-passwords.js` | Reset mật khẩu user |
| `wipe-users.js` | Xóa toàn bộ user (dev) |

---

## 5. Rank Math SEO panel — nó thật hay không?

**Thật:** toàn bộ dữ liệu nhập trong panel (focus keyword, meta title/description,
robots, canonical, schema type, social) được lưu vào `seo` object của post trong
Firestore. Điểm SEO (0–100) được tính **real-time** từ nội dung thật với thuật toán
chuẩn Rank Math (10 tiêu chí: keyword trong title/meta/slug/H2-H3/alt ảnh/density,
internal-external link, con số trong title — xử lý tiếng Việt không dấu).

**Điểm số hiển thị là gợi ý cho người viết bài, không phải thứ hạng Google.**
Thứ hạng phụ thuộc content, backlink, thời gian — không gì đảm bảo top Google.

## 6. Hạn chế đã biết (quan trọng khi bàn giao)

| Hạn chế | Trạng thái |
|---|---|
| Widget "Thống kê bài viết" (views/CTR/bounce rate) chưa có dữ liệu | Tạm ẩn, hiện "Chưa kết nối GA4" — chờ nối GA4/Search Console (Phase 2) |
| `@google-analytics/data` đã cài nhưng chưa dùng | dự trữ cho Phase 2 |
| Ảnh bài viết lưu dạng Base64 trong Firestore | được generator tách ra file tĩnh khi gen |
| `client/.env.example` chỉ mới tạo, `client/.env` không cần thiết nếu dùng proxy | — |
| Trang blog tĩnh dùng CSS inline tối giản | chưa đồng bộ theme landing page |
