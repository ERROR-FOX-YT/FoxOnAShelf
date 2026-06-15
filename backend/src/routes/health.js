const express = require('express');
const cfg = require('../config');
const router = express.Router();

router.get('/', (_req, res, next) => {
  res.json({ ok: true, service: 'BookShelf backend',
             mode: cfg.DB_MODE, time: new Date().toISOString() });
});

module.exports = router;
