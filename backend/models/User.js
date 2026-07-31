const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Vui lòng nhập họ và tên'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Vui lòng nhập email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email không hợp lệ'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    password: {
      type: String,
      required: [true, 'Vui lòng nhập mật khẩu'],
      minlength: 6,
      select: false,
    },
    // Vai trò tài khoản — dùng để phân quyền quản trị viên (VD: duyệt bài, xoá bài,
    // đăng Mẹo tìm đồ/Cảnh báo lừa đảo, gắn nhãn tin cậy cho user khác).
    // Muốn nâng 1 tài khoản lên admin: vào MongoDB Atlas > collection users > sửa field role = 'admin'.
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    // Nhãn tin cậy — chỉ admin mới gắn được (qua trang quản trị). Người dùng 'trusted'
    // được tự động duyệt bài ngay khi đăng (bỏ qua hàng chờ duyệt).
    trustStatus: {
      type: String,
      enum: ['none', 'trusted', 'untrusted'],
      default: 'none',
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
