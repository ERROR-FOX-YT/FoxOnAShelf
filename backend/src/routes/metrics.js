const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try { res.json(await db.getMetrics()); }
  catch (e) { next(e); }
});

router.get('/featured', async (req, res, next) => {
  try {
    const books = await db.listBooks({ status: 'published', limit: 6 });
    // Destacados por VIEWS (no por likes) — la lista ya viene ordenada por views DESC.
    res.json({ featured: books });
  } catch (e) { next(e); }
});

module.exports = router;
