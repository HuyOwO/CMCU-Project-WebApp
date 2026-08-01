const Post = require('../models/Post');

const PAGE_SIZE_DEFAULT = 8;

// Với các tin cũ chưa có field "category" (hoặc mặc định 'other'), suy luận tạm
// từ "type" để bộ lọc danh mục vẫn hoạt động hợp lý trên dữ liệu cũ.
function inferCategoryFromType(type) {
  if (type === 'pet') return 'pet';
  if (type === 'vehicle') return 'vehicle';
  return null;
}

// Cho phép truyền category dạng 1 giá trị ("pet") hoặc nhiều giá trị cách nhau
// bởi dấu phẩy ("pet,vehicle") — khớp với checkbox nhiều lựa chọn ở sidebar.
function parseCategoryParam(category) {
  if (!category) return null;
  const arr = String(category)
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
  return arr.length ? arr : null;
}

// @route  GET /api/posts?type=&category=&district=&status=&urgent=&dateFrom=&dateTo=&q=&sort=&page=&limit=&excludeId=&mine=1&moderation=pending
// Cần optionalAuth ở route để biết req.user (nếu có) mà không bắt buộc đăng nhập.
async function getPosts(req, res, next) {
  try {
    const { type, category, district, status, urgent, dateFrom, dateTo, q, sort, page, limit, excludeId, mine, moderation } =
      req.query;

    const filter = {};

    // ── Quyết định phạm vi hiển thị theo trạng thái duyệt bài ──
    if (mine === '1' && req.user) {
      // "Tin của tôi": xem tất cả tin của chính mình bất kể trạng thái duyệt
      filter.author = req.user._id;
      if (moderation && moderation !== 'all') filter.moderationStatus = moderation;
    } else if (moderation && req.user && req.user.role === 'admin') {
      // Trang quản trị: admin lọc theo 1 trạng thái cụ thể, hoặc 'all' = mọi trạng thái
      if (moderation !== 'all') filter.moderationStatus = moderation;
    } else {
      // Công khai: chỉ hiện tin đã được duyệt
      filter.moderationStatus = 'approved';
    }

    if (type && type !== 'all') filter.type = type;
    if (district) filter.district = district;
    if (status) filter.status = status;
    if (urgent === 'urgent') filter.isUrgent = true;
    if (urgent === 'reward') filter.reward = { $nin: [null, ''] };
    if (excludeId) filter._id = { $ne: excludeId };

    const categories = parseCategoryParam(category);
    if (categories) {
      const legacyTypes = categories
        .map((c) => (c === 'pet' ? 'pet' : c === 'vehicle' ? 'vehicle' : null))
        .filter(Boolean);
      filter.$or = [
        { category: { $in: categories } },
        ...(legacyTypes.length ? [{ category: { $exists: false }, type: { $in: legacyTypes } }] : []),
      ];
    }

    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = dateFrom;
      if (dateTo) filter.date.$lte = dateTo;
    }
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const textOr = [{ name: regex }, { location: regex }, { district: regex }, { desc: regex }];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: textOr }];
        delete filter.$or;
      } else {
        filter.$or = textOr;
      }
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'views') sortOption = { views: -1 };
    if (sort === 'urgent') sortOption = { isUrgent: -1, createdAt: -1 };

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.max(parseInt(limit, 10) || PAGE_SIZE_DEFAULT, 1);

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .sort(sortOption)
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize),
      Post.countDocuments(filter),
    ]);

    const postsOut = posts.map((p) => {
      const obj = p.toObject();
      obj.displayCategory =
        obj.category && obj.category !== 'other' ? obj.category : inferCategoryFromType(obj.type) || obj.category || 'other';
      return obj;
    });

    res.json({
      posts: postsOut,
      total,
      page: pageNum,
      pages: Math.max(Math.ceil(total / pageSize), 1),
    });
  } catch (err) {
    next(err);
  }
}

// @route  GET /api/posts/stats — chỉ tính trên tin đã duyệt (số liệu công khai)
async function getStats(req, res, next) {
  try {
    const base = { moderationStatus: 'approved' };
    const [total, lost, found, closed, urgent] = await Promise.all([
      Post.countDocuments(base),
      Post.countDocuments({ ...base, type: 'lost' }),
      Post.countDocuments({ ...base, type: 'found' }),
      Post.countDocuments({ ...base, status: 'closed' }),
      Post.countDocuments({ ...base, isUrgent: true, status: 'open' }),
    ]);
    res.json({ total, lost, found, closed, urgent });
  } catch (err) {
    next(err);
  }
}

// @route  GET /api/posts/:id  — cần optionalAuth: tin chưa duyệt chỉ chủ tin/admin xem được
async function getPost(req, res, next) {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'name trustStatus');
    if (!post) return res.status(404).json({ message: 'Không tìm thấy tin đăng.' });

    const isOwner = req.user && post.author && String(post.author._id) === String(req.user._id);
    const isAdmin = req.user && req.user.role === 'admin';

    if (post.moderationStatus !== 'approved' && !isOwner && !isAdmin) {
      // Ẩn như thể không tồn tại, tránh lộ thông tin tin đang chờ duyệt/bị từ chối
      return res.status(404).json({ message: 'Không tìm thấy tin đăng.' });
    }

    res.json({ post });
  } catch (err) {
    next(err);
  }
}

// @route  GET /api/posts/:id/related — vài tin cùng danh mục, chỉ lấy tin đã duyệt
async function getRelatedPosts(req, res, next) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy tin đăng.' });

    const cat = post.category && post.category !== 'other' ? post.category : inferCategoryFromType(post.type);

    const filter = { _id: { $ne: post._id }, status: 'open', moderationStatus: 'approved' };
    if (cat) filter.category = cat;
    else filter.type = post.type;

    const related = await Post.find(filter).sort({ createdAt: -1 }).limit(4);
    res.json({ posts: related });
  } catch (err) {
    next(err);
  }
}

