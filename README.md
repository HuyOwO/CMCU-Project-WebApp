# 🔍 Đồ Thất Lạc HN

Website đăng tin tìm đồ thất lạc / nhặt được ở Hà Nội. Đồ án môn Phát triển Web.

> **Bản cập nhật này** đổi giao diện sang bố cục kiểu **sidebar bộ lọc + lưới tin**
> (lấy cảm hứng từ timdothatlac.vn), thêm **trang chi tiết riêng** cho mỗi tin đăng,
> thêm hệ thống bài viết **"Mẹo tìm đồ"** + **"Số điện thoại lừa đảo"**, và thêm
> **hệ thống phân quyền User/Admin** với duyệt bài, quản lý người dùng, nhãn tin cậy.

---

## 0. ⚠️ Nếu bạn đang nâng cấp từ bản trước (đã có dữ liệu)

Tính năng duyệt bài khiến trang công khai **chỉ hiện tin có `moderationStatus: 'approved'`**.
Tin đăng từ trước khi có bản cập nhật này **chưa hề có field đó trong MongoDB**, nên nếu
không xử lý, toàn bộ tin cũ sẽ **biến mất khỏi trang chủ** (dữ liệu vẫn còn nguyên, chỉ là
bị bộ lọc chặn). Chạy lệnh sau **1 lần duy nhất** ngay sau khi deploy bản này:

```bash
cd backend
npm run migrate:moderation
```

---

## 1. Tính năng chính

- Đăng tin mất đồ / nhặt được / thú cưng / xe cộ / tìm người, kèm ảnh (nén phía client).
- **Trang chi tiết riêng** cho mỗi tin đăng (`post-detail.html?id=...`).
- Đăng ký / đăng nhập bằng email + mật khẩu, quên mật khẩu qua email.
- Lọc theo loại tin (nav bar), danh mục đồ vật, quận, trạng thái, khẩn cấp/có thưởng,
  khoảng ngày, từ khoá — phân trang dạng số.
- **Mẹo tìm đồ** / **Số điện thoại lừa đảo**: trang danh sách + trang chi tiết riêng,
  chỉ **admin** mới đăng được (xem mục 2).
- **Phân quyền User / Admin** (mục 2).
- **"Tin của tôi"** (`my-posts.html`): xem tất cả tin mình đã đăng kèm trạng thái duyệt,
  **sửa tin** (dùng lại modal đăng tin, điền sẵn dữ liệu cũ), đánh dấu đã tìm thấy/mở lại,
  xoá tin của mình — không cần vào từng trang chi tiết.
- **Trang quản trị** (`admin.html`, chỉ admin thấy được): duyệt/từ chối tin đăng, xoá bất kỳ
  tin nào, gắn nhãn tin cậy/không tin cậy cho người dùng.
- Đánh dấu "Quan tâm", đánh dấu "Đã tìm thấy" (chỉ chủ tin), chia sẻ, báo cáo tin nghi ngờ.
- Thống kê tổng số tin, dark mode, tự động cập nhật số liệu (polling mỗi 30 giây).

## 2. Hệ thống phân quyền

| | **User** (mặc định khi đăng ký) | **Admin** |
|---|---|---|
| Đăng tin mất đồ/nhặt được | ✓ | ✓ |
| Sửa/xoá **tin của chính mình** | ✓ | ✓ |
| Sửa/xoá **tin của người khác** | ✗ | ✓ (xoá) |
| Duyệt/từ chối tin chờ duyệt | ✗ | ✓ |
| Đăng Mẹo tìm đồ / Cảnh báo lừa đảo | ✗ | ✓ |
| Gắn nhãn tin cậy/không tin cậy cho user | ✗ | ✓ |

**Luồng duyệt bài:** tin đăng mới mặc định ở trạng thái `pending` (chờ duyệt) và **chưa hiện
công khai** — chỉ chủ tin và admin xem được (qua "Tin của tôi" hoặc trang quản trị). Admin bấm
Duyệt ở `admin.html` để tin hiện công khai. **Ngoại lệ:** nếu người đăng có nhãn `trustStatus:
'trusted'` (admin gắn thủ công), tin của họ được **tự động duyệt ngay khi đăng**, bỏ qua hàng
chờ.

