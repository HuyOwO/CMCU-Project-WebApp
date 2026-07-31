/* ============================================================
   UI.JS — render giao diện: lưới tin, sidebar lọc, trang chi tiết,
   bài viết (mẹo/lừa đảo), modal, toast...
   ============================================================ */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function timeAgo(isoOrMs) {
  const t = typeof isoOrMs === 'number' ? isoOrMs : new Date(isoOrMs).getTime();
  const d = (Date.now() - t) / 1000;
  if (d < 60) return 'Vừa đăng';
  if (d < 3600) return Math.floor(d / 60) + ' phút trước';
  if (d < 86400) return Math.floor(d / 3600) + ' giờ trước';
  return Math.floor(d / 86400) + ' ngày trước';
}

function maskPhone(p) {
  if (!p || p.length < 8) return p;
  return p.slice(0, 3) + 'x xxx x' + p.slice(-2);
}

function trustBadgeHtml(trustStatus) {
  if (trustStatus === 'trusted') return '<span class="trust-badge trusted">✔ Tin cậy</span>';
  if (trustStatus === 'untrusted') return '<span class="trust-badge untrusted">⚠ Không tin cậy</span>';
  return '';
}

/* ── Phân trang số — dùng chung cho danh sách tin & danh sách bài viết ── */
function getPageList(current, total) {
  const delta = 1;
  const range = [1];
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) range.push(i);
  if (current - delta > 2) range.splice(1, 0, '…l');
  if (current + delta < total - 1) range.push('…r');
  if (total > 1) range.push(total);
  return range;
}

function renderPagination(containerId, current, total, onPageFn) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (total <= 1) {
    el.innerHTML = '';
    return;
  }
  let html = `<button class="page-btn" ${current === 1 ? 'disabled' : ''} onclick="${onPageFn}(${current - 1})" aria-label="Trang trước">‹</button>`;
  getPageList(current, total).forEach((p) => {
    if (typeof p === 'string') {
      html += `<span class="page-dots">…</span>`;
    } else {
      html += `<button class="page-btn${p === current ? ' active' : ''}" onclick="${onPageFn}(${p})">${p}</button>`;
    }
  });
  html += `<button class="page-btn" ${current === total ? 'disabled' : ''} onclick="${onPageFn}(${current + 1})" aria-label="Trang sau">›</button>`;
  el.innerHTML = html;
}

/* ============================================================
   BỘ LỌC SIDEBAR (trang chủ)
   ============================================================ */
function onFilter() {
  fetchPosts(1);
}

