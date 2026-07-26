/* ============================================================
   AUTH.JS — đăng ký / đăng nhập / quên mật khẩu / đăng xuất
   Thay thế Firebase Auth bằng gọi API + lưu JWT ở localStorage
   ============================================================ */

let currentUser = null; // { id, name, email, phone }

/* ── Khôi phục phiên đăng nhập khi tải lại trang ── */
async function initAuth() {
  const token = getToken();
  if (!token) {
    setLoggedOutUI();
    return;
  }
  try {
    const { user } = await api.get('/auth/me');
    currentUser = user;
    setLoggedInUI();
  } catch (err) {
    // token hết hạn / không hợp lệ
    setToken(null);
    currentUser = null;
    setLoggedOutUI();
  }
}

/* ── Đăng nhập ── */
async function doLogin() {
  clearAuthMessages();
  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const pass = document.getElementById('login-pass').value;
  if (!email) return showAuthError('Vui lòng nhập email.');
  if (!pass) return showAuthError('Vui lòng nhập mật khẩu.');

  try {
    const { token, user } = await api.post('/auth/login', { email, password: pass });
    setToken(token);
    currentUser = user;
    setLoggedInUI();
    closeAuth();
    showToast('👋 Chào mừng trở lại!');
    fetchStats();
    fetchPosts(true);
  } catch (err) {
    showAuthError(err.message);
  }
}

/* ── Đăng ký ── */
async function doRegister() {
  clearAuthMessages();
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const phone = document.getElementById('reg-phone').value.trim();
  const pass = document.getElementById('reg-pass').value;
  const pass2 = document.getElementById('reg-pass2').value;

  if (!name) return showAuthError('Vui lòng nhập họ và tên.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showAuthError('Email không hợp lệ.');
  if (phone && !/^0\d{9,10}$/.test(phone)) return showAuthError('Số điện thoại không hợp lệ.');
  if (!pass || pass.length < 6) return showAuthError('Mật khẩu tối thiểu 6 ký tự.');
  if (pass !== pass2) return showAuthError('Mật khẩu xác nhận không khớp.');

  try {
    const { token, user } = await api.post('/auth/register', { name, email, phone, password: pass });
    setToken(token);
    currentUser = user;
    setLoggedInUI();
    closeAuth();
    showToast('🎉 Đăng ký thành công! Chào mừng, ' + name + '!');
  } catch (err) {
    showAuthError(err.message);
  }
}

/* ── Quên mật khẩu ── */
async function doForgotPassword() {
  clearAuthMessages();
  const email = document.getElementById('forgot-email').value.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showAuthError('Vui lòng nhập email hợp lệ.');

  try {
    const data = await api.post('/auth/forgot-password', { email });
    showAuthSuccess(data.message);
    document.getElementById('forgot-email').value = '';
    // Chế độ demo: nếu backend chưa cấu hình SMTP, nó trả kèm link reset trực tiếp
    if (data.devResetUrl) {
      console.log('🔗 [DEV] Link đặt lại mật khẩu:', data.devResetUrl);
      showToast('ℹ️ Chưa cấu hình email — xem link reset trong Console (F12) để demo.');
    }
  } catch (err) {
    showAuthError(err.message);
  }
}

/* ── Đăng xuất ── */
function logout() {
  setToken(null);
  currentUser = null;
  setLoggedOutUI();
  showToast('👋 Đã đăng xuất thành công.');
  fetchPosts(true);
}

function requireAuthThenPost() {
  if (!currentUser) {
    openAuth('login');
    showToast('🔒 Vui lòng đăng nhập để đăng tin.');
  } else {
    openModal();
  }
}

/* ── Alert helpers ── */
function clearAuthMessages() {
  ['auth-error', 'auth-success'].forEach((id) => {
    const el = document.getElementById(id);
    el.style.display = 'none';
    el.textContent = '';
  });
}
function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = '⚠️ ' + msg;
  el.style.display = 'block';
}
function showAuthSuccess(msg) {
  const el = document.getElementById('auth-success');
  el.textContent = '✅ ' + msg;
  el.style.display = 'block';
}

/* ── Modal đăng nhập/đăng ký ── */
function openAuth(tab) {
  document.getElementById('acct-dropdown').classList.remove('open');
  document.getElementById('acct-btn').classList.remove('open');
  clearAuthMessages();
  document.getElementById('auth-modal').style.display = 'flex';
  switchAuthTab(tab || 'login');
  ['login-email', 'login-pass', 'reg-name', 'reg-email', 'reg-phone', 'reg-pass', 'reg-pass2', 'forgot-email'].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    }
  );
}
function closeAuth() {
  document.getElementById('auth-modal').style.display = 'none';
}
function handleAuthOverlay(e) {
  if (e.target.id === 'auth-modal') closeAuth();
}

function switchAuthTab(tab) {
  ['login', 'register', 'forgot'].forEach((t) => {
    document.getElementById('form-' + t).classList.remove('active');
    const tabEl = document.getElementById('tab-' + t);
    if (tabEl) tabEl.classList.remove('active');
  });
  document.getElementById('form-' + tab).classList.add('active');
  const activeTabEl = document.getElementById('tab-' + tab);
  if (activeTabEl) activeTabEl.classList.add('active');
  const subtitles = { login: 'Đăng nhập để đăng tin và theo dõi', register: 'Tạo tài khoản miễn phí', forgot: 'Khôi phục mật khẩu' };
  document.getElementById('auth-subtitle').textContent = subtitles[tab] || '';
  clearAuthMessages();
}

/* ── UI khi đã / chưa đăng nhập ── */
function setLoggedInUI() {
  const btn = document.getElementById('acct-btn');
  btn.classList.add('logged-in');
  const initials = (currentUser.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  document.getElementById('acct-avatar').textContent = initials;
  document.getElementById('acct-name').textContent = currentUser.name ? currentUser.name.split(' ').pop() : '';
  document.getElementById('acct-dd-username').textContent = currentUser.name || currentUser.email;
  document.getElementById('acct-dd-email').textContent = currentUser.email;
  document.getElementById('acct-dd-header').classList.add('visible');
  document.getElementById('dd-guest-section').style.display = 'none';
  document.getElementById('dd-user-section').style.display = 'block';
  document.getElementById('dd-logout-section').style.display = 'block';
}

function setLoggedOutUI() {
  const btn = document.getElementById('acct-btn');
  btn.classList.remove('logged-in', 'open');
  document.getElementById('acct-dd-header').classList.remove('visible');
  document.getElementById('dd-guest-section').style.display = 'block';
  document.getElementById('dd-user-section').style.display = 'none';
  document.getElementById('dd-logout-section').style.display = 'none';
  document.getElementById('acct-dropdown').classList.remove('open');
}

function toggleAcctDropdown() {
  const btn = document.getElementById('acct-btn');
  const dd = document.getElementById('acct-dropdown');
  const open = dd.classList.toggle('open');
  btn.classList.toggle('open', open);
}

document.addEventListener('click', function (e) {
  if (!e.target.closest('.header-actions')) {
    document.getElementById('acct-dropdown').classList.remove('open');
    document.getElementById('acct-btn').classList.remove('open');
  }
});

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  const af = document.querySelector('.auth-form.active');
  if (!af) return;
  if (af.id === 'form-login') doLogin();
  if (af.id === 'form-register') doRegister();
  if (af.id === 'form-forgot') doForgotPassword();
});
