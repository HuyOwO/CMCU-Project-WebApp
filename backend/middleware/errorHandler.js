// Chạy khi không khớp route nào cả (404)
function notFound(req, res, next) {
  const error = new Error(`Không tìm thấy đường dẫn - ${req.originalUrl}`);
  res.status(404);
  next(error);
}

// Middleware xử lý lỗi tập trung — mọi next(err) trong controller sẽ đi tới đây
function errorHandler(err, req, res, next) {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Sai định dạng ObjectId của Mongo (VD: id không hợp lệ trên URL)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Không tìm thấy dữ liệu.';
  }

  // Trùng dữ liệu unique (VD: email đã tồn tại)
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Dữ liệu đã tồn tại (email đã được đăng ký).';
  }

  // Lỗi validate của Mongoose (thiếu field bắt buộc, sai định dạng...)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  res.status(statusCode).json({
    message,
    // chỉ trả stack trace khi đang phát triển, ẩn đi khi lên production
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
}

module.exports = { notFound, errorHandler };