**Tạo tài khoản admin đầu tiên:** chạy `npm run seed:articles` sẽ tự tạo 1 tài khoản admin demo
(`admin@dothatlachn.vn` / `ChangeMe123` — **nhớ đổi mật khẩu sau khi seed**). Hoặc: vào MongoDB
Atlas → collection `users` → sửa field `role` của tài khoản bất kỳ thành `"admin"`.

---

## 3. Kiến trúc tổng quan

```
┌──────────────────┐        HTTPS / REST API        ┌──────────────────────┐        ┌───────────────────┐
│   FRONTEND         │ ───────────────────────────▶  │   BACKEND              │ ─────▶ │  MongoDB Atlas      │
│   HTML/CSS/JS       │ ◀─────────────────────────── │   Node.js + Express     │ ◀───── │  (Free M0 cluster)  │
│   (GitHub Pages)    │        JSON + JWT              │   (Render Free Web     │        └───────────────────┘
└──────────────────┘                                 │    Service)             │
                                                       └──────────────────────┘
```

- **Frontend**: HTML/CSS/JS thuần (không framework, không build step), nhiều trang tĩnh
  gọi API bằng `fetch`. Triển khai bằng **GitHub Pages**.
- **Backend**: Node.js + Express, xác thực JWT, MongoDB qua Mongoose. Triển khai bằng **Render**.
- **Database**: **MongoDB Atlas** — 3 collection chính: `users`, `posts`, `articles`.

## 4. Cấu trúc thư mục

```
dothatlac-hn/
├── backend/
│   ├── config/db.js
│   ├── controllers/           # postController, articleController, authController, userController (mới)
│   ├── middleware/            # auth (JWT + adminOnly + optionalAuth), errorHandler
│   ├── models/                 # User (+role,+trustStatus), Post (+category,+moderationStatus), Article
│   ├── routes/                  # postRoutes, articleRoutes, authRoutes, userRoutes (mới)
│   ├── scripts/
│   │   ├── seedArticles.js         # tạo vài bài mẹo/cảnh báo mẫu + 1 tài khoản admin demo
│   │   └── migrateModerationStatus.js  # ⚠️ chạy 1 lần khi nâng cấp — xem mục 0
│   ├── utils/
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── css/style.css            # 1 file duy nhất, có sẵn dark mode cho toàn bộ layout
│   ├── js/
│   │   ├── config.js             # URL backend
│   │   ├── api.js                 # helper gọi fetch + JWT
│   │   ├── img-utils.js            # nén ảnh phía client (dùng chung cho tin đăng & bài viết)
│   │   ├── auth.js                  # đăng nhập/đăng ký/đăng xuất, hiện/ẩn menu "Quản trị"
│   │   ├── posts.js                  # state + API cho tin đăng (danh sách, chi tiết, "Tin của tôi")
│   │   ├── articles.js                # state + API cho Mẹo tìm đồ / Cảnh báo lừa đảo
│   │   ├── admin.js                    # state + API cho trang quản trị (duyệt bài, quản lý user)
│   │   ├── ui.js                        # render toàn bộ giao diện
│   │   └── main.js                       # khởi động theo từng trang, dark mode
│   ├── index.html                # trang chủ: sidebar lọc + lưới tin + 2 khối mẹo/cảnh báo
│   ├── post-detail.html           # chi tiết 1 tin đăng + tin liên quan
│   ├── my-posts.html               # "Tin của tôi" (cần đăng nhập)
│   ├── admin.html                    # trang quản trị (chỉ admin)
│   ├── tips.html                       # danh sách "Mẹo tìm đồ"
│   ├── scam-warnings.html               # danh sách "Số điện thoại lừa đảo"
│   ├── article-detail.html               # chi tiết 1 bài viết (dùng chung cho cả 2 loại)
│   └── reset-password.html
│
├── render.yaml
└── README.md
```

