/**
 * seedArticles.js — tạo vài bài "Mẹo tìm đồ" và "Cảnh báo lừa đảo" mẫu để demo giao diện mới.
 * Chạy 1 lần: node backend/scripts/seedArticles.js
 * (cần đã cấu hình MONGODB_URI trong backend/.env)
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Article = require('../models/Article');

const TIPS = [
  {
    title: '5 việc cần làm ngay khi phát hiện bị mất đồ',
    summary: 'Càng hành động sớm, cơ hội tìm lại đồ càng cao — đây là thứ tự ưu tiên bạn nên làm.',
    content: [
      'Bình tĩnh nhớ lại lộ trình di chuyển gần nhất và những nơi bạn đã dừng chân, lấy đồ ra sử dụng.',
      'Quay lại kiểm tra những địa điểm đó nếu còn kịp, đặc biệt là quán ăn, taxi/xe công nghệ, thang máy.',
      'Đăng tin lên Đồ Thất Lạc HN kèm ảnh và đặc điểm nhận dạng càng chi tiết càng tốt để tăng khả năng được nhận ra.',
      'Nếu mất giấy tờ tùy thân, khóa ngay các dịch vụ liên quan (ngân hàng, ví điện tử) để tránh bị lợi dụng.',
      'Trình báo công an phường gần nhất nếu là tài sản giá trị lớn hoặc giấy tờ quan trọng, để có biên bản làm căn cứ sau này.',
    ],
  },
  {
    title: 'Cách chụp ảnh đồ vật để đăng tin dễ được nhận ra hơn',
    summary: 'Một bức ảnh rõ nét, đúng góc có thể quyết định việc chủ nhân có nhận ra đồ của mình hay không.',
    content: [
      'Chụp ở nơi đủ sáng, tránh chụp ngược sáng khiến vật thể bị tối và mất chi tiết.',
      'Ưu tiên những góc thể hiện rõ đặc điểm riêng: vết trầy xước, hình dán, khắc tên, màu sắc đặc trưng.',
      'Nếu là thú cưng, nên có cả ảnh cận mặt và ảnh toàn thân để dễ nhận diện giống loài, kích cỡ.',
      'Tránh chụp kèm các vật dụng cá nhân nhạy cảm khác (giấy tờ, thẻ ngân hàng) lộ thông tin không cần thiết.',
    ],
  },
  {
    title: 'Thú cưng đi lạc: nên tìm ở đâu trước tiên?',
    summary: 'Chó mèo đi lạc thường không đi quá xa nhà trong 24 giờ đầu — đây là những nơi nên kiểm tra trước.',
    content: [
      'Kiểm tra kỹ quanh nhà, gầm xe, bụi cây, ban công hàng xóm — thú cưng hoảng sợ thường trốn ở nơi kín.',
      'Hỏi thăm hàng xóm, bảo vệ khu vực, người bán hàng gần đó xem có ai nhìn thấy không.',
      'Đăng tin kèm ảnh rõ mặt lên Đồ Thất Lạc HN và các hội nhóm thú cưng theo khu vực.',
      'Rải một ít đồ có mùi quen thuộc (chỗ nằm, bát ăn) gần nơi thú cưng đi lạc để dẫn dụ chúng quay lại.',
    ],
  },
];

const SCAMS = [
  {
    title: 'Cảnh báo: giả vờ nhặt được đồ để yêu cầu chuyển khoản "tiền chuộc"',
    summary: 'Đối tượng nhắn tin nhận đã giữ đồ của bạn và yêu cầu chuyển khoản trước mới trả — đây là dấu hiệu lừa đảo.',
    scamContact: '09xx xxx xxx (số điện thoại ví dụ, thay bằng số thật khi đăng)',
    content: [
      'Đối tượng chủ động nhắn tin/gọi điện tự nhận đang giữ món đồ bạn vừa đăng tin tìm.',
      'Yêu cầu chuyển khoản trước một khoản "phí giữ đồ" hoặc "tiền chuộc" rồi mới hẹn gặp trả đồ.',
      'Sau khi nhận tiền, đối tượng chặn liên lạc hoặc tiếp tục viện lý do trì hoãn không trả đồ.',
      'Nguyên tắc an toàn: không chuyển khoản trước khi thấy đồ thật; luôn hẹn gặp ở nơi công cộng, đông người.',
    ],
  },
  {
    title: 'Cảnh báo: mạo danh nhân viên ngân hàng gọi điện vì mất thẻ/giấy tờ',
    summary: 'Sau khi đăng tin mất ví/thẻ, một số người nhận được cuộc gọi mạo danh ngân hàng yêu cầu đọc mã OTP.',
    scamContact: '19xx xxx xxx (số điện thoại ví dụ, thay bằng số thật khi đăng)',
    content: [
      'Đối tượng xem được thông tin từ tin đăng mất ví/thẻ ngân hàng rồi gọi điện tự xưng là nhân viên ngân hàng.',
      'Viện lý do "khóa thẻ khẩn cấp" hoặc "xác minh chủ thẻ" để yêu cầu cung cấp mã OTP, số CVV.',
      'Ngân hàng thật KHÔNG BAO GIỜ yêu cầu bạn đọc mã OTP qua điện thoại trong bất kỳ trường hợp nào.',
      'Nếu nhận được cuộc gọi như vậy, hãy cúp máy và gọi trực tiếp lên tổng đài chính thức của ngân hàng để xác minh.',
    ],
  },
];

async function run() {
  await connectDB();

  let admin = await User.findOne({ email: 'admin@dothatlachn.vn' });
  if (!admin) {
    admin = await User.create({
      name: 'Đồ Thất Lạc HN',
      email: 'admin@dothatlachn.vn',
      phone: '',
      password: 'ChangeMe123', // 👉 đổi mật khẩu này sau khi seed xong
      role: 'admin',
    });
    console.log('✅ Đã tạo tài khoản admin demo: admin@dothatlachn.vn / ChangeMe123');
  }

  for (const t of TIPS) {
    const exists = await Article.findOne({ title: t.title });
    if (exists) continue;
    await Article.create({ ...t, kind: 'tip', author: admin._id, authorName: admin.name });
  }

  for (const s of SCAMS) {
    const exists = await Article.findOne({ title: s.title });
    if (exists) continue;
    await Article.create({ ...s, kind: 'scam', author: admin._id, authorName: admin.name });
  }

  console.log('✅ Seed xong bài viết mẫu (Mẹo tìm đồ + Cảnh báo lừa đảo).');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('❌ Lỗi seed:', err);
  process.exit(1);
});