function resetFilters() {
  document.querySelectorAll('.category-checkbox').forEach((el) => (el.checked = false));
  ['fp-status', 'fp-urgent', 'fp-date-from', 'fp-date-to', 'search-input'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const d = document.getElementById('district-filter');
  if (d) d.value = '';
  const s = document.getElementById('sort-select');
  if (s) s.value = 'newest';
  onFilter();
}

function onSearchKeydown(e) {
  if (e.key === 'Enter') onFilter();
}

/* Đọc ?type= trên URL để biết đang xem tab nào + tô sáng nav tương ứng */
function initTypeFromQuery() {
  const params = new URLSearchParams(location.search);
  activeType = params.get('type') || 'all';
  const info = NAV_TITLES[activeType] || NAV_TITLES.all;
  const titleEl = document.getElementById('content-title');
  if (titleEl) titleEl.textContent = info.title;
  document.querySelectorAll('.nav-link[data-type]').forEach((el) => {
    el.classList.toggle('active', (el.dataset.type || 'all') === activeType);
  });
}

/* ============================================================
   LƯỚI TIN ĐĂNG (mất đồ / nhặt được / thú cưng / xe cộ / tìm người)
   ============================================================ */
function postCardTemplate(p) {
  const id = p._id;
  const tc = TYPE_CFG[p.type] || TYPE_CFG.lost;
  const isNew = Date.now() - new Date(p.createdAt).getTime() < 60000;

  const imgSection = p.img
    ? `<img src="${p.img}" alt="${escapeHtml(p.name)}" loading="lazy">`
    : `<div class="post-card-placeholder">${tc.icon}<span>Chưa có ảnh</span></div>`;

  const urgentPin = p.isUrgent && p.status === 'open' ? `<span class="badge badge-urgent post-card-urgent-pin">⚡ KHẨN</span>` : '';
  const closedBadge = p.status === 'closed' ? `<span class="badge badge-closed">✔ Đã tìm thấy</span>` : '';
  const newTag = isNew ? `<span class="new-tag">MỚI</span>` : '';

  return `
    <a class="post-card${p.status === 'closed' ? ' is-closed' : ''}" href="post-detail.html?id=${id}">
      <div class="post-card-img">
        ${imgSection}
        ${urgentPin}
        <span class="post-card-views">👁 ${p.views}</span>
      </div>
      <div class="post-card-body">
        <div class="post-card-badges">
          <span class="badge ${tc.cls}">${tc.label}</span>
          ${closedBadge}${newTag}
        </div>
        <div class="post-card-title">${escapeHtml(p.name)}</div>
        <div class="post-card-meta">
          <span>📍 ${escapeHtml(p.district)}</span>
          <span>${timeAgo(p.createdAt)}</span>
        </div>
        ${p.reward ? `<div class="post-card-reward">🎁 ${escapeHtml(p.reward)}</div>` : ''}
      </div>
    </a>`;
}

function renderFeed(total) {
  const feed = document.getElementById('feed');
  if (!feed) return;

  feed.innerHTML = posts.length
    ? posts.map(postCardTemplate).join('')
    : '<div class="empty"><div class="empty-icon">🔍</div>Không có tin nào phù hợp</div>';

  renderPagination('pagination', currentPage, totalPages, 'goToPage');

  const sub = document.getElementById('content-sub');
  if (sub) sub.textContent = `Tìm thấy ${total} kết quả`;
}

/* ============================================================
   TRANG CHI TIẾT TIN ĐĂNG (post-detail.html)
   ============================================================ */
function renderPostDetail() {
  const root = document.getElementById('post-detail-root');
  if (!root || !currentPost) return;
  const p = currentPost;
  const tc = TYPE_CFG[p.type] || TYPE_CFG.lost;
  const isRevealed = isInSet('dtl_revealed', p._id);
  const isMatched = isInSet('dtl_matched', p._id);
  const isFlagged = isInSet('dtl_flagged', p._id);
  const isOwner = currentUser && p.author && String(p.author._id || p.author) === String(currentUser.id);

  document.title = `${p.name} — Đồ Thất Lạc HN`;
  const bc = document.getElementById('breadcrumb-current');
  if (bc) bc.textContent = p.name;

  const imgSection = p.img
    ? `<img class="detail-img" src="${p.img}" alt="${escapeHtml(p.name)}">`
    : `<div class="detail-img-placeholder">${tc.icon}</div>`;

  const urgentBadge = p.isUrgent && p.status === 'open' ? `<span class="badge badge-urgent">⚡ KHẨN CẤP</span>` : '';
  const closedBadge = p.status === 'closed' ? `<span class="badge badge-closed">✔ Đã tìm thấy</span>` : '';

  const modBanner =
    p.moderationStatus === 'pending'
      ? `<div class="status-banner pending">⏳ Tin này đang chờ quản trị viên duyệt — chỉ bạn (và admin) nhìn thấy lúc này.</div>`
      : p.moderationStatus === 'rejected'
      ? `<div class="status-banner rejected">🚫 Tin này đã bị từ chối, không hiển thị công khai. Vui lòng sửa nội dung và đăng tin mới nếu cần.</div>`
      : '';

  const authorName = p.author && p.author.name ? p.author.name : '';
  const authorLine = authorName
    ? `<div class="detail-meta" style="border-bottom:none;padding-bottom:0;margin-bottom:.6rem">
        <span>✍️ Đăng bởi: <b>${escapeHtml(authorName)}</b></span>
        ${trustBadgeHtml(p.author && p.author.trustStatus)}
      </div>`
    : '';

  const descParas =
    (p.desc || '')
      .split('\n')
      .filter((l) => l.trim())
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join('') || '<p>Không có mô tả thêm.</p>';

  const phoneBox = `
    <div class="detail-phone-box">
      <div>📞
        ${
          isRevealed
            ? `<span class="phone-num">${escapeHtml(p.phone)}</span>`
            : `<span class="phone-num" onclick="revealPhone('${p._id}')">${maskPhone(p.phone)} <span style="font-size:11px;color:#888;font-weight:400">(bấm để xem)</span></span>`
        }
      </div>
      ${!isRevealed ? `<button class="btn-action" onclick="revealPhone('${p._id}')">👁 Xem số điện thoại</button>` : ''}
    </div>`;

  const resolveBtn = isOwner
    ? p.status === 'open'
      ? `<button class="btn-action resolve" onclick="resolvePost('${p._id}')">✅ Đánh dấu đã tìm thấy</button>`
      : `<button class="btn-action" onclick="resolvePost('${p._id}')">↩️ Mở lại tin</button>`
    : '';

  root.innerHTML = `
    <div class="detail-card">
      ${imgSection}
      <div class="detail-body">
        ${modBanner}
        <div class="detail-badges">
          <span class="badge ${tc.cls}">${tc.label}</span>
          ${urgentBadge}${closedBadge}
        </div>
        <h1 class="detail-title">${escapeHtml(p.name)}</h1>
        ${authorLine}
        <div class="detail-meta">
          <span>📍 ${escapeHtml(p.district)} — ${escapeHtml(p.location)}</span>
          ${p.date ? `<span>📅 ${escapeHtml(p.date)}</span>` : ''}
          <span>👁 ${p.views} lượt xem</span>
          <span>🕒 ${timeAgo(p.createdAt)}</span>
        </div>
        ${p.reward ? `<div class="detail-reward">🎁 Thưởng: ${escapeHtml(p.reward)}</div>` : ''}
        <div class="detail-desc">${descParas}</div>
        ${phoneBox}
        <div class="detail-actions">
          <button class="btn-action${isMatched ? ' active-match' : ''}" onclick="toggleMatch('${p._id}')">👀 Quan tâm (${p.matches})</button>
          ${resolveBtn}
          <button class="btn-action" onclick="sharePost(currentPost)">📤 Chia sẻ</button>
          <button class="btn-action${isFlagged ? ' active-flag' : ''}" onclick="toggleFlag('${p._id}')">${isFlagged ? '⚠️ Đã báo cáo' : '🚩 Báo cáo lừa đảo'}</button>
        </div>
      </div>
    </div>`;
}

function renderPostDetailError(msg) {
  const root = document.getElementById('post-detail-root');
  if (!root) return;
  root.innerHTML = `<div class="empty"><div class="empty-icon">😕</div>${escapeHtml(msg || 'Không tìm thấy tin đăng.')}</div>`;
  const side = document.getElementById('detail-side');
  if (side) side.style.display = 'none';
}

function renderRelatedPosts(list) {
  const box = document.getElementById('related-posts');
  if (!box) return;
  if (!list.length) {
    box.innerHTML = '<div class="side-note">Chưa có tin liên quan.</div>';
    return;
  }
  box.innerHTML = list
    .map((p) => {
      const tc = TYPE_CFG[p.type] || TYPE_CFG.lost;
      const img = p.img ? `<img src="${p.img}" alt="">` : `<div class="related-placeholder">${tc.icon}</div>`;
      return `<a class="related-item" href="post-detail.html?id=${p._id}">${img}<div class="related-item-title">${escapeHtml(p.name)}</div></a>`;
    })
    .join('');
}

/* ============================================================
   "TIN CỦA TÔI" (my-posts.html)
   ============================================================ */
function myPostCardTemplate(p) {
  const tc = TYPE_CFG[p.type] || TYPE_CFG.lost;
  const mod = MODERATION_CFG[p.moderationStatus] || MODERATION_CFG.approved;
  const img = p.img ? `<img class="admin-row-img" src="${p.img}" alt="">` : `<div class="admin-row-placeholder">${tc.icon}</div>`;
  const closedBadge = p.status === 'closed' ? `<span class="badge badge-closed">✔ Đã tìm thấy</span>` : '';
  const resolveBtn =
    p.status === 'open'
      ? `<button class="btn-mini approve" onclick="resolvePost('${p._id}')">✅ Đã tìm thấy</button>`
      : `<button class="btn-mini" onclick="resolvePost('${p._id}')">↩️ Mở lại</button>`;

  return `
    <div class="admin-row">
      ${img}
      <div class="admin-row-body">
        <div class="admin-row-title"><a href="post-detail.html?id=${p._id}">${escapeHtml(p.name)}</a></div>
        <div class="admin-row-meta">
          <span class="badge ${tc.cls}">${tc.label}</span>
          <span class="badge ${mod.cls}">${mod.label}</span>
          ${closedBadge}
          <span>📍 ${escapeHtml(p.district)}</span>
          <span>🕒 ${timeAgo(p.createdAt)}</span>
        </div>
      </div>
      <div class="admin-row-actions">
        <button class="btn-mini" onclick="openEditModal('${p._id}')">✏️ Sửa</button>
        ${resolveBtn}
        <a class="btn-mini" href="post-detail.html?id=${p._id}">👁 Xem</a>
        <button class="btn-mini danger" onclick="deleteMyPost('${p._id}')">🗑️ Xoá</button>
      </div>
    </div>`;
}

function renderMyPosts(total) {
  const grid = document.getElementById('my-posts-list');
  if (!grid) return;
  grid.innerHTML = myPosts.length
    ? myPosts.map(myPostCardTemplate).join('')
    : '<div class="empty"><div class="empty-icon">📭</div>Bạn chưa có tin đăng nào ở mục này.</div>';
  renderPagination('my-posts-pagination', myPostsPage, myPostsTotalPages, 'goToMyPostsPage');
  const sub = document.getElementById('my-posts-count');
  if (sub) sub.textContent = `${total} tin`;
  document.querySelectorAll('.my-posts-filter-tab').forEach((el) => {
    el.classList.toggle('active', (el.dataset.filter || '') === myPostsFilter);
  });
}

/* ============================================================
   TRANG QUẢN TRỊ (admin.html) — hàng chờ duyệt + quản lý người dùng
   ============================================================ */
function adminQueueRowTemplate(p) {
  const tc = TYPE_CFG[p.type] || TYPE_CFG.lost;
  const mod = MODERATION_CFG[p.moderationStatus] || MODERATION_CFG.pending;
  const img = p.img ? `<img class="admin-row-img" src="${p.img}" alt="">` : `<div class="admin-row-placeholder">${tc.icon}</div>`;

  const actionBtns =
    p.moderationStatus === 'pending'
      ? `<button class="btn-mini approve" onclick="moderatePostAction('${p._id}','approve')">✅ Duyệt</button>
         <button class="btn-mini reject" onclick="moderatePostAction('${p._id}','reject')">🚫 Từ chối</button>`
      : p.moderationStatus === 'rejected'
      ? `<button class="btn-mini approve" onclick="moderatePostAction('${p._id}','approve')">✅ Duyệt lại</button>`
      : `<button class="btn-mini reject" onclick="moderatePostAction('${p._id}','reject')">🚫 Gỡ duyệt</button>`;

  return `
    <div class="admin-row">
      ${img}
      <div class="admin-row-body">
        <div class="admin-row-title"><a href="post-detail.html?id=${p._id}">${escapeHtml(p.name)}</a></div>
        <div class="admin-row-meta">
          <span class="badge ${tc.cls}">${tc.label}</span>
          <span class="badge ${mod.cls}">${mod.label}</span>
          <span>👤 ${escapeHtml(p.authorName || '—')}</span>
          <span>📍 ${escapeHtml(p.district)}</span>
          <span>🕒 ${timeAgo(p.createdAt)}</span>
        </div>
      </div>
      <div class="admin-row-actions">
        ${actionBtns}
        <button class="btn-mini danger" onclick="adminDeletePost('${p._id}')">🗑️ Xoá</button>
      </div>
    </div>`;
}

function renderAdminQueue(total) {
  const list = document.getElementById('admin-queue-list');
  if (!list) return;
  list.innerHTML = adminQueue.length
    ? adminQueue.map(adminQueueRowTemplate).join('')
    : '<div class="empty"><div class="empty-icon">📭</div>Không có tin nào ở trạng thái này.</div>';
  renderPagination('admin-queue-pagination', adminQueuePage, adminQueueTotalPages, 'goToAdminQueuePage');
  const sub = document.getElementById('admin-queue-count');
  if (sub) sub.textContent = `${total} tin`;
  document.querySelectorAll('.admin-queue-filter-tab').forEach((el) => {
    el.classList.toggle('active', el.dataset.filter === adminQueueFilter);
  });
}

function userRowTemplate(u) {
  const initials = (u.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const roleBadge = u.role === 'admin' ? '<span class="badge badge-person">🛡️ Admin</span>' : '';

  return `
    <div class="admin-row">
      <div class="user-row-avatar">${escapeHtml(initials)}</div>
      <div class="admin-row-body">
        <div class="user-row-name">${escapeHtml(u.name)} ${roleBadge} ${trustBadgeHtml(u.trustStatus)}</div>
        <div class="user-row-email">${escapeHtml(u.email)}</div>
      </div>
      <div class="admin-row-actions">
        <button class="btn-trust${u.trustStatus === 'trusted' ? ' active-trusted' : ''}" onclick="setUserTrust('${u._id}','trusted')">✔ Tin cậy</button>
        <button class="btn-trust${u.trustStatus === 'untrusted' ? ' active-untrusted' : ''}" onclick="setUserTrust('${u._id}','untrusted')">⚠ Không tin cậy</button>
        ${u.trustStatus !== 'none' ? `<button class="btn-trust" onclick="setUserTrust('${u._id}','none')">↩️ Bỏ đánh dấu</button>` : ''}
      </div>
    </div>`;
}

function renderAdminUsers(total) {
  const list = document.getElementById('admin-users-list');
  if (!list) return;
  list.innerHTML = adminUsers.length
    ? adminUsers.map(userRowTemplate).join('')
    : '<div class="empty"><div class="empty-icon">👤</div>Không tìm thấy người dùng nào.</div>';
  renderPagination('admin-users-pagination', adminUsersPage, adminUsersTotalPages, 'goToAdminUsersPage');
  const sub = document.getElementById('admin-users-count');
  if (sub) sub.textContent = `${total} người dùng`;
}

/* ============================================================
   BÀI VIẾT — Mẹo tìm đồ / Số điện thoại lừa đảo
   ============================================================ */
function articleCardTemplate(a) {
  const cfg = ARTICLE_KIND_CFG[a.kind] || ARTICLE_KIND_CFG.tip;
  const img = a.thumbnail
    ? `<img src="${a.thumbnail}" alt="${escapeHtml(a.title)}" loading="lazy">`
    : `<div class="post-card-placeholder">${cfg.icon}</div>`;
  return `
    <a class="article-card" href="article-detail.html?id=${a.slug || a._id}">
      <div class="article-card-img">${img}</div>
      <div class="article-card-body">
        <div class="article-card-title">${escapeHtml(a.title)}</div>
        <div class="article-card-summary">${escapeHtml(a.summary || '')}</div>
        <div class="article-card-meta">🕒 ${timeAgo(a.createdAt)} · 👁 ${a.views}</div>
      </div>
    </a>`;
}

function renderArticleGrid(total) {
  const grid = document.getElementById('article-grid');
  if (!grid) return;
  grid.innerHTML = articleList.length
    ? articleList.map(articleCardTemplate).join('')
    : '<div class="empty"><div class="empty-icon">📭</div>Chưa có bài viết nào.</div>';
  renderPagination('article-pagination', articlePage, articleTotalPages, 'goToArticlePage');
  const sub = document.getElementById('article-result-count');
  if (sub) sub.textContent = `${total} bài viết`;
}

function renderArticleMiniGrid(targetElId, kind, list) {
  const el = document.getElementById(targetElId);
  if (!el) return;
  const cfg = ARTICLE_KIND_CFG[kind];
  if (!list.length) {
    el.innerHTML = `<div class="side-note">Chưa có bài viết.</div>`;
    return;
  }
  el.innerHTML = list
    .map((a) => {
      const img = a.thumbnail ? `<img src="${a.thumbnail}" alt="">` : `<div class="mini-placeholder">${cfg.icon}</div>`;
      return `<a class="article-mini-card ${kind === 'scam' ? 'scam' : ''}" href="article-detail.html?id=${a.slug || a._id}">${img}<div class="article-mini-title">${escapeHtml(a.title)}</div></a>`;
    })
    .join('');
}

function renderArticleDetail() {
  const root = document.getElementById('article-detail-root');
  if (!root || !currentArticle) return;
  const a = currentArticle;
  const cfg = ARTICLE_KIND_CFG[a.kind] || ARTICLE_KIND_CFG.tip;

  document.title = `${a.title} — Đồ Thất Lạc HN`;
  const bc = document.getElementById('breadcrumb-current');
  if (bc) bc.textContent = a.title;
  const bcCat = document.getElementById('breadcrumb-category');
  if (bcCat) {
    bcCat.textContent = cfg.label;
    bcCat.href = cfg.listPage;
  }

  const imgSection = a.thumbnail
    ? `<img class="detail-img" src="${a.thumbnail}" alt="${escapeHtml(a.title)}">`
    : `<div class="detail-img-placeholder">${cfg.icon}</div>`;

  const scamBox =
    a.kind === 'scam' && a.scamContact
      ? `<div class="scam-alert-box"><div class="scam-alert-label">⚠️ Số điện thoại / tài khoản bị tố cáo</div><div class="scam-alert-value">${escapeHtml(a.scamContact)}</div></div>`
      : '';

  const contentHtml = (a.content || []).map((p) => `<p>${escapeHtml(p)}</p>`).join('') || '<p>Chưa có nội dung.</p>';

  root.innerHTML = `
    <div class="detail-card">
      ${imgSection}
      <div class="detail-body">
        <div class="detail-badges"><span class="badge ${a.kind === 'scam' ? 'badge-lost' : 'badge-found'}">${cfg.icon} ${cfg.label}</span></div>
        <h1 class="detail-title">${escapeHtml(a.title)}</h1>
        <div class="detail-meta">
          <span>✍️ ${escapeHtml(a.authorName || 'Đồ Thất Lạc HN')}</span>
          <span>🕒 ${timeAgo(a.createdAt)}</span>
          <span>👁 ${a.views} lượt xem</span>
        </div>
        ${scamBox}
        <div class="detail-desc">${contentHtml}</div>
        <div class="detail-actions">
          <button class="btn-action" onclick="shareArticle(currentArticle)">📤 Chia sẻ</button>
          <a class="btn-action" href="${cfg.listPage}">${cfg.icon} Xem thêm ${cfg.label.toLowerCase()}</a>
        </div>
      </div>
    </div>`;
}

function renderArticleDetailError(msg) {
  const root = document.getElementById('article-detail-root');
  if (!root) return;
  root.innerHTML = `<div class="empty"><div class="empty-icon">😕</div>${escapeHtml(msg || 'Không tìm thấy bài viết.')}</div>`;
}

/* ============================================================
   MODAL: Đăng tin mới
   ============================================================ */
function openModal() {
  if (!currentUser) {
    requireAuthThenPost();
    return;
  }
  editingPostId = null;
  imgDataUrl = null;
  document.getElementById('img-preview').style.display = 'none';
  document.getElementById('upload-text').textContent = 'Bấm để chọn ảnh (JPG, PNG...)';
  document.getElementById('f-urgent').checked = false;
  document.getElementById('f-date').value = new Date().toISOString().slice(0, 10);
  ['f-name', 'f-location', 'f-desc', 'f-phone', 'f-reward'].forEach((id) => {
    document.getElementById(id).value = '';
  });
  document.getElementById('f-category').value = 'other';
  document.getElementById('f-type').value = 'lost';
  document.getElementById('f-district').selectedIndex = 0;
  document.querySelector('#modal h3').textContent = '📝 Đăng tin mới';
  document.querySelector('.modal-btns .btn-primary').textContent = 'Đăng ngay';
  document.getElementById('modal').style.display = 'flex';
}

/* Mở modal ở chế độ SỬA — điền sẵn dữ liệu tin hiện có (dùng ở "Tin của tôi") */
function openEditModal(id) {
  const p = myPosts.find((x) => x._id === id);
  if (!p) return;

  editingPostId = id;
  imgDataUrl = p.img || null;

  document.getElementById('f-type').value = p.type;
  document.getElementById('f-category').value = p.category || 'other';
  document.getElementById('f-name').value = p.name;
  document.getElementById('f-district').value = p.district;
  document.getElementById('f-date').value = p.date || '';
  document.getElementById('f-location').value = p.location;
  document.getElementById('f-phone').value = p.phone;
  document.getElementById('f-reward').value = p.reward || '';
  document.getElementById('f-desc').value = p.desc || '';
  document.getElementById('f-urgent').checked = !!p.isUrgent;

  const preview = document.getElementById('img-preview');
  const uploadText = document.getElementById('upload-text');
  if (p.img) {
    preview.src = p.img;
    preview.style.display = 'block';
    uploadText.textContent = 'Ảnh hiện tại (bấm để chọn ảnh khác)';
  } else {
    preview.style.display = 'none';
    uploadText.textContent = 'Bấm để chọn ảnh (JPG, PNG...)';
  }

  document.querySelector('#modal h3').textContent = '✏️ Sửa tin đăng';
  document.querySelector('.modal-btns .btn-primary').textContent = 'Lưu thay đổi';
  document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  editingPostId = null;
}
function handleOverlayClick(e) {
  if (e.target.id === 'modal') closeModal();
}

/* ============================================================
   MODAL: Đăng bài viết (Mẹo tìm đồ / Cảnh báo lừa đảo)
   ============================================================ */
function openArticleModal() {
  if (!requireAuth(null, 'Vui lòng đăng nhập để đăng bài viết.')) return;
  articleImgDataUrl = null;
  document.getElementById('a-img-preview').style.display = 'none';
  document.getElementById('a-upload-text').textContent = 'Bấm để chọn ảnh (JPG, PNG...)';
  ['a-title', 'a-summary', 'a-content'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const scamRow = document.getElementById('a-scam-row');
  if (scamRow) scamRow.style.display = articleKind === 'scam' ? 'block' : 'none';
  const scamInput = document.getElementById('a-scam-contact');
  if (scamInput) scamInput.value = '';
  const titleEl = document.getElementById('article-modal-title');
  if (titleEl) titleEl.textContent = articleKind === 'scam' ? '🚫 Đăng cảnh báo lừa đảo' : '💡 Đăng mẹo tìm đồ';
  document.getElementById('article-modal').style.display = 'flex';
}
function closeArticleModal() {
  document.getElementById('article-modal').style.display = 'none';
}
function handleArticleOverlayClick(e) {
  if (e.target.id === 'article-modal') closeArticleModal();
}

/* ── Toast ── */
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove('show'), 2600);
}
