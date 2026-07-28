/* ============================================================
   ARTICLES.JS — "Mẹo tìm đồ" (tip) & "Số điện thoại lừa đảo" (scam)
   ============================================================ */

const ARTICLE_PAGE_SIZE = 9;
const WIDGET_LIMIT = 3;

const ARTICLE_KIND_CFG = {
  tip: { label: 'Mẹo tìm đồ', icon: '💡', listPage: 'tips.html', cls: '' },
  scam: { label: 'Cảnh báo lừa đảo', icon: '🚫', listPage: 'scam-warnings.html', cls: 'warn' },
};

// State cho trang danh sách (tips.html / scam-warnings.html)
let articleKind = 'tip';
let articleList = [];
let articlePage = 1;
let articleTotalPages = 1;

// State cho trang chi tiết (article-detail.html)
let currentArticle = null;
let articleImgDataUrl = null;

/* ── Trang danh sách: tải bài viết theo kind + phân trang/tìm kiếm ── */
async function fetchArticles(page) {
  articlePage = page || 1;
  const params = new URLSearchParams();
  params.set('kind', articleKind);
  params.set('page', articlePage);
  params.set('limit', ARTICLE_PAGE_SIZE);
  const q = (document.getElementById('article-search') || {}).value?.trim();
  if (q) params.set('q', q);

  try {
    const data = await api.get('/articles?' + params.toString());
    articleList = data.articles;
    articleTotalPages = data.pages;
    renderArticleGrid(data.total);
  } catch (err) {
    showToast('❌ ' + err.message);
  }
}

function goToArticlePage(n) {
  if (n < 1 || n > articleTotalPages || n === articlePage) return;
  fetchArticles(n);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Widget mini ở trang chủ: 3 bài mới nhất mỗi loại ── */
async function fetchArticleWidget(kind, targetElId) {
  try {
    const data = await api.get(`/articles?kind=${kind}&limit=${WIDGET_LIMIT}`);
    renderArticleMiniGrid(targetElId, kind, data.articles);
  } catch (err) {
    console.error('Lỗi tải bài viết:', err.message);
  }
}

/* ── Trang chi tiết bài viết ── */
async function fetchArticleDetail(idOrSlug) {
  try {
    const { article } = await api.get(`/articles/${idOrSlug}`);
    currentArticle = article;
    renderArticleDetail();
  } catch (err) {
    renderArticleDetailError(err.message);
  }
}

/* ── Đăng bài viết mới (Mẹo tìm đồ / Cảnh báo lừa đảo) — cần đăng nhập ── */
async function submitArticle() {
  if (!currentUser) {
    showToast('🔒 Vui lòng đăng nhập để đăng bài viết.');
    return;
  }

  const title = document.getElementById('a-title').value.trim();
  const summary = document.getElementById('a-summary').value.trim();
  const contentRaw = document.getElementById('a-content').value.trim();
  const scamContact = (document.getElementById('a-scam-contact') || {}).value?.trim() || '';

  if (!title) return alert('Vui lòng nhập tiêu đề bài viết!');
  if (!contentRaw) return alert('Vui lòng nhập nội dung bài viết!');

  const submitBtn = document.querySelector('#article-modal .btn-primary');
  const oldLabel = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Đang đăng...';
  }

  try {
    await api.post('/articles', {
      kind: articleKind,
      title,
      summary,
      content: contentRaw.split('\n'),
      thumbnail: articleImgDataUrl || null,
      scamContact,
    });

    closeArticleModal();
    showToast('✅ Đã đăng bài viết thành công!');
    fetchArticles(1);
  } catch (err) {
    console.error(err);
    showToast('❌ ' + (err.message || 'Đăng bài lỗi, vui lòng thử lại.'));
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = oldLabel;
    }
  }
}

function shareArticle(a) {
  if (!a) return;
  const text = `${a.title}\n${a.summary || ''}`;
  if (navigator.share) {
    navigator.share({ title: a.title, text, url: window.location.href }).catch(() => {});
  } else {
    navigator.clipboard
      .writeText(text + '\n' + window.location.href)
      .then(() => showToast('📋 Đã sao chép liên kết bài viết!'))
      .catch(() => showToast('Không thể sao chép — vui lòng thử lại'));
  }
}
