/* ============================================================
   MAIN.JS — khởi động ứng dụng khi trang tải xong
   ============================================================ */

/* ── Dark / Light mode ── */
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
  try {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  } catch (e) {}
}

(function initTheme() {
  let saved;
  try {
    saved = localStorage.getItem('theme');
  } catch (e) {}
  if (!saved) {
    saved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  if (saved === 'dark') {
    document.body.classList.add('dark-mode');
    document.addEventListener('DOMContentLoaded', () => {
      const btn = document.getElementById('theme-toggle-btn');
      if (btn) btn.textContent = '☀️';
    });
  }
})();

/* ── Khởi động theo từng trang (nhận diện qua phần tử "root" riêng của trang đó) ── */
document.addEventListener('DOMContentLoaded', async () => {
  await initAuth(); // đợi xong để các trang biết ngay currentUser đã đăng nhập hay chưa

  const fy = document.getElementById('footer-year');
  if (fy) fy.textContent = new Date().getFullYear();

  // ── Trang chủ (index.html): lưới tin + sidebar lọc + 2 khối mẹo/cảnh báo ──
  if (document.getElementById('feed')) {
    initTypeFromQuery();
    fetchStats();
    fetchPosts(1);
    fetchArticleWidget('tip', 'home-tips-grid');
    fetchArticleWidget('scam', 'home-scam-grid');
    wireImageUpload({ inputId: 'f-img', previewId: 'img-preview', textId: 'upload-text', onDone: (d) => (imgDataUrl = d) });

    // Chỉ polling số liệu thống kê (không polling lại danh sách để tránh nhảy
    // người dùng về trang 1 trong lúc họ đang xem các trang phân trang khác)
    setInterval(fetchStats, 30000);

    // Các trang khác (post-detail.html...) không có modal đăng tin, nên nút
    // "+ Đăng tin" ở đó trỏ về index.html?post=1 để tự mở modal ở đây.
    if (new URLSearchParams(location.search).get('post') === '1') {
      requireAuthThenPost();
    }
  }

  // ── Trang chi tiết 1 tin đăng (post-detail.html) ──
  if (document.getElementById('post-detail-root')) {
    const id = new URLSearchParams(location.search).get('id');
    if (id) fetchPostDetail(id);
    else renderPostDetailError('Thiếu mã tin đăng.');
  }

  // ── Trang danh sách bài viết: tips.html (articleKind='tip') / scam-warnings.html (articleKind='scam') ──
  if (document.getElementById('article-grid')) {
    fetchArticles(1);
    wireImageUpload({ inputId: 'a-img', previewId: 'a-img-preview', textId: 'a-upload-text', onDone: (d) => (articleImgDataUrl = d) });

    // Chỉ admin được đăng Mẹo tìm đồ / Cảnh báo lừa đảo — ẩn nút với người dùng thường
    const postArticleBtn = document.getElementById('post-article-btn');
    if (postArticleBtn) postArticleBtn.style.display = currentUser && currentUser.role === 'admin' ? 'inline-block' : 'none';
  }

  // ── Trang chi tiết 1 bài viết (article-detail.html) ──
  if (document.getElementById('article-detail-root')) {
    const id = new URLSearchParams(location.search).get('id');
    if (id) fetchArticleDetail(id);
    else renderArticleDetailError('Thiếu mã bài viết.');
  }

  // ── Trang "Tin của tôi" (my-posts.html): cần đăng nhập ──
  if (document.getElementById('my-posts-content')) {
    wireImageUpload({ inputId: 'f-img', previewId: 'img-preview', textId: 'upload-text', onDone: (d) => (imgDataUrl = d) });
    if (!currentUser) {
      document.getElementById('access-denied').style.display = 'block';
    } else {
      document.getElementById('my-posts-content').style.display = 'block';
      fetchMyPosts(1);
    }
  }

  // ── Trang quản trị (admin.html): chỉ role === 'admin' ──
  if (document.getElementById('admin-content')) {
    if (!currentUser || currentUser.role !== 'admin') {
      document.getElementById('access-denied').style.display = 'block';
      const loginBtn = document.getElementById('admin-login-btn');
      if (loginBtn && currentUser) loginBtn.style.display = 'none'; // đã đăng nhập rồi nhưng không phải admin
    } else {
      document.getElementById('admin-content').style.display = 'block';
      fetchAdminQueue(1);
    }
  }
});
