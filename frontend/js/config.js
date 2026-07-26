/* ============================================================
   CONFIG.JS — cấu hình chung cho frontend
   ============================================================ */

// ⚠️ QUAN TRỌNG: sau khi deploy backend lên Render, đổi URL bên dưới
// thành URL thật, dạng: https://ten-app-cua-ban.onrender.com/api
const API_BASE_URL =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://dothatlac-hn-backend.onrender.com/api'; // 👉 đổi thành URL Render thật của bạn
