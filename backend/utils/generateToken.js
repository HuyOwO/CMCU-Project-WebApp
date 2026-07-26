const jwt = require('jsonwebtoken');

// Tạo JWT chứa id người dùng, dùng để xác thực các request sau này
function generateToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
}

module.exports = generateToken;
