/* ============================================================
   ADMIN.JS — trang quản trị: duyệt bài & quản lý người dùng
   Chỉ dùng trong admin.html, chỉ hoạt động khi currentUser.role === 'admin'
   (backend cũng tự chặn lại nếu ai đó cố gọi thẳng API).
   ============================================================ */

// State: hàng chờ duyệt bài
let adminQueue = [];
let adminQueuePage = 1;
let adminQueueTotalPages = 1;
let adminQueueFilter = 'pending';

// State: danh sách người dùng
let adminUsers = [];
let adminUsersPage = 1;
let adminUsersTotalPages = 1;

/* ── Tab lớn: Duyệt bài / Quản lý người dùng ── */
function switchAdminTab(tab) {
  ['queue', 'users'].forEach((t) => {
    const panel = document.getElementById('admin-panel-' + t);
    const tabBtn = document.getElementById('admin-tab-' + t);
    if (panel) panel.style.display = t === tab ? 'block' : 'none';
    if (tabBtn) tabBtn.classList.toggle('active', t === tab);
  });
  if (tab === 'queue') fetchAdminQueue(1);
  if (tab === 'users') fetchAdminUsers(1);
}

/* ── Hàng chờ duyệt bài ── */
async function fetchAdminQueue(page) {
  adminQueuePage = page || 1;
  const params = new URLSearchParams();
  params.set('moderation', adminQueueFilter);
  params.set('page', adminQueuePage);
  params.set('limit', 10);
  params.set('sort', 'newest');
  try {
    const data = await api.get('/posts?' + params.toString());
    adminQueue = data.posts;
    adminQueueTotalPages = data.pages;
    renderAdminQueue(data.total);
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

function setAdminQueueFilter(f) {
  adminQueueFilter = f;
  fetchAdminQueue(1);
}

function goToAdminQueuePage(n) {
  if (n < 1 || n > adminQueueTotalPages || n === adminQueuePage) return;
  fetchAdminQueue(n);
}

async function moderatePostAction(id, action) {
  try {
    await api.patch(`/posts/${id}/moderate`, { action });
    showToast(action === 'approve' ? '✅ Đã duyệt tin đăng.' : '🚫 Đã từ chối tin đăng.');
    fetchAdminQueue(adminQueuePage);
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

async function adminDeletePost(id) {
  if (!confirm('Xoá tin đăng này khỏi hệ thống? Không thể hoàn tác.')) return;
  try {
    await api.delete(`/posts/${id}`);
    showToast('🗑️ Đã xoá tin đăng.');
    fetchAdminQueue(adminQueuePage);
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

/* ── Quản lý người dùng ── */
async function fetchAdminUsers(page) {
  adminUsersPage = page || 1;
  const params = new URLSearchParams();
  const q = (document.getElementById('admin-user-search') || {}).value?.trim();
  if (q) params.set('q', q);
  params.set('page', adminUsersPage);
  params.set('limit', 12);
  try {
    const data = await api.get('/users?' + params.toString());
    adminUsers = data.users;
    adminUsersTotalPages = data.pages;
    renderAdminUsers(data.total);
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

function goToAdminUsersPage(n) {
  if (n < 1 || n > adminUsersTotalPages || n === adminUsersPage) return;
  fetchAdminUsers(n);
}

async function setUserTrust(id, trustStatus) {
  try {
    await api.patch(`/users/${id}/trust`, { trustStatus });
    showToast('✅ Đã cập nhật trạng thái tin cậy.');
    fetchAdminUsers(adminUsersPage);
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}
