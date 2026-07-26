# 🔍 Đồ Thất Lạc HN

Website đăng tin tìm đồ thất lạc / nhặt được ở Hà Nội. Đồ án môn Phát triển Web —
kiến trúc **frontend + backend tách biệt**, triển khai bằng các dịch vụ **miễn phí**.

---

## 1. Tính năng chính

- Đăng tin mất đồ / nhặt được / thú cưng / xe cộ / tìm người, kèm ảnh (nén phía client).
- Đăng ký / đăng nhập bằng email + mật khẩu (JWT), quên mật khẩu qua email.
- Lọc theo loại tin, quận, trạng thái, tin khẩn cấp/có thưởng, khoảng ngày, tìm kiếm theo từ khoá.
- Sắp xếp theo mới nhất / khẩn cấp / lượt xem, phân trang kiểu "Xem thêm".
- Đánh dấu "Quan tâm", đánh dấu "Đã tìm thấy" (chỉ chủ tin), chia sẻ, báo cáo tin nghi ngờ.
- Thống kê tổng số tin / mất / nhặt được / đã đóng / khẩn cấp.
- Dark mode, tự động cập nhật tin mới (polling mỗi 30 giây).

## 2. Kiến trúc tổng quan

```
┌──────────────────┐        HTTPS / REST API        ┌──────────────────────┐        ┌───────────────────┐
│   FRONTEND        │ ───────────────────────────▶  │   BACKEND             │ ─────▶ │  MongoDB Atlas      │
│   HTML/CSS/JS      │ ◀─────────────────────────── │   Node.js + Express    │ ◀───── │  (Free M0 cluster)  │
│   (GitHub Pages)   │        JSON + JWT              │   (Render Free Web    │        └───────────────────┘
└──────────────────┘                                │    Service)            │
                                                      └──────────────────────┘
        ▲                                                       ▲
        │                    push code                          │  auto-deploy khi push
        └───────────────────── GitHub Repo (source of truth) ───┘
```

- **Frontend**: HTML/CSS/JS thuần (không framework), gọi API bằng `fetch`. Triển khai bằng **GitHub Pages**
  (deploy tự động qua GitHub Actions mỗi khi push vào `main`).
- **Backend**: Node.js + Express, xác thực bằng JWT, kết nối MongoDB qua Mongoose. Triển khai bằng
  **Render** (Free Web Service).
- **Database**: **MongoDB Atlas** — cluster M0 miễn phí vĩnh viễn (512MB).
- **Repo**: một repo GitHub duy nhất (monorepo) chứa cả `frontend/` và `backend/`, vừa là nơi lưu code
  vừa là "nguồn" để cả GitHub Pages và Render tự động deploy lại mỗi khi có commit mới.

## 3. Công nghệ sử dụng

| Thành phần        | Công nghệ                                          |
|--------------------|-----------------------------------------------------|
| Frontend           | HTML5, CSS3 (Flexbox/Grid), JavaScript (vanilla)    |
| Backend            | Node.js, Express 4                                  |
| Database           | MongoDB Atlas (Mongoose ODM)                        |
| Xác thực           | JWT (jsonwebtoken) + mã hoá mật khẩu (bcryptjs)      |
| Gửi email          | Nodemailer (SMTP Gmail, tuỳ chọn)                    |
| Hosting frontend   | GitHub Pages                                         |
| Hosting backend    | Render (Free Web Service)                            |
| CI/CD              | GitHub Actions                                       |

## 4. Cấu trúc thư mục

```
dothatlac-hn/
├── backend/                   # REST API (Node.js/Express)
│   ├── config/db.js            # kết nối MongoDB
│   ├── controllers/            # xử lý logic nghiệp vụ
│   ├── middleware/              # auth (JWT) + xử lý lỗi tập trung
│   ├── models/                  # schema Mongoose (User, Post)
│   ├── routes/                   # định nghĩa endpoint
│   ├── utils/                     # helper (JWT, gửi email)
│   ├── server.js                  # điểm khởi động app
│   ├── package.json
│   └── .env.example                # mẫu biến môi trường
│
├── frontend/                  # giao diện tĩnh (HTML/CSS/JS)
│   ├── css/style.css
│   ├── js/
│   │   ├── config.js            # URL của backend API
│   │   ├── api.js               # helper gọi fetch + JWT
│   │   ├── auth.js               # đăng nhập/đăng ký/đăng xuất
│   │   ├── posts.js               # state + hành động liên quan tin đăng
│   │   ├── ui.js                   # render giao diện, bộ lọc, modal
│   │   └── main.js                  # khởi động app, dark mode, polling
│   ├── index.html
│   └── reset-password.html
│
├── .github/workflows/deploy-frontend.yml   # CI/CD: tự deploy frontend lên GitHub Pages
├── render.yaml                              # Blueprint để deploy backend lên Render
├── .gitignore
└── README.md
```

