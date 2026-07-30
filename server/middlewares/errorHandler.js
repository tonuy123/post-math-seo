/**
 * Global error handler
 * Catches anything passed via next(err) or thrown in async handlers.
 */
module.exports = function errorHandler(err, req, res, next) {
  console.error('[error]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'Something went wrong',
  });
};