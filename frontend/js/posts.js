/* ============================================================
   POSTS.JS — state + các hành động gọi API liên quan tới "tin đăng"
   Thay thế db.collection('posts')... của Firestore bằng gọi REST API
   ============================================================ */

const PAGE_SIZE = 8;

const TYPE_CFG = {
  lost: { cls: 'badge-lost', label: '🚨 Mất đồ', icon: '📦' },
  found: { cls: 'badge-found', label: 'Nhặt được', icon: '🎁' },
  pet: { cls: 'badge-pet', label: '🐾 Thú cưng', icon: '🐾' },
  vehicle: { cls: 'badge-vehicle', label: '🚗 Xe cộ', icon: '🚗' },
  person: { cls: 'badge-person', label: '👤 Tìm người', icon: '👤' },
};

// State
let posts = []; // danh sách tin đang hiển thị (đã tải tích luỹ theo trang)
let activeTab = 'all';
let currentPage = 1;
let totalPages = 1;
let revealedPhones = new Set();
let matchedPosts = new Set();
let flaggedPosts = new Set();
let imgDataUrl = null;
let imgFile = null;

/* ── Xây query string từ các bộ lọc trên UI ── */
function buildQueryParams(page) {
  const params = new URLSearchParams();
  if (activeTab !== 'all') params.set('type', activeTab);

  const district = document.getElementById('district-filter').value;
  if (district) params.set('district', district);

  const sort = document.getElementById('sort-select').value;
  if (sort) params.set('sort', sort);

  const status = (document.getElementById('fp-status') || {}).value;
  if (status) params.set('status', status);

  const urgent = (document.getElementById('fp-urgent') || {}).value;
  if (urgent) params.set('urgent', urgent);

  const dateFrom = (document.getElementById('fp-date-from') || {}).value;
  if (dateFrom) params.set('dateFrom', dateFrom);

  const dateTo = (document.getElementById('fp-date-to') || {}).value;
  if (dateTo) params.set('dateTo', dateTo);

  const q = document.getElementById('search-input').value.trim();
  if (q) params.set('q', q);

  params.set('page', page);
  params.set('limit', PAGE_SIZE);
  return params.toString();
}

