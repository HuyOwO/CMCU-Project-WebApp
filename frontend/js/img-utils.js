/* ============================================================
   IMG-UTILS.JS — nén ảnh phía client trước khi gửi lên server
   Dùng chung cho form đăng tin (posts.js) và đăng bài viết (articles.js)
   ============================================================ */

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

/**
 * Gắn xử lý chọn + nén ảnh cho 1 khối "img-upload-box".
 * @param {object} opts
 *  - inputId: id của <input type=file>
 *  - previewId: id của <img> preview
 *  - textId: id của dòng chữ hướng dẫn
 *  - onDone(dataUrl): callback khi nén xong
 */
function wireImageUpload({ inputId, previewId, textId, onDone }) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const textEl = document.getElementById(textId);
    if (textEl) textEl.textContent = '⏳ Đang nén ảnh...';
    compressImageToBase64(file)
      .then((dataUrl) => {
        const el = document.getElementById(previewId);
        el.src = dataUrl;
        el.style.display = 'block';
        if (textEl) textEl.textContent = '✅ ' + file.name + ' (~' + Math.round(dataUrl.length / 1024) + 'KB sau khi nén)';
        onDone(dataUrl);
      })
      .catch((err) => {
        console.error(err);
        if (textEl) textEl.textContent = 'Bấm để chọn ảnh (JPG, PNG...)';
        onDone(null);
        showToast('❌ Ảnh quá nặng hoặc bị lỗi, vui lòng chọn ảnh khác.');
      });
  });
}