## 5. Mô hình dữ liệu — những gì thay đổi

- **`Post`**: thêm `category` (enum: `wallet | pet | electronics | household | vehicle | other`,
  mặc định `'other'`) dùng cho bộ lọc danh mục ở sidebar. Thêm **`moderationStatus`** (enum:
  `pending | approved | rejected`, mặc định `'pending'`) — **quyết định tin có hiện công khai hay
  không**. ⚠️ Field này không có default an toàn cho dữ liệu cũ (Mongo không tự thêm field cho
  document đã tồn tại) nên **bắt buộc chạy `npm run migrate:moderation` một lần** sau khi nâng
  cấp (xem mục 0).
- **`Article`**: `kind` (`tip` | `scam`), `title`, `slug` (tự sinh), `thumbnail`, `summary`,
  `content` (mảng đoạn văn), `scamContact`, `views`, `author`, `authorName`. Chỉ **admin** tạo
  được (route yêu cầu `adminOnly`).
- **`User`**: `role` (`user | admin`, mặc định `user`). Thêm **`trustStatus`** (enum:
  `none | trusted | untrusted`, mặc định `'none'`) — admin gắn thủ công qua trang quản trị; user
  có `trustStatus: 'trusted'` được **tự động duyệt bài** ngay khi đăng (bỏ qua hàng chờ).

## 6. API endpoints

| Method | Endpoint                        | Mô tả                                             | Quyền |
|--------|----------------------------------|----------------------------------------------------|:---:|
| POST   | `/api/auth/register`              | Đăng ký tài khoản                                    | ✗ |
| POST   | `/api/auth/login`                  | Đăng nhập                                             | ✗ |
| GET    | `/api/auth/me`                      | Lấy thông tin bản thân                                 | đăng nhập |
| POST   | `/api/auth/forgot-password`          | Gửi yêu cầu đặt lại mật khẩu                            | ✗ |
| PUT    | `/api/auth/reset-password/:token`     | Đặt mật khẩu mới bằng token                               | ✗ |
| GET    | `/api/posts`                           | Danh sách tin — công khai chỉ thấy `approved`; thêm `?mine=1` (xem tin của mình mọi trạng thái) hoặc `?moderation=` (admin lọc theo trạng thái, `all` = mọi trạng thái) | ✗ (có token thì thấy thêm) |
| GET    | `/api/posts/stats`                      | Thống kê — chỉ tính tin `approved`                        | ✗ |
| GET    | `/api/posts/:id`                         | Chi tiết 1 tin — tin chưa duyệt chỉ chủ tin/admin xem được  | ✗ (có token thì thấy thêm) |
| GET    | `/api/posts/:id/related`                  | Vài tin cùng danh mục (chỉ tin đã duyệt)                     | ✗ |
| POST   | `/api/posts`                               | Đăng tin mới — mặc định `pending`, tự `approved` nếu người đăng `trusted`/admin | đăng nhập |
| PATCH  | `/api/posts/:id`                            | Sửa tin — chủ tin hoặc admin. Sửa xong quay lại `pending` trừ khi người sửa là admin/`trusted` | đăng nhập |
| PATCH  | `/api/posts/:id/status`                     | Đổi trạng thái đã tìm thấy/mở lại — chỉ chủ tin              | đăng nhập |
| PATCH  | `/api/posts/:id/moderate`                    | Duyệt/từ chối tin — body `{action:'approve'\|'reject'}`        | **admin** |
| PATCH  | `/api/posts/:id/match`                       | Đánh dấu "Quan tâm"                                              | đăng nhập |
| POST   | `/api/posts/:id/reveal`                       | Xem số điện thoại (tăng lượt xem)                                  | ✗ |
| DELETE | `/api/posts/:id`                               | Xoá tin — chủ tin hoặc admin                                        | đăng nhập |
| GET    | `/api/articles?kind=tip\|scam`                  | Danh sách bài viết theo loại, phân trang/tìm kiếm                     | ✗ |
| GET    | `/api/articles/:idOrSlug`                        | Chi tiết 1 bài viết (theo `_id` hoặc `slug`)                            | ✗ |
| POST   | `/api/articles`                                   | Đăng bài viết mới (`kind: 'tip'` hoặc `'scam'`)                          | **admin** |
| PATCH  | `/api/articles/:id`                                | Sửa bài viết — chủ bài viết hoặc admin                                     | đăng nhập |
| DELETE | `/api/articles/:id`                                 | Xoá bài viết — chủ bài viết hoặc admin                                      | đăng nhập |
| GET    | `/api/users?q=&page=&limit=`                         | Danh sách người dùng (tìm theo tên/email)                                    | **admin** |
| PATCH  | `/api/users/:id/trust`                                | Gắn nhãn tin cậy — body `{trustStatus:'none'\|'trusted'\|'untrusted'}`          | **admin** |

