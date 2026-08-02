const { body, param, validationResult } = require('express-validator');
const express = require('express');
const db = require('../db');
const { auth, requireAdmin, requireModerator } = require('../middlewares/auth');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try { res.json({ anuncios: await db.listarAnuncios() }); }
  catch (e) { next(e); }
});

router.post('/', auth, requireModerator,
  body('titulo').isString().isLength({ min: 1 }),
  body('contenido').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const user = await db.obtenerUsuarioPorId(req.user.sub);
      const a = await db.crearAnuncio({
        admin_id: req.user.sub, titulo: req.body.titulo,
        contenido: req.body.contenido,         ruta_imagen: req.body.ruta_imagen,
        autorNombre: user ? user.nombre_mostrado : null,
        autorRol: req.user.role
      });
      res.json({ anuncio: a });
    } catch (e) { next(e); }
  });

router.put('/:id/destacado', auth, requireAdmin,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      await db.alternarDestacado(req.params.id);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.put('/:id/publicado-por', auth, requireAdmin,
  param('id').isString().isLength({ min: 1 }),
  body('publicado_por').isString(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      await db.definirPublicadoPor(req.params.id, req.body.publicado_por);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.put('/:id', auth,
  param('id').isString().isLength({ min: 1 }),
  body('titulo').isString().isLength({ min: 1 }),
  body('contenido').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const ann = await db.obtenerAnuncio(req.params.id);
      if (!ann) return res.status(404).json({ error: 'Anuncio no encontrado', code: 404 });
      if (ann.admin_id !== req.user.sub && req.user.role !== 'admin')
        return res.status(403).json({ error: 'Solo el autor o un administrador pueden editar este anuncio', code: 403 });
      await db.actualizarAnuncio(req.params.id, {
        titulo: req.body.titulo, contenido: req.body.contenido,
        ruta_imagen: req.body.ruta_imagen !== undefined ? req.body.ruta_imagen : ann.ruta_imagen
      });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.delete('/:id', auth,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const ann = await db.obtenerAnuncio(req.params.id);
      if (!ann) return res.status(404).json({ error: 'Anuncio no encontrado', code: 404 });
      if (ann.admin_id !== req.user.sub && req.user.role !== 'admin')
        return res.status(403).json({ error: 'Solo el autor o un administrador pueden eliminar este anuncio', code: 403 });
      await db.eliminarAnuncio(req.params.id);
      res.json({ ok: true });
    }
  catch (e) { next(e); }
});

module.exports = router;
