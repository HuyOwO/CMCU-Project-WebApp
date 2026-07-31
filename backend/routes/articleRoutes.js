const express = require('express');
const router = express.Router();

const { getArticles, getArticle, createArticle, updateArticle, deleteArticle } = require('../controllers/articleController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', getArticles);
router.get('/:idOrSlug', getArticle);

// Chỉ admin được đăng Mẹo tìm đồ / Cảnh báo lừa đảo (đây là nội dung mang tính "biên tập",
// không phải tin đăng của người dùng thường).
router.post('/', protect, adminOnly, createArticle);
router.patch('/:id', protect, updateArticle);
router.delete('/:id', protect, deleteArticle);

module.exports = router;
