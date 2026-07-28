# 🔍 Đồ Thất Lạc HN

Website đăng tin tìm đồ thất lạc / nhặt được ở Hà Nội. Đồ án môn Phát triển Web.

> **Bản cập nhật này** đổi giao diện sang bố cục kiểu **sidebar bộ lọc + lưới tin**
> (lấy cảm hứng từ timdothatlac.vn), thêm **trang chi tiết riêng** cho mỗi tin đăng,
> và thêm hệ thống bài viết **"Mẹo tìm đồ"** + **"Số điện thoại lừa đảo"** với trang
> danh sách + trang chi tiết riêng cho từng bài, lưu trong MongoDB.

---

## 1. Tính năng chính

- Đăng tin mất đồ / nhặt được / thú cưng / xe cộ / tìm người, kèm ảnh (nén phía client).
- **Trang chi tiết riêng** cho mỗi tin đăng (`post-detail.html?id=...`) — xem đầy đủ mô tả,
  tin liên quan cùng danh mục, và các thao tác (xem SĐT, quan tâm, đánh dấu đã tìm thấy, báo cáo).
- Đăng ký / đăng nhập bằng email + mật khẩu, quên mật khẩu qua email.
- Lọc theo loại tin (nav bar), **danh mục đồ vật** (sidebar, kiểu Ví/Giấy tờ, Thú cưng,
  Điện thoại/Tablet/Laptop, Đồ gia dụng, Xe cộ, Đồ khác), quận, trạng thái, khẩn cấp/có thưởng,
  khoảng ngày, từ khoá — phân trang dạng số.
- **Mẹo tìm đồ**: trang danh sách (`tips.html`) + trang chi tiết (`article-detail.html`),
  người dùng đã đăng nhập có thể đăng bài mới.
- **Số điện thoại lừa đảo**: trang danh sách (`scam-warnings.html`) + trang chi tiết,
  nổi bật số điện thoại/tài khoản bị tố cáo ở đầu bài.
- Đánh dấu "Quan tâm", đánh dấu "Đã tìm thấy" (chỉ chủ tin), chia sẻ, báo cáo tin nghi ngờ.
- Thống kê tổng số tin / mất / nhặt được / đã đóng / khẩn cấp.
- Dark mode, tự động cập nhật số liệu thống kê (polling mỗi 30 giây).

## 2. Kiến trúc tổng quan

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

## 3. Cấu trúc thư mục

```
dothatlac-hn/
├── backend/
│   ├── config/db.js
│   ├── controllers/           # postController, articleController (mới), authController
│   ├── middleware/            # auth (JWT), errorHandler
│   ├── models/                 # User, Post (+category), Article (mới)
│   ├── routes/                  # postRoutes, articleRoutes (mới), authRoutes
│   ├── scripts/seedArticles.js   # tạo vài bài mẹo/cảnh báo mẫu để demo nhanh
│   ├── utils/
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── css/style.css            # 1 file duy nhất, có sẵn dark mode cho toàn bộ layout mới
│   ├── js/
│   │   ├── config.js             # URL backend
│   │   ├── api.js                 # helper gọi fetch + JWT
│   │   ├── img-utils.js            # nén ảnh phía client (dùng chung cho tin đăng & bài viết)
│   │   ├── auth.js                  # đăng nhập/đăng ký/đăng xuất
│   │   ├── posts.js                  # state + API cho tin đăng (danh sách + chi tiết)
│   │   ├── articles.js                # state + API cho Mẹo tìm đồ / Cảnh báo lừa đảo
│   │   ├── ui.js                       # render toàn bộ giao diện (card, sidebar, phân trang...)
│   │   └── main.js                      # khởi động theo từng trang, dark mode
│   ├── index.html                # trang chủ: sidebar lọc + lưới tin + 2 khối mẹo/cảnh báo
│   ├── post-detail.html           # chi tiết 1 tin đăng + tin liên quan
│   ├── tips.html                    # danh sách "Mẹo tìm đồ"
│   ├── scam-warnings.html            # danh sách "Số điện thoại lừa đảo"
│   ├── article-detail.html            # chi tiết 1 bài viết (dùng chung cho cả 2 loại)
│   └── reset-password.html
│
├── render.yaml
└── README.md
```

