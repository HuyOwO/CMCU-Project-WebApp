const User = require('../models/User');

const PAGE_SIZE_DEFAULT = 20;

// @route  GET /api/users?q=&page=&limit=   (admin)
async function getUsers(req, res, next) {
  try {
    const { q, page, limit } = req.query;

    const filter = {};
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.max(parseInt(limit, 10) || PAGE_SIZE_DEFAULT, 1);

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('name email phone role trustStatus createdAt')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize),
      User.countDocuments(filter),
    ]);

    res.json({ users, total, page: pageNum, pages: Math.max(Math.ceil(total / pageSize), 1) });
  } catch (err) {
    next(err);
  }
}

// @route  PATCH /api/users/:id/trust   body: { trustStatus: 'none'|'trusted'|'untrusted' }   (admin)
async function setTrustStatus(req, res, next) {
  try {
    const { trustStatus } = req.body;
    if (!['none', 'trusted', 'untrusted'].includes(trustStatus)) {
      return res.status(400).json({ message: 'Trạng thái tin cậy không hợp lệ.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    user.trustStatus = trustStatus;
    await user.save();

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        trustStatus: user.trustStatus,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getUsers, setTrustStatus };
