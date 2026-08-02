const express = require('express');
const cfg = require('../config');
const db = require('../db');
const router = express.Router();

router.get('/', async (_req, res) => {
  let dbStatus = 'down';
  try { await db.ping(); dbStatus = 'up'; } catch { dbStatus = 'down'; }
  res.json({
    ok: dbStatus === 'up',
    service: 'FoxOnAShelf backend',
    mode: cfg.DB_MODE,
    db: dbStatus,
    time: new Date().toISOString()
  });
});

module.exports = router;
