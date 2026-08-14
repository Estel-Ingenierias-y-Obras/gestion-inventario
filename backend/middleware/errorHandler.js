const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;
  const logEntry = { name: err.name || 'Error', statusCode };
  if (process.env.NODE_ENV !== 'production') logEntry.message = err.message;
  console.error('[ERROR]', logEntry);

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'JSON inválido.',
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos.',
      errors: Object.values(err.errors).map((error) => error.message),
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Identificador inválido.',
    });
  }

  return res.status(statusCode).json({
    success: false,
    message: statusCode >= 500
      ? 'Internal Server Error'
      : err.message || 'Ha ocurrido un error.',
  });
};

module.exports = errorHandler;
