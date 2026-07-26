const express = require('express');
const router = express.Router();

const {
  getPosts,
  getStats,
  getPost,
  createPost,
  toggleStatus,
  toggleMatch,
  revealPhone,
  deletePost,
} = require('../controllers/postController');
const { protect } = require('../middleware/auth');

// Lưu ý thứ tự: '/stats' phải khai báo TRƯỚC '/:id',
// nếu không Express sẽ hiểu nhầm "stats" là 1 giá trị :id
router.get('/', getPosts);
router.get('/stats', getStats);
router.get('/:id', getPost);

router.post('/', protect, createPost);
router.patch('/:id/status', protect, toggleStatus);
router.patch('/:id/match', protect, toggleMatch);
router.post('/:id/reveal', revealPhone);
router.delete('/:id', protect, deletePost);

module.exports = router;