/* ── Tải danh sách tin từ server ── */
async function fetchPosts(reset) {
  if (reset) currentPage = 1;

  try {
    const data = await api.get('/posts?' + buildQueryParams(currentPage));
    posts = reset ? data.posts : posts.concat(data.posts);
    totalPages = data.pages;
    renderFeed();
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

function loadMore() {
  if (currentPage >= totalPages) return;
  currentPage++;
  fetchPosts(false);
}

/* ── Tải số liệu thống kê cho thanh stats ── */
async function fetchStats() {
  try {
    const s = await api.get('/posts/stats');
    document.getElementById('total-count').textContent = s.total;
    document.getElementById('lost-count').textContent = s.lost;
    document.getElementById('found-count').textContent = s.found;
    document.getElementById('closed-count').textContent = s.closed;
    document.getElementById('urgent-count').textContent = s.urgent;
  } catch (err) {
    console.error('Lỗi tải thống kê:', err.message);
  }
}

/* ── Bấm xem số điện thoại (không cần đăng nhập) ── */
async function revealPhone(id) {
  revealedPhones.add(id);
  renderFeed();
  try {
    await api.post(`/posts/${id}/reveal`, {});
  } catch (err) {
    /* không chặn UX nếu lỗi mạng, số đã hiện ra rồi */
  }
}

/* ── Bấm "Quan tâm" (cần đăng nhập để tránh spam ẩn danh) ── */
async function toggleMatch(id) {
  if (!currentUser) {
    openAuth('login');
    showToast('🔒 Vui lòng đăng nhập để thực hiện thao tác này.');
    return;
  }
  const isMatched = matchedPosts.has(id);
  try {
    await api.patch(`/posts/${id}/match`, { action: isMatched ? 'remove' : 'add' });
    if (isMatched) {
      matchedPosts.delete(id);
      showToast('↩️ Đã bỏ ghi nhận');
    } else {
      matchedPosts.add(id);
      showToast('👍 Đã ghi nhận! Hãy liên hệ người đăng tin.');
    }
    const p = posts.find((x) => x._id === id);
    if (p) p.matches += isMatched ? -1 : 1;
    renderFeed();
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

function toggleFlag(id) {
  if (flaggedPosts.has(id)) {
    flaggedPosts.delete(id);
    showToast('Đã bỏ báo cáo');
  } else {
    flaggedPosts.add(id);
    showToast('⚠️ Đã báo cáo tin nghi ngờ lừa đảo. Cảm ơn bạn!');
  }
  renderFeed();
}

/* ── Đánh dấu "Đã tìm thấy" / mở lại tin (chỉ chủ tin) ── */
async function resolvePost(id) {
  try {
    const { post } = await api.patch(`/posts/${id}/status`, {});
    const idx = posts.findIndex((x) => x._id === id);
    if (idx !== -1) posts[idx] = post;
    renderFeed();
    fetchStats();
    showToast(post.status === 'closed' ? '✅ Đã đánh dấu "Đã tìm thấy" — Chúc mừng!' : '↩️ Đã mở lại tin đăng');
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

function sharePost(id) {
  const p = posts.find((x) => x._id === id);
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

/* ── Nén ảnh phía client trước khi gửi lên server (giữ nguyên logic gốc) ── */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được file ảnh.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('File này không phải ảnh hợp lệ.'));
      img.onload = () => resolve(img);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function drawToDataUrl(img, maxDim, quality) {
  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    if (width >= height) {
      height = Math.round((height * maxDim) / width);
      width = maxDim;
    } else {
      width = Math.round((width * maxDim) / height);
      height = maxDim;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

// Nén ảnh để gửi lên server dạng base64 (backend giới hạn body 5MB, ảnh nén <900KB)
async function compressImageToBase64(file) {
  const img = await loadImageFromFile(file);
  let maxDim = 1000;
  let quality = 0.75;
  let dataUrl = drawToDataUrl(img, maxDim, quality);
  let tries = 0;
  while (dataUrl.length > 700000 && tries < 5) {
    maxDim = Math.round(maxDim * 0.75);
    quality = Math.max(0.35, quality - 0.15);
    dataUrl = drawToDataUrl(img, maxDim, quality);
    tries++;
  }
  if (dataUrl.length > 900000) throw new Error('Ảnh vẫn quá lớn sau khi nén.');
  return dataUrl;
}

function previewImg(e) {
  const file = e.target.files[0];
  if (!file) return;
  imgFile = file;
  document.getElementById('upload-text').textContent = '⏳ Đang nén ảnh...';
  compressImageToBase64(file)
    .then((dataUrl) => {
      imgDataUrl = dataUrl;
      const el = document.getElementById('img-preview');
      el.src = imgDataUrl;
      el.style.display = 'block';
      document.getElementById('upload-text').textContent =
        '✅ ' + file.name + ' (~' + Math.round(dataUrl.length / 1024) + 'KB sau khi nén)';
    })
    .catch((err) => {
      console.error(err);
      imgFile = null;
      imgDataUrl = null;
      document.getElementById('upload-text').textContent = 'Bấm để chọn ảnh (JPG, PNG...)';
      showToast('❌ Ảnh quá nặng hoặc bị lỗi, vui lòng chọn ảnh khác.');
    });
}

/* ── Đăng tin mới ── */
async function submitPost() {
  if (!currentUser) {
    showToast('🔒 Vui lòng đăng nhập để đăng tin.');
    return;
  }

  const name = document.getElementById('f-name').value.trim();
  const location = document.getElementById('f-location').value.trim();
  const phone = document.getElementById('f-phone').value.trim();

  if (!name || !location) return alert('Vui lòng điền tên đồ vật và địa điểm!');
  if (!phone) return alert('Vui lòng nhập số điện thoại liên hệ!');
  if (!/^0\d{9,10}$/.test(phone)) return alert('Số điện thoại không hợp lệ (VD: 0912345678)');

  const submitBtn = document.querySelector('.modal-btns .btn-primary');
  const oldLabel = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang đăng...';
  }

  try {
    await api.post('/posts', {
      type: document.getElementById('f-type').value,
      name,
      district: document.getElementById('f-district').value,
      location,
      phone,
      desc: document.getElementById('f-desc').value.trim(),
      img: imgDataUrl || null,
      date: document.getElementById('f-date').value,
      isUrgent: document.getElementById('f-urgent').checked,
      reward: document.getElementById('f-reward').value.trim(),
    });

    closeModal();
    showToast('✅ Đã đăng tin thành công!');
    fetchStats();
    fetchPosts(true);
  } catch (err) {
    console.error(err);
    showToast('❌ ' + (err.message || 'Đăng tin lỗi, vui lòng thử lại.'));
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = oldLabel;
    }
  }
}
