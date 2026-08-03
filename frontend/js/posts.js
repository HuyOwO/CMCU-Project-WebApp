/* ============================================================
   POSTS.JS — state + các hành động gọi API liên quan tới "tin đăng"
   ============================================================ */

const PAGE_SIZE = 9; // lưới 3 cột

const TYPE_CFG = {
  lost: { cls: 'badge-lost', label: '🚨 Mất đồ', icon: '📦' },
  found: { cls: 'badge-found', label: 'Nhặt được', icon: '🎁' },
  pet: { cls: 'badge-pet', label: '🐾 Thú cưng', icon: '🐾' },
  vehicle: { cls: 'badge-vehicle', label: '🚗 Xe cộ', icon: '🚗' },
  person: { cls: 'badge-person', label: '👤 Tìm người', icon: '👤' },
};

// Danh mục đồ vật — khớp với sidebar bộ lọc kiểu timdothatlac.vn
const CATEGORY_CFG = {
  wallet: { label: 'Ví/Giấy tờ', icon: '👛' },
  pet: { label: 'Thú cưng (Chó/Mèo)', icon: '🐾' },
  electronics: { label: 'Điện thoại/Tablet/Laptop', icon: '📱' },
  household: { label: 'Đồ gia dụng, nội thất, cây cảnh', icon: '🪴' },
  vehicle: { label: 'Xe cộ', icon: '🚗' },
  other: { label: 'Đồ vật khác', icon: '📦' },
};

const NAV_TITLES = {
  all: { title: 'Tin đăng mất đồ & nhặt được', sub: 'Toàn bộ tin đang hoạt động tại Hà Nội' },
  lost: { title: 'Tin báo mất đồ', sub: 'Những tin nhắn tìm lại đồ đã mất' },
  found: { title: 'Đồ nhặt được — chờ trả lại chủ', sub: 'Giúp chủ nhân sớm tìm lại đồ của mình' },
  pet: { title: 'Thú cưng thất lạc', sub: 'Chó, mèo... đi lạc đang cần tìm về nhà' },
  vehicle: { title: 'Xe cộ thất lạc', sub: 'Xe máy, xe đạp... bị mất hoặc nhặt được' },
  person: { title: 'Tìm người thân thất lạc', sub: 'Thông tin hỗ trợ tìm người thân đi lạc' },
};

// Nhãn trạng thái duyệt bài — dùng ở "Tin của tôi" và trang quản trị
const MODERATION_CFG = {
  pending: { label: '⏳ Chờ duyệt', cls: 'badge-mod-pending' },
  approved: { label: '✔ Đã duyệt', cls: 'badge-mod-approved' },
  rejected: { label: '✕ Bị từ chối', cls: 'badge-mod-rejected' },
};

// State (trang danh sách)
let posts = [];
let activeType = 'all';
let currentPage = 1;
let totalPages = 1;
let imgDataUrl = null;
let editingPostId = null; // null = đang đăng tin mới; có giá trị = đang sửa tin có id này

// State (trang chi tiết)
let currentPost = null;

// State (trang "Tin của tôi")
let myPosts = [];
let myPostsPage = 1;
let myPostsTotalPages = 1;
let myPostsFilter = ''; // '' = tất cả | 'pending' | 'approved' | 'rejected'

/* ── Local state (đã đăng nhập hay chưa cũng dùng chung, lưu theo trình duyệt) ── */
function readIdSet(key) {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || '[]'));
  } catch (e) {
    return new Set();
  }
}
function writeIdSet(key, set) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch (e) {}
}
function isInSet(key, id) {
  return readIdSet(key).has(id);
}
function toggleInSet(key, id) {
  const set = readIdSet(key);
  const has = set.has(id);
  if (has) set.delete(id);
  else set.add(id);
  writeIdSet(key, set);
  return !has;
}

/* ── Đọc danh mục đang được tick trong sidebar ── */
function getSelectedCategories() {
  return Array.from(document.querySelectorAll('.category-checkbox:checked')).map((el) => el.value);
}

