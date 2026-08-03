const express = require('express');
const router = express.Router();

const { getArticles, getArticle, createArticle, updateArticle, deleteArticle } = require('../controllers/articleController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', getArticles);
router.get('/:idOrSlug', getArticle);

// Toàn bộ thao tác với Mẹo tìm đồ / Cảnh báo lừa đảo (tạo/sửa/xoá) đều chỉ dành cho admin —
// đây là nội dung mang tính "biên tập", không phải tin đăng của người dùng thường.
router.post('/', protect, adminOnly, createArticle);
router.patch('/:id', protect, adminOnly, updateArticle);
router.delete('/:id', protect, adminOnly, deleteArticle);

module.exports = router;
