const mongoose = require('mongoose');

const TYPES = ['lost', 'found', 'pet', 'vehicle', 'person'];

const postSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: TYPES,
      required: true,
      default: 'lost',
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
      type: String, // ảnh đã nén dạng base64 (client tự nén, giới hạn ~900KB)
      default: null,
    },
    date: {
      type: String, // dạng yyyy-mm-dd, giữ String cho đơn giản khi so sánh/lọc
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
  { timestamps: true } // tự thêm createdAt / updatedAt
);

// Index giúp truy vấn lọc & sắp xếp nhanh hơn khi dữ liệu lớn dần
postSchema.index({ createdAt: -1 });
postSchema.index({ type: 1, district: 1, status: 1 });

module.exports = mongoose.model('Post', postSchema);
