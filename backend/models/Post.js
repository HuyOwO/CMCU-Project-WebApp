const mongoose = require('mongoose');

const TYPES = ['lost', 'found', 'pet', 'vehicle', 'person'];

// Danh mục đồ vật — dùng cho bộ lọc "Danh mục" ở sidebar (theo mẫu timdothatlac.vn)
const CATEGORIES = ['wallet', 'pet', 'electronics', 'household', 'vehicle', 'other'];

const postSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: TYPES,
      required: true,
      default: 'lost',
    },
    // Danh mục đồ vật cụ thể — độc lập với "type" (mất/nhặt được/thú cưng...),
    // dùng để lọc theo sidebar kiểu "Ví/Giấy tờ, Điện thoại/Tablet/Laptop..."
    // Field này KHÔNG bắt buộc để không phá dữ liệu cũ; nếu bỏ trống sẽ tự suy ra
    // từ "type" khi hiển thị (xem hàm inferCategory ở postController).
    category: {
      type: String,
      enum: CATEGORIES,
      default: 'other',
    },
    name: {
      type: String,
      required: [true, 'Vui lòng nhập tên đồ vật / đặc điểm nhận dạng'],
      trim: true,
    },
    district: {
      type: String,
      required: [true, 'Vui lòng chọn quận / khu vực'],
    },
    location: {
      type: String,
      required: [true, 'Vui lòng nhập địa điểm cụ thể'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Vui lòng nhập số điện thoại liên hệ'],
      match: [/^0\d{9,10}$/, 'Số điện thoại không hợp lệ'],
    },
    desc: {
      type: String,
      default: 'Không có mô tả thêm.',
    },
    img: {
      type: String,
      default: null,
    },
    date: {
      type: String,
      default: '',
    },
    isUrgent: {
      type: Boolean,
      default: false,
    },
    reward: {
      type: String,
      default: '',
    },
    // Trạng thái duyệt bài — admin phải duyệt ('approved') thì tin mới hiện công khai.
    // Tin của user có trustStatus='trusted' được tự động approved ngay khi đăng
    // (xem postController.createPost). Mặc định 'pending' cho tin thường.
    moderationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
    },
    views: {
      type: Number,
      default: 0,
    },
    matches: {
      type: Number,
      default: 0,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });
postSchema.index({ type: 1, district: 1, status: 1 });
postSchema.index({ category: 1 });
postSchema.index({ moderationStatus: 1 });

module.exports = mongoose.model('Post', postSchema);
module.exports.TYPES = TYPES;
module.exports.CATEGORIES = CATEGORIES;
