const { query, validationResult } = require('express-validator');
const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/',
  query('q').optional().isString().isLength({ max: 200 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const q = (req.query.q || '').trim();
      if (!q) return res.json({ books: [] });
      const books = await db.listBooks({ q, limit: 30 });
      res.json({ books });
    } catch (e) { next(e); }
  });

router.get('/authors',
  query('q').optional().isString().isLength({ max: 200 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const q = (req.query.q || '').trim();
      const authors = await db.searchAuthors(q);
      res.json({ authors });
    } catch (e) { next(e); }
  });

module.exports = router;
