const express = require('express');
const router = express.Router();

const {
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
} = require('../controllers/postController');
const { protect, optionalAuth, adminOnly } = require('../middleware/auth');

// Lưu ý thứ tự: '/stats' và các route tĩnh khác phải khai báo TRƯỚC '/:id',
// nếu không Express sẽ hiểu nhầm chúng là 1 giá trị :id
//
// optionalAuth: không bắt buộc đăng nhập, nhưng nếu có token hợp lệ thì gắn req.user
// để controller biết ai đang xem (phục vụ "Tin của tôi" + hiện tin pending cho chủ/admin)
router.get('/', optionalAuth, getPosts);
router.get('/stats', getStats);
router.get('/:id/related', getRelatedPosts);
router.get('/:id', optionalAuth, getPost);

router.post('/', protect, createPost);
router.patch('/:id', protect, updatePost);
router.patch('/:id/status', protect, toggleStatus);
router.patch('/:id/moderate', protect, adminOnly, moderatePost);
router.patch('/:id/match', protect, toggleMatch);
router.post('/:id/reveal', revealPhone);
router.delete('/:id', protect, deletePost);

module.exports = router;
