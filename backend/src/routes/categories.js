const { Router } = require('express');
const { body, param, validationResult } = require('express-validator');
const { auth, requireAdmin } = require('../middlewares/auth');
const db = require('../db');

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const categorias = await db.listarCategorias();
    res.json({ categorias });
  } catch (e) { next(e); }
});

router.post('/', auth, requireAdmin,
  body('nombre').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { nombre } = req.body;
      if (!nombre.trim()) return res.status(400).json({ error: 'Nombre requerido', code: 400 });
      await db.crearCategoria(nombre.trim().toLowerCase());
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.delete('/:nombre', auth, requireAdmin,
  param('nombre').isString().isLength({ min: 1, max: 100 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const deleted = await db.eliminarCategoria(req.params.nombre);
      if (!deleted) return res.status(404).json({ error: 'Categoría no encontrada', code: 404 });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

module.exports = router;
