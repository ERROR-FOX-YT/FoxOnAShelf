const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../db');
const { auth, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const [perfiles, titulo] = await Promise.all([db.obtenerPerfilesEquipo(), db.obtenerTituloEquipo()]);
    res.json({ perfiles, titulo });
  } catch (e) { next(e); }
});

router.put('/titulo',
  auth, requireAdmin,
  body('titulo').isString().notEmpty(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      await db.definirTituloEquipo(req.body.titulo);
      res.json({ titulo: req.body.titulo });
    } catch (e) { next(e); }
  }
);

router.put('/reordenar',
  auth, requireAdmin,
  body('idsOrdenados').isArray({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const perfiles = await db.reordenarPerfilesEquipo(req.body.idsOrdenados);
      res.json({ perfiles });
    } catch (e) { next(e); }
  }
);

router.put('/:id',
  auth, requireAdmin,
  param('id').isString().notEmpty(),
  body('nombre').optional().isString(),
  body('edad').optional().isString(),
  body('role').optional().isString(),
  body('admin_email').optional().isString(),
  body('contacto').optional().isString(),
  body('informacion').optional().isString(),
  body('url_foto').optional().isString(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const allowed = {};
      if (req.body.nombre !== undefined) allowed.nombre = req.body.nombre;
      if (req.body.edad !== undefined) allowed.edad = req.body.edad;
      if (req.body.role !== undefined) allowed.role = req.body.role;
      if (req.body.admin_email !== undefined) allowed.admin_email = req.body.admin_email;
      if (req.body.contacto !== undefined) allowed.contacto = req.body.contacto;
      if (req.body.informacion !== undefined) allowed.informacion = req.body.informacion;
      if (req.body.url_foto !== undefined) allowed.url_foto = req.body.url_foto;
      const perfil = await db.actualizarPerfilEquipo(req.params.id, allowed);
      if (!perfil) return res.status(404).json({ error: 'Perfil no encontrado', code: 404 });
      res.json({ perfil });
    } catch (e) { next(e); }
  }
);

module.exports = router;
