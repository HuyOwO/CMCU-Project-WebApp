/* ============================================================
   MAIN.JS — khởi động ứng dụng khi trang tải xong
   ============================================================ */

/* ── Dark / Light mode (giữ nguyên logic gốc) ── */
function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  document.getElementById('theme-toggle-btn').textContent = isDark ? '☀️' : '🌙';
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
      document.getElementById('theme-toggle-btn').textContent = '☀️';
    });
  }
})();

/* ── Khởi động ứng dụng ── */
document.addEventListener('DOMContentLoaded', () => {
  initAuth(); // khôi phục phiên đăng nhập nếu có token hợp lệ trong localStorage
  fetchStats();
  fetchPosts(true);

  // Thay cho onSnapshot() realtime của Firestore: polling định kỳ mỗi 30s
  // (đủ dùng cho đồ án; nếu muốn realtime thật sự có thể nâng cấp bằng Socket.IO)
  setInterval(() => {
    fetchStats();
    fetchPosts(true);
  }, 30000);
});
