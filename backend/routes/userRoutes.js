const express = require('express');
const router = express.Router();

const { getUsers, setTrustStatus } = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, adminOnly, getUsers);
router.patch('/:id/trust', protect, adminOnly, setTrustStatus);

module.exports = router;