## 5. Chạy thử ở máy local

### 5.1. Backend

```bash
cd backend
cp .env.example .env      # rồi điền MONGODB_URI, JWT_SECRET... (xem mục 6.1)
npm install
npm run dev                # chạy với nodemon tại http://localhost:5000
```

### 5.2. Frontend

Frontend là file tĩnh, không cần build. Cách đơn giản nhất: cài extension **Live Server** trong VS Code,
click phải vào `frontend/index.html` → "Open with Live Server" (thường chạy ở `http://127.0.0.1:5500`).

Vì `frontend/js/config.js` đã tự nhận diện `localhost`/`127.0.0.1` để trỏ về
`http://localhost:5000/api`, nên không cần sửa gì thêm khi chạy local.

> ⚠️ Nhớ thêm đúng địa chỉ Live Server (VD: `http://127.0.0.1:5500`) vào `CLIENT_ORIGIN` trong file
> `backend/.env`, nếu không request sẽ bị chặn bởi CORS.

## 6. Hướng dẫn deploy miễn phí (từng bước)

### 6.1. Tạo database — MongoDB Atlas

1. Vào [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) → tạo tài khoản miễn phí.
2. Tạo **Cluster** mới → chọn gói **M0 Free**.
3. Mục **Database Access** → tạo 1 user (username/password) — nhớ lưu lại.
4. Mục **Network Access** → **Add IP Address** → chọn **Allow Access from Anywhere** (`0.0.0.0/0`),
   vì Render (gói free) dùng IP động nên không thể whitelist IP cụ thể.
5. Mục **Database** → **Connect** → **Drivers** → copy **connection string**, dạng:
   `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   → thêm tên database vào giữa, VD: `.../dothatlac_hn?retryWrites=true...`

### 6.2. Đưa code lên GitHub

```bash
cd dothatlac-hn
git init
git add .
git commit -m "Khởi tạo dự án Đồ Thất Lạc HN — frontend + backend"
git branch -M main
git remote add origin https://github.com/<username>/<ten-repo>.git
git push -u origin main
```

### 6.3. Deploy backend — Render

1. Vào [render.com](https://render.com) → đăng nhập bằng GitHub.
2. **New** → **Web Service** → chọn repo vừa push.
3. Điền thông tin:
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Mục **Environment** → thêm các biến giống `backend/.env.example`
   (`MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRE`, `CLIENT_ORIGIN`, `CLIENT_RESET_URL`, và `EMAIL_*` nếu dùng).
5. Bấm **Create Web Service**. Chờ build xong, Render cấp cho bạn 1 URL dạng
   `https://ten-app-cua-ban.onrender.com`.

   > 💡 Có thể dùng file `render.yaml` có sẵn trong repo để tạo service nhanh hơn qua
   > **Blueprints** trong dashboard Render, thay vì điền tay từng bước ở trên.

### 6.4. Deploy frontend — GitHub Pages

1. Sửa file `frontend/js/config.js`, đổi dòng URL production thành URL Render thật ở bước 6.3:
   ```js
   : 'https://ten-app-cua-ban.onrender.com/api';
   ```
2. Commit & push lại thay đổi này lên `main`.
3. Vào repo trên GitHub → **Settings** → **Pages** → mục **Source** chọn **GitHub Actions**.
4. Workflow `.github/workflows/deploy-frontend.yml` (đã có sẵn trong repo) sẽ tự động chạy và deploy
   mỗi khi bạn push thay đổi vào thư mục `frontend/`. Theo dõi tiến trình ở tab **Actions**.
5. Sau khi deploy xong, trang của bạn sẽ có địa chỉ dạng:
   `https://<username>.github.io/<ten-repo>/`

### 6.5. Nối lại 2 đầu

Quay lại Render → Environment → cập nhật `CLIENT_ORIGIN` và `CLIENT_RESET_URL` thành URL GitHub Pages
thật ở bước 6.4 (VD: `CLIENT_ORIGIN=https://<username>.github.io`), rồi **Save Changes** để Render
deploy lại. Vậy là frontend (GitHub Pages) ↔ backend (Render) ↔ database (Atlas) đã thông nhau.

## 7. Biến môi trường (backend/.env)

