const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err.message);

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

  const statusCode = err.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message: statusCode >= 500
      ? 'Internal Server Error'
      : err.message || 'Ha ocurrido un error.',
  });
};

module.exports = errorHandler;
