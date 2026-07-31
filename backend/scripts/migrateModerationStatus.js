/**
 * migrateModerationStatus.js
 * ⚠️ BẮT BUỘC chạy 1 lần sau khi deploy tính năng "duyệt bài" nếu database đã có
 * sẵn tin đăng từ trước. Vì trang công khai giờ chỉ hiện tin có moderationStatus
 * = 'approved', mà các tin cũ hoàn toàn CHƯA có field này trong MongoDB, nên nếu
 * không migrate thì toàn bộ tin cũ sẽ biến mất khỏi trang chủ (dù dữ liệu vẫn còn
 * nguyên trong DB, chỉ là bị bộ lọc chặn lại).
 *
 * Chạy: node backend/scripts/migrateModerationStatus.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Post = require('../models/Post');

async function run() {
  await connectDB();

  const result = await Post.updateMany(
    { moderationStatus: { $exists: false } },
    { $set: { moderationStatus: 'approved' } }
  );

  console.log(`✅ Đã cập nhật ${result.modifiedCount} tin đăng cũ sang trạng thái 'approved'.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('❌ Lỗi migrate:', err);
  process.exit(1);
});