| Biến               | Ý nghĩa                                                             |
|---------------------|----------------------------------------------------------------------|
| `MONGODB_URI`        | Chuỗi kết nối MongoDB Atlas                                          |
| `JWT_SECRET`          | Chuỗi bí mật để ký JWT (tự tạo, càng dài càng khó đoán)               |
| `JWT_EXPIRE`           | Thời hạn token, mặc định `30d`                                        |
| `PORT`                  | Cổng chạy server (Render tự set, để mặc định khi deploy)             |
| `CLIENT_ORIGIN`          | Danh sách domain frontend được phép gọi API (CORS), cách nhau bởi `,` |
| `CLIENT_RESET_URL`        | URL trang `reset-password.html` — dùng để build link trong email     |
| `EMAIL_SERVICE/USER/PASS`  | (tuỳ chọn) cấu hình gửi email quên mật khẩu qua Gmail                |

> Nếu không cấu hình `EMAIL_USER`/`EMAIL_PASS`, tính năng "quên mật khẩu" vẫn hoạt động ở **chế độ demo**:
> API trả kèm `devResetUrl` để test/chấm bài mà không cần gửi email thật.

## 8. Danh sách API endpoints

| Method | Endpoint                        | Mô tả                                   | Cần đăng nhập? |
|--------|----------------------------------|-------------------------------------------|:---:|
| POST   | `/api/auth/register`              | Đăng ký tài khoản                          | ✗ |
| POST   | `/api/auth/login`                  | Đăng nhập                                   | ✗ |
| GET    | `/api/auth/me`                      | Lấy thông tin bản thân                       | ✓ |
| POST   | `/api/auth/forgot-password`          | Gửi yêu cầu đặt lại mật khẩu                  | ✗ |
| PUT    | `/api/auth/reset-password/:token`     | Đặt mật khẩu mới bằng token                     | ✗ |
| GET    | `/api/posts`                           | Danh sách tin (lọc, sắp xếp, phân trang)          | ✗ |
| GET    | `/api/posts/stats`                      | Số liệu thống kê tổng quan                          | ✗ |
| GET    | `/api/posts/:id`                         | Chi tiết 1 tin                                        | ✗ |
| POST   | `/api/posts`                              | Đăng tin mới                                            | ✓ |
| PATCH  | `/api/posts/:id/status`                    | Đổi trạng thái (đã tìm thấy / mở lại) — chỉ chủ tin        | ✓ |
| PATCH  | `/api/posts/:id/match`                      | Đánh dấu "Quan tâm"                                          | ✓ |
| POST   | `/api/posts/:id/reveal`                      | Xem số điện thoại (tăng lượt xem)                              | ✗ |
| DELETE | `/api/posts/:id`                              | Xoá tin — chỉ chủ tin                                            | ✓ |

## 9. Một số quyết định thiết kế (đáng nói khi bảo vệ đồ án)

- **Vì sao Node.js/Express thay vì Firebase?** Bản gốc dùng Firebase (BaaS) gọi thẳng từ frontend.
  Bản này tách riêng backend để thể hiện rõ kỹ năng thiết kế REST API, MVC, xác thực JWT, và
  quyền hạn (chỉ chủ tin mới sửa/xoá được tin của mình) — những phần Firebase "giấu" hộ mình.
- **Vì sao lưu ảnh base64 trong MongoDB thay vì dùng dịch vụ lưu file riêng?** Ảnh được nén phía
  client xuống dưới ~900KB (dùng canvas), nằm gọn trong giới hạn 16MB/document của MongoDB — tránh
  phải trả phí / xin thêm 1 dịch vụ lưu trữ file khác, phù hợp tiêu chí "chỉ dùng dịch vụ free".
- **Vì sao polling thay vì WebSocket/Socket.IO?** Bản gốc dùng `onSnapshot` của Firestore để realtime.
  Ở đây dùng `setInterval` gọi lại API mỗi 30s — đơn giản, dễ giải thích, và tránh rủi ro mất kết nối
  WebSocket khi Render free tier "ngủ" sau 15 phút không hoạt động.
  → **Hướng mở rộng**: có thể nâng cấp bằng Socket.IO nếu muốn thể hiện thêm kỹ thuật real-time.
- **Giới hạn đã biết**: Render free tier sẽ "ngủ" sau ~15 phút không có request, khiến request đầu
  tiên sau đó mất 30–50 giây để "đánh thức" server — đây là đánh đổi tất yếu khi dùng free tier.

## 10. Giấy phép

Dự án phục vụ mục đích học tập.
