const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401);
    return next(new Error('Bạn cần đăng nhập để thực hiện thao tác này.'));
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id);
    if (!req.user) {
      res.status(401);
      return next(new Error('Tài khoản của phiên đăng nhập này không còn tồn tại.'));
    }
    next();
  } catch (err) {
    res.status(401);
    next(new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn, vui lòng đăng nhập lại.'));
  }
}

// Middleware optional: nếu có token hợp lệ thì gắn req.user, không có/lỗi thì vẫn cho qua
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
  } catch (err) {
    /* bỏ qua, coi như khách */
  }
  next();
}

// Middleware yêu cầu quyền admin — LUÔN dùng sau protect (protect gắn req.user trước)
function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403);
    return next(new Error('Chỉ quản trị viên mới có quyền thực hiện thao tác này.'));
  }
  next();
}

module.exports = { protect, optionalAuth, adminOnly };
