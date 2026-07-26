const Post = require('../models/Post');

const PAGE_SIZE_DEFAULT = 8;

// @route  GET /api/posts?type=&district=&status=&urgent=&dateFrom=&dateTo=&q=&sort=&page=&limit=
async function getPosts(req, res, next) {
  try {
    const { type, district, status, urgent, dateFrom, dateTo, q, sort, page, limit } = req.query;

    const filter = {};
    if (type && type !== 'all') filter.type = type;
    if (district) filter.district = district;
    if (status) filter.status = status;
    if (urgent === 'urgent') filter.isUrgent = true;
    if (urgent === 'reward') filter.reward = { $nin: [null, ''] };
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) filter.date.$gte = dateFrom;
      if (dateTo) filter.date.$lte = dateTo;
    }
    if (q) {
      // tìm không phân biệt hoa/thường trên tên, địa điểm, quận, mô tả
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { location: regex }, { district: regex }, { desc: regex }];
    }

    let sortOption = { createdAt: -1 }; // mới nhất (mặc định)
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

    res.json({
      posts,
      total,
      page: pageNum,
      pages: Math.max(Math.ceil(total / pageSize), 1),
    });
  } catch (err) {
    next(err);
  }
}

// @route  GET /api/posts/stats  — số liệu tổng quan cho thanh thống kê
async function getStats(req, res, next) {
  try {
    const [total, lost, found, closed, urgent] = await Promise.all([
      Post.countDocuments({}),
      Post.countDocuments({ type: 'lost' }),
      Post.countDocuments({ type: 'found' }),
      Post.countDocuments({ status: 'closed' }),
      Post.countDocuments({ isUrgent: true, status: 'open' }),
    ]);
    res.json({ total, lost, found, closed, urgent });
  } catch (err) {
    next(err);
  }
}

// @route  GET /api/posts/:id
async function getPost(req, res, next) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy tin đăng.' });
    res.json({ post });
  } catch (err) {
    next(err);
  }
}

// @route  POST /api/posts   (cần đăng nhập)
async function createPost(req, res, next) {
  try {
    const { type, name, district, location, phone, desc, img, date, isUrgent, reward } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ message: 'Vui lòng điền tên đồ vật.' });
    if (!location || !location.trim())
      return res.status(400).json({ message: 'Vui lòng điền địa điểm cụ thể.' });
    if (!phone) return res.status(400).json({ message: 'Vui lòng nhập số điện thoại liên hệ.' });
    if (!/^0\d{9,10}$/.test(phone))
      return res.status(400).json({ message: 'Số điện thoại không hợp lệ (VD: 0912345678).' });

    const post = await Post.create({
      type: type || 'lost',
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
    });

    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
}

// @route  PATCH /api/posts/:id/status  (chỉ chủ tin mới đổi được trạng thái)
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

// @route  PATCH /api/posts/:id/match  (cần đăng nhập — tránh spam ẩn danh)
// body: { action: 'add' | 'remove' }
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

// @route  POST /api/posts/:id/reveal  (không cần đăng nhập — tăng lượt xem khi bấm xem SĐT)
async function revealPhone(req, res, next) {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true });
    if (!post) return res.status(404).json({ message: 'Không tìm thấy tin đăng.' });
    res.json({ phone: post.phone, views: post.views });
  } catch (err) {
    next(err);
  }
}

// @route  DELETE /api/posts/:id  (chỉ chủ tin)
async function deletePost(req, res, next) {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy tin đăng.' });

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Chỉ người đăng tin mới có thể xoá tin này.' });
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
  createPost,
  toggleStatus,
  toggleMatch,
  revealPhone,
  deletePost,
};