## 7. Chạy thử ở máy local

### 6.1. Backend

```bash
cd backend
cp .env.example .env      # điền MONGODB_URI, JWT_SECRET...
npm install
npm run dev                # http://localhost:5000

# (tuỳ chọn) tạo vài bài Mẹo tìm đồ / Cảnh báo lừa đảo mẫu để xem giao diện có dữ liệu ngay:
npm run seed:articles
```

### 6.2. Frontend

File tĩnh, không cần build — dùng extension **Live Server** trong VS Code, click phải
`frontend/index.html` → "Open with Live Server" (thường chạy ở `http://127.0.0.1:5500`).
Nhớ thêm đúng địa chỉ đó vào `CLIENT_ORIGIN` trong `backend/.env`.

## 8. Deploy

Xem hướng dẫn deploy MongoDB Atlas / Render / GitHub Pages ở các bản trước — phần backend/frontend
mới không thay đổi cách deploy, chỉ thêm 1 route (`/api/articles`) và vài trang tĩnh mới nên
quy trình build/deploy giữ nguyên 100%.

## 9. Những quyết định thiết kế đáng chú ý

- **Loại tin (Mất đồ/Nhặt được/Thú cưng/Xe cộ/Tìm người) vẫn là điều hướng SPA** (link có
  `?type=`, gọi API lọc lại danh sách) thay vì tách hẳn thành nhiều route phía server như trang
  mẫu — giữ kiến trúc đơn giản, không cần thêm framework routing.
- **"Mẹo tìm đồ" và "Số điện thoại lừa đảo" là 2 trang thật sự riêng biệt** (`tips.html`,
  `scam-warnings.html`), mỗi bài viết có trang chi tiết riêng (`article-detail.html?id=...`),
  dùng chung 1 component chi tiết để đỡ trùng lặp code nhưng nội dung/URL của từng bài là độc lập.
- **Ảnh trong danh sách tin không còn hiện SĐT/nút thao tác trực tiếp** — những phần đó chuyển
  hết vào trang chi tiết, giống cách trang mẫu tổ chức card danh sách gọn nhẹ.
- **Phân trang chuyển từ "Xem thêm" sang phân trang số** — khớp với trang mẫu và cũng giúp
  polling định kỳ không làm mất vị trí trang đang xem.
- **Tin chờ duyệt/bị từ chối trả về 404 (không phải 403)** khi người khác cố xem — tránh lộ
  thông tin "tin này tồn tại nhưng đang bị ẩn" cho người không liên quan.
- **Nhãn tin cậy chỉ hiện ở trang chi tiết tin** (cạnh tên người đăng), không hiện trên card
  danh sách — giữ card gọn nhẹ, và đây cũng là lúc thông tin đó thực sự hữu ích (trước khi liên hệ).
- **Chưa có trang tự sửa thông tin cá nhân** (đổi tên/SĐT/mật khẩu) — nếu cần, đây là hướng mở
  rộng tự nhiên tiếp theo: thêm `PATCH /api/auth/me` + 1 trang `profile.html`.

## 10. Giấy phép

Dự án phục vụ mục đích học tập.
