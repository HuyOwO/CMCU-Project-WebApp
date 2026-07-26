const mongoose = require('mongoose');

async function connectDB() {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB đã kết nối: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ Lỗi kết nối MongoDB: ${err.message}`);
    process.exit(1); // dừng server nếu không kết nối được DB
  }
}

module.exports = connectDB;
