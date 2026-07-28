const express = require('express');
const router = express.Router();

const {
  getPosts,
  getStats,
  getPost,
  getRelatedPosts,
  createPost,
  toggleStatus,
  toggleMatch,
  revealPhone,
  deletePost,
} = require('../controllers/postController');
const { protect } = require('../middleware/auth');

// Lưu ý thứ tự: '/stats' và các route tĩnh khác phải khai báo TRƯỚC '/:id',
// nếu không Express sẽ hiểu nhầm chúng là 1 giá trị :id
router.get('/', getPosts);
router.get('/stats', getStats);
router.get('/:id/related', getRelatedPosts);
router.get('/:id', getPost);

router.post('/', protect, createPost);
router.patch('/:id/status', protect, toggleStatus);
router.patch('/:id/match', protect, toggleMatch);
router.post('/:id/reveal', revealPhone);
router.delete('/:id', protect, deletePost);

module.exports = router;
