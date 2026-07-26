const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware kiểm tra người dùng đã đăng nhập (có JWT hợp lệ) chưa
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

module.exports = { protect };
