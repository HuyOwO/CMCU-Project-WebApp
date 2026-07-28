/* ============================================================
   API.JS — hàm dùng chung để gọi tới backend Express
   ============================================================ */

const TOKEN_KEY = 'dtl_token';

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (e) {}
}

async function apiFetch(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(API_BASE_URL + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error('Không kết nối được máy chủ. Vui lòng thử lại sau vài giây (server có thể đang khởi động).');
  }

  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    /* response không có body JSON (VD: 204) */
  }

  if (!res.ok) {
    throw new Error(data.message || `Lỗi ${res.status}, vui lòng thử lại.`);
  }
  return data;
}

const api = {
  get: (path) => apiFetch(path, { method: 'GET' }),
  post: (path, body) => apiFetch(path, { method: 'POST', body }),
  patch: (path, body) => apiFetch(path, { method: 'PATCH', body }),
  put: (path, body) => apiFetch(path, { method: 'PUT', body }),
  delete: (path) => apiFetch(path, { method: 'DELETE' }),
};
