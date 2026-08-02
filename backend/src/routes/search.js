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
      if (!q) return res.json({ libros: [] });
      const libros = await db.listarLibros({ q, limit: 30 });
      res.json({ libros });
    } catch (e) { next(e); }
  });

router.get('/autores',
  query('q').optional().isString().isLength({ max: 200 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const q = (req.query.q || '').trim();
      const autores = await db.buscarAutores(q);
      res.json({ autores });
    } catch (e) { next(e); }
  });

module.exports = router;