// @route  POST /api/posts   (cần đăng nhập) — tự động duyệt nếu người đăng là 'trusted'
async function createPost(req, res, next) {
  try {
    const { type, category, name, district, location, phone, desc, img, date, isUrgent, reward } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ message: 'Vui lòng điền tên đồ vật.' });
    if (!location || !location.trim())
      return res.status(400).json({ message: 'Vui lòng điền địa điểm cụ thể.' });
    if (!phone) return res.status(400).json({ message: 'Vui lòng nhập số điện thoại liên hệ.' });
    if (!/^0\d{9,10}$/.test(phone))
      return res.status(400).json({ message: 'Số điện thoại không hợp lệ (VD: 0912345678).' });
    if (!category || !Post.CATEGORIES.includes(category)) {
      return res.status(400).json({ message: 'Vui lòng chọn danh mục đồ vật.' });
    }

    const autoApprove = req.user.trustStatus === 'trusted' || req.user.role === 'admin';

    const post = await Post.create({
      type: type || 'lost',
      category,
      name: name.trim(),
      district,
      location: location.trim(),
      phone,
      desc: (desc || '').trim() || 'Không có mô tả thêm.',
      img: img || null,
      date,
      isUrgent: !!isUrgent,
      reward: (reward || '').trim(),
      author: req.user._id,
      authorName: req.user.name,
      moderationStatus: autoApprove ? 'approved' : 'pending',
    });

    res.status(201).json({ post, autoApproved: autoApprove });
  } catch (err) {
    next(err);
  }
}

// @route  PATCH /api/posts/:id/status  (chỉ chủ tin)
async function toggleStatus(req, res, next) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy tin đăng.' });

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Chỉ người đăng tin mới có thể cập nhật trạng thái.' });
    }

    post.status = post.status === 'open' ? 'closed' : 'open';
    await post.save();
    res.json({ post });
  } catch (err) {
    next(err);
  }
}

// @route  PATCH /api/posts/:id   (chủ tin hoặc admin) — sửa nội dung tin đăng.
// Nếu người sửa không phải admin/không phải user 'trusted', tin quay lại 'pending'
// để admin duyệt lại (tránh lách duyệt bằng cách đăng nội dung vô hại rồi sửa thành lừa đảo).
async function updatePost(req, res, next) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy tin đăng.' });

    const isOwner = post.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Bạn không có quyền sửa tin này.' });
    }

    const { type, category, name, district, location, phone, desc, img, date, isUrgent, reward } = req.body;

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: 'Vui lòng điền tên đồ vật.' });
      post.name = name.trim();
    }
    if (location !== undefined) {
      if (!location.trim()) return res.status(400).json({ message: 'Vui lòng điền địa điểm cụ thể.' });
      post.location = location.trim();
    }
    if (phone !== undefined) {
      if (!/^0\d{9,10}$/.test(phone)) {
        return res.status(400).json({ message: 'Số điện thoại không hợp lệ (VD: 0912345678).' });
      }
      post.phone = phone;
    }
    if (type !== undefined) post.type = type;
    if (category !== undefined) {
      if (!Post.CATEGORIES.includes(category)) {
        return res.status(400).json({ message: 'Danh mục không hợp lệ.' });
      }
      post.category = category;
    }
    if (district !== undefined) post.district = district;
    if (desc !== undefined) post.desc = (desc || '').trim() || 'Không có mô tả thêm.';
    if (img !== undefined) post.img = img;
    if (date !== undefined) post.date = date;
    if (isUrgent !== undefined) post.isUrgent = !!isUrgent;
    if (reward !== undefined) post.reward = (reward || '').trim();

    let needsReview = false;
    if (!isAdmin) {
      needsReview = req.user.trustStatus !== 'trusted';
      post.moderationStatus = needsReview ? 'pending' : 'approved';
    }

    await post.save();
    res.json({ post, needsReview });
  } catch (err) {
    next(err);
  }
}

// @route  PATCH /api/posts/:id/moderate   body: { action: 'approve'|'reject' }   (admin)
async function moderatePost(req, res, next) {
  try {
    const { action } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Hành động không hợp lệ.' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy tin đăng.' });

    post.moderationStatus = action === 'approve' ? 'approved' : 'rejected';
    await post.save();

    res.json({ post });
  } catch (err) {
    next(err);
  }
}

// @route  PATCH /api/posts/:id/match  (cần đăng nhập)
async function toggleMatch(req, res, next) {
  try {
    const inc = req.body.action === 'remove' ? -1 : 1;

    const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { matches: inc } }, { new: true });
    if (!post) return res.status(404).json({ message: 'Không tìm thấy tin đăng.' });

    if (post.matches < 0) {
      post.matches = 0;
      await post.save();
    }
    res.json({ post });
  } catch (err) {
    next(err);
  }
}

// @route  POST /api/posts/:id/reveal
async function revealPhone(req, res, next) {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true });
    if (!post) return res.status(404).json({ message: 'Không tìm thấy tin đăng.' });
    res.json({ phone: post.phone, views: post.views });
  } catch (err) {
    next(err);
  }
}

// @route  DELETE /api/posts/:id  (chủ tin HOẶC admin)
async function deletePost(req, res, next) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy tin đăng.' });

    const isOwner = post.author.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền xoá tin này.' });
    }

    await post.deleteOne();
    res.json({ message: 'Đã xoá tin đăng.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPosts,
  getStats,
  getPost,
  getRelatedPosts,
  createPost,
  updatePost,
  toggleStatus,
  moderatePost,
  toggleMatch,
  revealPhone,
  deletePost,
};
