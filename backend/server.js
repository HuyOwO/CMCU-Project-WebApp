require('dotenv').config();
const express = require('express');
const cors = require('cors');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const articleRoutes = require('./routes/articleRoutes');
const userRoutes = require('./routes/userRoutes');

// Kết nối MongoDB Atlas
connectDB();

const app = express();

// Cho phép nhận JSON body lớn hơn mặc định vì có ảnh nén base64 (~900KB)
app.use(express.json({ limit: '5mb' }));

// ── Cấu hình CORS: chỉ cho phép các domain frontend trong "danh sách trắng" ──
const whitelist = (process.env.CLIENT_ORIGIN || 'http://localhost:5500,http://127.0.0.1:5500')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || whitelist.includes(origin)) return callback(null, true);
      callback(new Error('CORS: origin này không được phép gọi API.'));
    },
    credentials: true,
  })
);

// Route kiểm tra server còn sống (dùng để test & để "đánh thức" Render free tier)
app.get('/', (req, res) => {
  res.json({ message: '📦 Đồ Thất Lạc HN API đang chạy...', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/users', userRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`));
