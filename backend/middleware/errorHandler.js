export function notFound(req, res) {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
}

export function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  if (err.name === 'CastError') { status = 404; message = 'The requested resource was not found'; }
  if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors).map((item) => item.message).join(', '); }
  if (err.code === 11000) { status = 409; message = 'A record with that value already exists'; }
  if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') { status = 503; message = 'Database is unavailable. Check MongoDB and MONGODB_URI.'; }
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Internal server error' : message });
}
