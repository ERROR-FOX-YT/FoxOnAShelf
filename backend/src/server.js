/**
 * FoxOnAShelf™ - Servidor Express
 *
 * © 2026 ERROR_FOX - MIT License
 */
const express = require('express');
const path    = require('path');
const cors    = require('cors');
const cfg     = require('./config');

const app = express();

const DEMO_SECRETS = ['demo-secret-do-not-use-in-prod-12345678', 'change-me-in-env'];
if (!cfg.JWT_SECRET || DEMO_SECRETS.includes(cfg.JWT_SECRET) || cfg.JWT_SECRET.length < 32) {
  console.error('');
  console.error('╔══════════════════════════════════════════════════════════════╗');
  console.error('║  FATAL: JWT_SECRET no configurado o inseguro.              ║');
  console.error('║                                                          ║');
  console.error('║  Genera uno con:                                          ║');
  console.error('║    openssl rand -base64 64                                ║');
  console.error('║                                                          ║');
  console.error('║  Luego ponlo en tus variables de entorno:                 ║');
  console.error('║    JWT_SECRET="<lo-que-generó-openssl>"                   ║');
  console.error('╚══════════════════════════════════════════════════════════════╝');
  console.error('');
  process.exit(1);
}

app.set('trust proxy', true);
const allowedOrigins = cfg.FRONTEND_URL.split(',').map(s => s.trim());
app.use(cors({ origin: (origin, cb) => cb(null, allowedOrigins.some(o => o.toLowerCase() === (origin || '').toLowerCase()) || !origin), credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Sirve archivos subidos (excluye db.json por seguridad)
app.use('/storage', (req, res, next) => {
  if (req.path === '/db.json') return res.status(404).end();
  express.static(cfg.STORAGE_PATH)(req, res, next);
});

// Rutas API
app.use('/api/salud',         require('./routes/health'));
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/usuarios',      require('./routes/users'));
app.use('/api/libros',        require('./routes/books'));
app.use('/api/anuncios',      require('./routes/anuncios'));
app.use('/api/metricas',      require('./routes/metrics'));
app.use('/api/busqueda',      require('./routes/search'));
app.use('/api/subida',        require('./routes/upload'));
app.use('/api/moderacion',    require('./routes/moderation'));
app.use('/api/categorias',    require('./routes/categories'));
app.use('/api/marcadores',    require('./routes/bookmarks'));
app.use('/api/imagenes-usuario', require('./routes/user-images'));
app.use('/api/historiales',   require('./routes/changelogs'));
app.use('/api/huevos-pascua', require('./routes/easter-eggs'));
app.use('/api/equipo',        require('./routes/team'));
app.use('/api/chat',          require('./routes/chat'));
app.use('/api/foros',         require('./routes/foros'));
app.use('/api/destacados',    require('./routes/destacados'));

// Error handlers
const { notFound, errorHandler } = require('./middlewares/errors');
app.use('/api', notFound);
app.use(errorHandler);

// Evita que el proceso muera por errores no capturados
process.on('uncaughtException', err => {
  console.error('[uncaughtException]', err.stack || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason && reason.stack ? reason.stack : reason);
});

app.listen(cfg.PORT, () => {
  console.log(`FoxOnAShelf backend listo en http://localhost:${cfg.PORT} (DB_MODE=${cfg.DB_MODE})`);
  console.log(`Frontend esperado en ${cfg.FRONTEND_URL}`);
  const db = require('./db');
  setInterval(() => { db.limpiarListaNegra().catch(e => console.warn('[blacklist-cleanup]', e.message)); }, 24 * 60 * 60 * 1000);
});
