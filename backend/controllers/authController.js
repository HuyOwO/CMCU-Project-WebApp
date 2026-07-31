const crypto = require('crypto');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');

function sendAuthResponse(user, statusCode, res) {
  const token = generateToken(user._id);
  res.status(statusCode).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      trustStatus: user.trustStatus,
    },
  });
}

async function register(req, res, next) {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ message: 'Vui lòng nhập họ và tên.' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ message: 'Email không hợp lệ.' });
    if (phone && !/^0\d{9,10}$/.test(phone))
      return res.status(400).json({ message: 'Số điện thoại không hợp lệ.' });
    if (!password || password.length < 6)
      return res.status(400).json({ message: 'Mật khẩu tối thiểu 6 ký tự.' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email này đã được đăng ký.' });

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      phone,
      password,
    });

    sendAuthResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ message: 'Vui lòng nhập email.' });
    if (!password) return res.status(400).json({ message: 'Vui lòng nhập mật khẩu.' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }

    sendAuthResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res) {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role,
      trustStatus: req.user.trustStatus,
    },
  });
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Vui lòng nhập email hợp lệ.' });
    }

    const genericMsg =
      'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi tới hộp thư của bạn.';

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json({ message: genericMsg });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_RESET_URL || 'http://localhost:5500/reset-password.html'}?token=${resetToken}`;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Đặt lại mật khẩu — Đồ Thất Lạc HN',
        text:
          `Bạn (hoặc ai đó) vừa yêu cầu đặt lại mật khẩu cho tài khoản Đồ Thất Lạc HN.\n\n` +
          `Nhấn vào link sau để đặt mật khẩu mới (link hết hạn sau 15 phút):\n${resetUrl}\n\n` +
          `Nếu không phải bạn yêu cầu, hãy bỏ qua email này.`,
      });
      res.json({ message: genericMsg });
    } catch (emailErr) {
      console.warn('⚠️  Chưa cấu hình email thật, trả devResetUrl để demo:', emailErr.message);
      res.json({ message: genericMsg, devResetUrl: resetUrl });
    }
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu tối thiểu 6 ký tự.' });
    }

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendAuthResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, getMe, forgotPassword, resetPassword };
