/**
 * Booked™ - Servidor Express
 *
 * © 2026 Jeison Sossa, Santiago López, Leyder Montoya - MIT License
 */
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const cfg     = require('./config');

const app = express();

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

// Error handlers
const { notFound, errorHandler } = require('./middlewares/errors');
app.use('/api', notFound);
app.use(errorHandler);

app.listen(cfg.PORT, () => {
  console.log(`Booked backend listo en http://localhost:${cfg.PORT} (DB_MODE=${cfg.DB_MODE})`);
  console.log(`Frontend esperado en ${cfg.FRONTEND_URL}`);
});
