const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { auth, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

router.get('/', auth, requireAdmin, async (_req, res, next) => {
  try {
    const eggs = await db.obtenerHuevosPascua();
    res.json({ huevos_pascua: eggs });
  } catch (e) { next(e); }
});

router.put('/',
  auth, requireAdmin,
  body('huevos_pascua').isArray().withMessage('huevos_pascua debe ser un array'),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      await db.actualizarHuevosPascua(req.body.huevos_pascua);
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
);

module.exports = router;
