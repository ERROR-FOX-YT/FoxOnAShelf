const { Router } = require('express');
const { body, param, validationResult } = require('express-validator');
const { auth, requireAdmin } = require('../middlewares/auth');
const db = require('../db');

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const categories = await db.listCategories();
    res.json({ categories });
  } catch (e) { next(e); }
});

router.post('/', auth, requireAdmin,
  body('name').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { name } = req.body;
      if (!name.trim()) return res.status(400).json({ error: 'Nombre requerido', code: 400 });
      await db.createCategory(name.trim().toLowerCase());
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.delete('/:name', auth, requireAdmin,
  param('name').isString().isLength({ min: 1, max: 100 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const deleted = await db.deleteCategory(req.params.name);
      if (!deleted) return res.status(404).json({ error: 'Categoría no encontrada', code: 404 });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

module.exports = router;
