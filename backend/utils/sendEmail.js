const nodemailer = require('nodemailer');

/**
 * Gửi email qua SMTP (mặc định dùng Gmail — miễn phí).
 * Nếu chưa cấu hình EMAIL_USER / EMAIL_PASS trong .env, hàm sẽ ném lỗi;
 * authController sẽ bắt lỗi này và tự chuyển sang "chế độ demo"
 * (trả thẳng link đặt lại mật khẩu ra response thay vì gửi email thật).
 *
 * Cách lấy EMAIL_PASS cho Gmail: bật xác thực 2 bước cho tài khoản Gmail,
 * sau đó tạo "Mật khẩu ứng dụng" (App Password) tại myaccount.google.com/apppasswords
 */
async function sendEmail({ to, subject, text }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Chưa cấu hình EMAIL_USER / EMAIL_PASS trong .env');
  }

  const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Đồ Thất Lạc HN" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
  });
}

module.exports = sendEmail;
