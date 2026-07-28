const mongoose = require('mongoose');
const Article = require('../models/Article');

const PAGE_SIZE_DEFAULT = 9;

// @route  GET /api/articles?kind=tip|scam&page=&limit=&q=
async function getArticles(req, res, next) {
  try {
    const { kind, page, limit, q } = req.query;

    const filter = {};
    if (kind) filter.kind = kind;
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: regex }, { summary: regex }];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.max(parseInt(limit, 10) || PAGE_SIZE_DEFAULT, 1);

    const [articles, total] = await Promise.all([
      Article.find(filter)
        .select('-content')
        .sort({ isPinned: -1, createdAt: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize),
      Article.countDocuments(filter),
    ]);

    res.json({
      articles,
      total,
      page: pageNum,
      pages: Math.max(Math.ceil(total / pageSize), 1),
    });
  } catch (err) {
    next(err);
  }
}

// @route  GET /api/articles/:idOrSlug — chấp nhận cả _id lẫn slug (VD /tips/hanh-vi-cua-meo-di-lac)
async function getArticle(req, res, next) {
  try {
    const { idOrSlug } = req.params;
    const query = mongoose.isValidObjectId(idOrSlug) ? { _id: idOrSlug } : { slug: idOrSlug };

    const article = await Article.findOneAndUpdate(query, { $inc: { views: 1 } }, { new: true });
    if (!article) return res.status(404).json({ message: 'Không tìm thấy bài viết.' });

    res.json({ article });
  } catch (err) {
    next(err);
  }
}

// @route  POST /api/articles   (cần đăng nhập)
async function createArticle(req, res, next) {
  try {
    const { kind, title, thumbnail, summary, content, scamContact, isPinned } = req.body;

    if (!kind || !Article.KINDS.includes(kind)) {
      return res.status(400).json({ message: 'Loại bài viết không hợp lệ.' });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập tiêu đề bài viết.' });
    }

    const contentArr = Array.isArray(content)
      ? content.filter((p) => p && p.trim())
      : String(content || '')
          .split('\n')
          .map((p) => p.trim())
          .filter(Boolean);

    if (!contentArr.length) {
      return res.status(400).json({ message: 'Vui lòng nhập nội dung bài viết.' });
    }

    const article = await Article.create({
      kind,
      title: title.trim(),
      thumbnail: thumbnail || null,
      summary: (summary || '').trim(),
      content: contentArr,
      scamContact: (scamContact || '').trim(),
      isPinned: !!isPinned,
      author: req.user._id,
      authorName: req.user.name,
    });

    res.status(201).json({ article });
  } catch (err) {
    next(err);
  }
}

// @route  PATCH /api/articles/:id   (chủ bài viết hoặc admin)
async function updateArticle(req, res, next) {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Không tìm thấy bài viết.' });

    const isOwner = article.author.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền sửa bài viết này.' });
    }

    const { title, thumbnail, summary, content, scamContact, isPinned } = req.body;
    if (title !== undefined) article.title = title.trim();
    if (thumbnail !== undefined) article.thumbnail = thumbnail;
    if (summary !== undefined) article.summary = summary.trim();
    if (content !== undefined) {
      article.content = Array.isArray(content) ? content.filter((p) => p && p.trim()) : article.content;
    }
    if (scamContact !== undefined) article.scamContact = scamContact.trim();
    if (isPinned !== undefined) article.isPinned = !!isPinned;

    await article.save();
    res.json({ article });
  } catch (err) {
    next(err);
  }
}

// @route  DELETE /api/articles/:id   (chủ bài viết hoặc admin)
async function deleteArticle(req, res, next) {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Không tìm thấy bài viết.' });

    const isOwner = article.author.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền xoá bài viết này.' });
    }

    await article.deleteOne();
    res.json({ message: 'Đã xoá bài viết.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getArticles, getArticle, createArticle, updateArticle, deleteArticle };
