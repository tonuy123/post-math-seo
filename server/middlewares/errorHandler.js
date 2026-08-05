/**
 * Handler lỗi toàn cục
 * Bắt mọi lỗi truyền qua next(err) hoặc ném ra trong các handler async.
 */
module.exports = function errorHandler(err, req, res, next) {
  console.error('[error]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'Something went wrong',
  });
};