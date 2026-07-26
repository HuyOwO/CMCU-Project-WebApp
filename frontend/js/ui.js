/* ============================================================
   UI.JS — render danh sách tin (feed), tabs, bộ lọc, modal
   ============================================================ */

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

/* ── Chuyển tab loại tin (Tất cả / Mất đồ / Nhặt được...) ── */
function setTab(t, el) {
  activeTab = t;
  document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
  el.classList.add('active');
  fetchPosts(true);
}

function onFilter() {
  fetchPosts(true);
  updateFilterBadge();
}

function toggleFilterPanel() {
  const panel = document.getElementById('filter-panel');
  const btn = document.getElementById('filter-more-btn');
  panel.classList.toggle('open');
  btn.classList.toggle('open');
}

function resetFilters() {
  ['fp-status', 'fp-urgent', 'fp-date-from', 'fp-date-to'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('district-filter').value = '';
  document.getElementById('sort-select').value = 'newest';
  updateFilterBadge();
  onFilter();
}

function updateFilterBadge() {
  const btn = document.getElementById('filter-more-btn');
  const hasActive = ['fp-status', 'fp-urgent', 'fp-date-from', 'fp-date-to'].some((id) => {
    const el = document.getElementById(id);
    return el && el.value;
  });
  btn.classList.toggle('has-active', hasActive);
  btn.firstChild.textContent = hasActive ? '⚙️ Bộ lọc ● ' : '⚙️ Bộ lọc ';
}

/* ── Vẽ danh sách thẻ tin ra #feed ── */
function renderFeed() {
  const feed = document.getElementById('feed');
  const lmw = document.getElementById('load-more-wrap');

  if (!posts.length) {
    feed.innerHTML = '<div class="empty"><div class="empty-icon">🔍</div>Không có tin nào phù hợp</div>';
    lmw.innerHTML = '';
    return;
  }

  feed.innerHTML = posts.map(cardTemplate).join('');

  lmw.innerHTML =
    currentPage < totalPages
      ? `<button class="btn-load-more" onclick="loadMore()">Xem thêm tin ↓</button>`
      : '';
}

function cardTemplate(p) {
  const id = p._id;
  const tc = TYPE_CFG[p.type];
  const isRevealed = revealedPhones.has(id);
  const isMatched = matchedPosts.has(id);
  const isFlagged = flaggedPosts.has(id);
  const isNew = Date.now() - new Date(p.createdAt).getTime() < 60000;

  const imgSection = p.img
    ? `<div class="card-img-wrap"><img class="card-img" src="${p.img}" alt="${p.name}"></div>`
    : `<div class="card-img-wrap"><div class="card-img-placeholder">${tc.icon}<span>Chưa có ảnh</span></div></div>`;

  const urgentBadge = p.isUrgent && p.status === 'open' ? `<span class="badge badge-urgent">⚡ KHẨN</span>` : '';
  const closedBadge = p.status === 'closed' ? `<span class="badge badge-closed">✔ Đã tìm thấy</span>` : '';
  const rewardBadge = p.reward ? `<span class="badge badge-reward">🎁 ${p.reward}</span>` : '';
  const newTag = isNew ? `<span class="new-tag">MỚI</span>` : '';
  const dateStr = p.date ? `<span>📅 ${p.date}</span>` : '';

  const phoneHtml = p.phone
    ? `
        <div class="card-phone">📞
          ${
            isRevealed
              ? `<span class="phone-masked" style="color:#166534">${p.phone}</span>`
              : `<span class="phone-masked" onclick="revealPhone('${id}')">${maskPhone(p.phone)} <span class="phone-hint">(bấm để xem)</span></span>`
          }
        </div>`
    : '';

  const matchBtn = `<button class="btn-action${isMatched ? ' active-match' : ''}" onclick="toggleMatch('${id}')">👀 Quan tâm (${p.matches})</button>`;

  const resolveBtn =
    p.status === 'open'
      ? `<button class="btn-action resolve" onclick="resolvePost('${id}')">✅ Đã tìm thấy</button>`
      : `<button class="btn-action" onclick="resolvePost('${id}')">↩️ Mở lại</button>`;

  return `
        <div class="card${p.isUrgent && p.status === 'open' ? ' is-urgent' : ''}${p.status === 'closed' ? ' is-closed' : ''}">
          <div class="card-body">
            <div class="card-top">
              <div class="card-badges">
                <span class="badge ${tc.cls}">${tc.label}</span>
                ${urgentBadge}${closedBadge}${rewardBadge}${newTag}
              </div>
              <span class="time-label">${timeAgo(p.createdAt)}</span>
            </div>
            <div class="card-title">${p.name}</div>
            <div class="card-meta">
              <span>📍 ${p.district}</span>
              <span>🏢 ${p.location}</span>
              ${dateStr}
            </div>
            <div class="card-desc">${p.desc}</div>
            ${phoneHtml}
            <div class="card-actions">
              ${matchBtn}
              ${resolveBtn}
              <button class="btn-action" onclick="sharePost('${id}')">📤 Chia sẻ</button>
              <button class="btn-action${isFlagged ? ' active-flag' : ''}" onclick="toggleFlag('${id}')" title="Báo cáo nghi ngờ lừa đảo">
                ${isFlagged ? '⚠️ Đã báo cáo' : '🚩 Báo cáo'}
              </button>
              <div class="card-views">👁 ${p.views}</div>
            </div>
          </div>
          ${imgSection}
        </div>`;
}

/* ── Modal đăng tin ── */
function openModal() {
  if (!currentUser) {
    requireAuthThenPost();
    return;
  }
  imgDataUrl = null;
  imgFile = null;
  document.getElementById('img-preview').style.display = 'none';
  document.getElementById('upload-text').textContent = 'Bấm để chọn ảnh (JPG, PNG...)';
  document.getElementById('f-urgent').checked = false;
  document.getElementById('f-date').value = new Date().toISOString().slice(0, 10);
  ['f-name', 'f-location', 'f-desc', 'f-phone', 'f-reward'].forEach((id) => {
    document.getElementById(id).value = '';
  });
  document.getElementById('modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

function handleOverlayClick(e) {
  if (e.target.id === 'modal') closeModal();
}

/* ── Toast ── */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}