## 4. Mô hình dữ liệu — những gì thay đổi

- **`Post`**: giữ nguyên toàn bộ field cũ, **thêm field mới** `category` (enum:
  `wallet | pet | electronics | household | vehicle | other`) dùng cho bộ lọc danh mục ở
  sidebar. Field này có `default: 'other'` nên **không phá dữ liệu cũ** — tin đăng trước khi
  cập nhật vẫn hoạt động bình thường, chỉ là mặc định rơi vào danh mục "Đồ vật khác" cho tới khi
  người đăng sửa lại.
- **`Article`** (mới): `kind` (`tip` | `scam`), `title`, `slug` (tự sinh từ tiêu đề), `thumbnail`,
  `summary`, `content` (mảng đoạn văn), `scamContact` (chỉ dùng cho `kind: 'scam'`), `views`,
  `author`, `authorName`.
- **`User`**: thêm field `role` (`user` | `admin`, mặc định `user`) — dự phòng cho việc phân
  quyền quản trị bài viết sau này (hiện tại bất kỳ ai đăng nhập cũng đăng được Mẹo tìm đồ / Cảnh
  báo lừa đảo, giống cách đăng tin thường; muốn giới hạn chỉ admin mới đăng được thì sửa điều kiện
  trong `articleController.createArticle`).

## 5. API endpoints

| Method | Endpoint                        | Mô tả                                             | Cần đăng nhập? |
|--------|----------------------------------|----------------------------------------------------|:---:|
| POST   | `/api/auth/register`              | Đăng ký tài khoản                                    | ✗ |
| POST   | `/api/auth/login`                  | Đăng nhập                                             | ✗ |
| GET    | `/api/auth/me`                      | Lấy thông tin bản thân                                 | ✓ |
| POST   | `/api/auth/forgot-password`          | Gửi yêu cầu đặt lại mật khẩu                            | ✗ |
| PUT    | `/api/auth/reset-password/:token`     | Đặt mật khẩu mới bằng token                               | ✗ |
| GET    | `/api/posts`                           | Danh sách tin (lọc theo type/category/district/..., phân trang) | ✗ |
| GET    | `/api/posts/stats`                      | Số liệu thống kê tổng quan                                | ✗ |
| GET    | `/api/posts/:id`                         | Chi tiết 1 tin                                              | ✗ |
| GET    | `/api/posts/:id/related`                  | Vài tin cùng danh mục — dùng cho trang chi tiết               | ✗ |
| POST   | `/api/posts`                               | Đăng tin mới                                                  | ✓ |
| PATCH  | `/api/posts/:id/status`                     | Đổi trạng thái (đã tìm thấy / mở lại) — chỉ chủ tin              | ✓ |
| PATCH  | `/api/posts/:id/match`                       | Đánh dấu "Quan tâm"                                              | ✓ |
| POST   | `/api/posts/:id/reveal`                       | Xem số điện thoại (tăng lượt xem)                                  | ✗ |
| DELETE | `/api/posts/:id`                               | Xoá tin — chỉ chủ tin                                                | ✓ |
| GET    | `/api/articles?kind=tip\|scam`                  | Danh sách bài viết theo loại, phân trang/tìm kiếm                     | ✗ |
| GET    | `/api/articles/:idOrSlug`                        | Chi tiết 1 bài viết (theo `_id` hoặc `slug`)                            | ✗ |
| POST   | `/api/articles`                                   | Đăng bài viết mới (`kind: 'tip'` hoặc `'scam'`)                          | ✓ |
| PATCH  | `/api/articles/:id`                                | Sửa bài viết — chủ bài viết hoặc admin                                     | ✓ |
| DELETE | `/api/articles/:id`                                 | Xoá bài viết — chủ bài viết hoặc admin                                      | ✓ |

## 6. Chạy thử ở máy local

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

## 7. Deploy

Xem hướng dẫn deploy MongoDB Atlas / Render / GitHub Pages ở các bản trước — phần backend/frontend
mới không thay đổi cách deploy, chỉ thêm 1 route (`/api/articles`) và vài trang tĩnh mới nên
quy trình build/deploy giữ nguyên 100%.

## 8. Những quyết định thiết kế đáng chú ý

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

## 9. Giấy phép

Dự án phục vụ mục đích học tập.
