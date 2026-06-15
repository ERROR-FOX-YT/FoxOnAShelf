/**
 * BookShelf™ - Servidor Express
 *
 * © 2026 Jeison Sossa, Santiago López, Leyder Montoya - MIT License
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
app.use(cors({ origin: cfg.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Sirve archivos subidos
app.use('/storage', express.static(cfg.STORAGE_PATH));

// Rutas API
app.use('/api/health',        require('./routes/health'));
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/books',         require('./routes/books'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/metrics',       require('./routes/metrics'));
app.use('/api/search',        require('./routes/search'));
app.use('/api/upload',        require('./routes/upload'));
app.use('/api/moderation',    require('./routes/moderation'));
app.use('/api/categories',    require('./routes/categories'));
app.use('/api/bookmarks',     require('./routes/bookmarks'));
app.use('/api/user-images',   require('./routes/user-images'));
app.use('/api/changelogs',    require('./routes/changelogs'));
app.use('/api/easter-eggs',   require('./routes/easter-eggs'));
app.use('/api/team',          require('./routes/team'));

// Producción: servir frontend compilado como estático
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

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
  console.log(`BookShelf backend listo en http://localhost:${cfg.PORT} (DB_MODE=${cfg.DB_MODE})`);
  console.log(`Frontend esperado en ${cfg.FRONTEND_URL}`);
});