/* ── Xây query string từ các bộ lọc trên sidebar ── */
function buildQueryParams(page) {
  const params = new URLSearchParams();
  if (activeType !== 'all') params.set('type', activeType);

  const cats = getSelectedCategories();
  if (cats.length) params.set('category', cats.join(','));

  const district = (document.getElementById('district-filter') || {}).value;
  if (district) params.set('district', district);

  const sort = (document.getElementById('sort-select') || {}).value;
  if (sort) params.set('sort', sort);

  const status = (document.getElementById('fp-status') || {}).value;
  if (status) params.set('status', status);

  const urgent = (document.getElementById('fp-urgent') || {}).value;
  if (urgent) params.set('urgent', urgent);

  const dateFrom = (document.getElementById('fp-date-from') || {}).value;
  if (dateFrom) params.set('dateFrom', dateFrom);

  const dateTo = (document.getElementById('fp-date-to') || {}).value;
  if (dateTo) params.set('dateTo', dateTo);

  const q = (document.getElementById('search-input') || {}).value.trim();
  if (q) params.set('q', q);

  params.set('page', page);
  params.set('limit', PAGE_SIZE);
  return params.toString();
}

/* ── Tải danh sách tin từ server (luôn thay thế, không cộng dồn — dùng phân trang số) ── */
async function fetchPosts(page) {
  currentPage = page || 1;
  try {
    const data = await api.get('/posts?' + buildQueryParams(currentPage));
    posts = data.posts;
    totalPages = data.pages;
    renderFeed(data.total);
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

function goToPage(n) {
  if (n < 1 || n > totalPages || n === currentPage) return;
  fetchPosts(n);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Tải số liệu thống kê cho thanh stats ── */
async function fetchStats() {
  try {
    const s = await api.get('/posts/stats');
    const map = { 'total-count': s.total, 'lost-count': s.lost, 'found-count': s.found, 'closed-count': s.closed, 'urgent-count': s.urgent };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });
  } catch (err) {
    console.error('Lỗi tải thống kê:', err.message);
  }
}

/* ── Trang chi tiết: tải 1 tin + các tin liên quan ── */
async function fetchPostDetail(id) {
  try {
    const { post } = await api.get(`/posts/${id}`);
    currentPost = post;
    renderPostDetail();
    fetchRelatedPosts(id);
  } catch (err) {
    renderPostDetailError(err.message);
  }
}

async function fetchRelatedPosts(id) {
  try {
    const { posts: related } = await api.get(`/posts/${id}/related`);
    renderRelatedPosts(related);
  } catch (err) {
    /* không chặn UX nếu lỗi */
  }
}

/* ── Trang "Tin của tôi": xem tất cả tin của chính mình, mọi trạng thái duyệt ── */
async function fetchMyPosts(page) {
  myPostsPage = page || 1;
  const params = new URLSearchParams();
  params.set('mine', '1');
  if (myPostsFilter) params.set('moderation', myPostsFilter);
  params.set('page', myPostsPage);
  params.set('limit', 9);
  try {
    const data = await api.get('/posts?' + params.toString());
    myPosts = data.posts;
    myPostsTotalPages = data.pages;
    renderMyPosts(data.total);
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

function goToMyPostsPage(n) {
  if (n < 1 || n > myPostsTotalPages || n === myPostsPage) return;
  fetchMyPosts(n);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setMyPostsFilter(f) {
  myPostsFilter = f;
  fetchMyPosts(1);
}

async function deleteMyPost(id) {
  if (!confirm('Xoá tin đăng này? Không thể hoàn tác.')) return;
  try {
    await api.delete(`/posts/${id}`);
    showToast('🗑️ Đã xoá tin đăng.');
    fetchMyPosts(myPostsPage);
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

/* ── Bấm xem số điện thoại (không cần đăng nhập) ── */
async function revealPhone(id) {
  toggleInSet('dtl_revealed', id); // đánh dấu đã xem (không toggle lại được, chỉ add)
  if (typeof renderPostDetail === 'function' && currentPost && currentPost._id === id) renderPostDetail();
  try {
    await api.post(`/posts/${id}/reveal`, {});
  } catch (err) {
    /* không chặn UX nếu lỗi mạng, số đã hiện ra rồi */
  }
}

/* ── Bấm "Quan tâm" (cần đăng nhập để tránh spam ẩn danh) ── */
async function toggleMatch(id) {
  if (!currentUser) {
    requireAuth(null, 'Vui lòng đăng nhập để thực hiện thao tác này.');
    return;
  }
  const wasMatched = isInSet('dtl_matched', id);
  try {
    await api.patch(`/posts/${id}/match`, { action: wasMatched ? 'remove' : 'add' });
    toggleInSet('dtl_matched', id);
    showToast(wasMatched ? '↩️ Đã bỏ ghi nhận' : '👍 Đã ghi nhận! Hãy liên hệ người đăng tin.');
    if (currentPost && currentPost._id === id) {
      currentPost.matches += wasMatched ? -1 : 1;
      renderPostDetail();
    }
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

function toggleFlag(id) {
  const nowFlagged = toggleInSet('dtl_flagged', id);
  showToast(nowFlagged ? '⚠️ Đã báo cáo tin nghi ngờ lừa đảo. Cảm ơn bạn!' : 'Đã bỏ báo cáo');
  if (currentPost && currentPost._id === id) renderPostDetail();
}

/* ── Đánh dấu "Đã tìm thấy" / mở lại tin (chỉ chủ tin) ── */
async function resolvePost(id) {
  try {
    const { post } = await api.patch(`/posts/${id}/status`, {});
    if (currentPost && currentPost._id === id) {
      currentPost = post;
      renderPostDetail();
    }
    const idx = posts.findIndex((x) => x._id === id);
    if (idx !== -1) posts[idx] = post;
    if (document.getElementById('my-posts-content')) fetchMyPosts(myPostsPage);
    fetchStats();
    showToast(post.status === 'closed' ? '✅ Đã đánh dấu "Đã tìm thấy" — Chúc mừng!' : '↩️ Đã mở lại tin đăng');
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

function sharePost(p) {
  if (!p) return;
  const tc = TYPE_CFG[p.type];
  const text = `[${tc.label}] ${p.name} – ${p.district}, Hà Nội\n${p.desc}`;
  if (navigator.share) {
    navigator.share({ title: p.name, text, url: window.location.href }).catch(() => {});
  } else {
    navigator.clipboard
      .writeText(text + '\n' + window.location.href)
      .then(() => showToast('📋 Đã sao chép thông tin tin đăng!'))
      .catch(() => showToast('Không thể sao chép — vui lòng thử lại'));
  }
}

/* ── Đăng tin mới HOẶC lưu chỉnh sửa (dùng chung 1 modal, phân biệt bằng editingPostId) ── */
async function submitPost() {
  if (!currentUser) {
    showToast('🔒 Vui lòng đăng nhập để đăng tin.');
    return;
  }

  const name = document.getElementById('f-name').value.trim();
  const location = document.getElementById('f-location').value.trim();
  const phone = document.getElementById('f-phone').value.trim();
  const category = document.getElementById('f-category').value;

  if (!name || !location) return alert('Vui lòng điền tên đồ vật và địa điểm!');
  if (!phone) return alert('Vui lòng nhập số điện thoại liên hệ!');
  if (!/^0\d{9,10}$/.test(phone)) return alert('Số điện thoại không hợp lệ (VD: 0912345678)');
  if (!category) return alert('Vui lòng chọn danh mục đồ vật!');

  const submitBtn = document.querySelector('.modal-btns .btn-primary');
  const oldLabel = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = editingPostId ? 'Đang lưu...' : 'Đang đăng...';
  }

  const payload = {
    type: document.getElementById('f-type').value,
    category,
    name,
    district: document.getElementById('f-district').value,
    location,
    phone,
    desc: document.getElementById('f-desc').value.trim(),
    img: imgDataUrl || null,
    date: document.getElementById('f-date').value,
    isUrgent: document.getElementById('f-urgent').checked,
    reward: document.getElementById('f-reward').value.trim(),
  };

  try {
    if (editingPostId) {
      await api.patch(`/posts/${editingPostId}`, payload);
      closeModal();
      showToast('✅ Đã lưu thay đổi.');
      editingPostId = null;
      if (document.getElementById('my-posts-content')) fetchMyPosts(myPostsPage);
    } else {
      const { autoApproved } = await api.post('/posts', payload);
      closeModal();
      showToast(
        autoApproved
          ? '✅ Đã đăng tin thành công!'
          : '⏳ Đã gửi tin — tin sẽ hiển thị công khai sau khi được quản trị viên duyệt.'
      );
      fetchStats();
      fetchPosts(1);
    }
  } catch (err) {
    console.error(err);
    showToast('❌ ' + (err.message || 'Có lỗi xảy ra, vui lòng thử lại.'));
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = oldLabel;
    }
  }
}
