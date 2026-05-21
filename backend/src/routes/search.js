const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ books: [] });
    const books = await db.listBooks({ q, limit: 30 });
    res.json({ books });
  } catch (e) { next(e); }
});

module.exports = router;
