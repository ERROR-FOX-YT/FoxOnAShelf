const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try { res.json(await db.obtenerMetricas()); }
  catch (e) { next(e); }
});

router.get('/destacados', async (req, res, next) => {
  try {
    const libros = await db.listarLibros({ estado: 'publicado', limit: 6 });
    // Destacados por VIEWS (no por likes) — la lista ya viene ordenada por vistas DESC.
    res.json({ destacados: libros });
  } catch (e) { next(e); }
});

module.exports = router;
