const mongoose = require('mongoose');

// kind = 'tip'  -> bài trong mục "Mẹo tìm đồ"
// kind = 'scam' -> bài trong mục "Số điện thoại lừa đảo / Cảnh báo lừa đảo"
const KINDS = ['tip', 'scam'];

function slugify(str) {
  return str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // bỏ dấu tiếng Việt
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const articleSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: KINDS,
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Vui lòng nhập tiêu đề bài viết'],
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    // Ảnh đại diện — base64 nén (giống ảnh của bài đăng tin) hoặc URL ảnh ngoài
    thumbnail: {
      type: String,
      default: null,
    },
    summary: {
      type: String,
      default: '',
      trim: true,
    },
    // Nội dung đầy đủ — lưu dạng nhiều đoạn văn (mỗi phần tử = 1 đoạn), hiển thị
    // dạng bài viết ở trang chi tiết. Đơn giản hơn so với lưu HTML để tránh rủi ro XSS.
    content: {
      type: [String],
      default: [],
    },
    // Chỉ áp dụng cho kind = 'scam': số điện thoại / STK bị tố cáo lừa đảo,
    // hiển thị nổi bật ở đầu trang chi tiết cảnh báo.
    scamContact: {
      type: String,
      default: '',
      trim: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPinned: {
      type: Boolean,
      default: false,
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

articleSchema.index({ kind: 1, createdAt: -1 });

// Tự sinh slug duy nhất từ tiêu đề trước khi lưu (chỉ khi tạo mới hoặc đổi tiêu đề)
articleSchema.pre('validate', async function generateSlug(next) {
  if (!this.isModified('title') && this.slug) return next();

  const base = slugify(this.title) || 'bai-viet';
  let candidate = base;
  let i = 1;

  const Article = mongoose.model('Article');
  // eslint-disable-next-line no-await-in-loop
  while (await Article.exists({ slug: candidate, _id: { $ne: this._id } })) {
    i += 1;
    candidate = `${base}-${i}`;
  }
  this.slug = candidate;
  next();
});

module.exports = mongoose.model('Article', articleSchema);
module.exports.KINDS = KINDS;
