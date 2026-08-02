/**
 * FoxOnAShelf™ - Manejo de errores centralizado.
 *
 * El frontend espera respuestas JSON consistentes:
 *   { error: 'mensaje', code: 400|401|403|404|500 }
 */
function notFound(req, res, next) {
  if (res.headersSent) return next();
  res.status(404).json({ error: 'Ruta no encontrada', code: 404, path: req.originalUrl });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('[error]', err && err.stack ? err.stack : err);
  const status = err.status || err.statusCode || 500;
  if (res.headersSent) return res.end();
  res.status(status).json({
    error: err.publicMessage || err.message || 'Error interno',
    code: status
  });
}

module.exports = { notFound, errorHandler };
