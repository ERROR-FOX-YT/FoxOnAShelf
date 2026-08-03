const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../db');
const { auth, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

function isOwnerOrAdmin() {
  return async (req, res, next) => {
    const col = await db.obtenerColeccion(req.params.id);
    if (!col) return res.status(404).json({ error: 'Colección no encontrada', code: 404 });
    if (col.propietario_id !== req.user.sub && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Sin permisos', code: 403 });
    }
    next();
  };
}

router.get('/', async (req, res, next) => {
  try {
    const { propietario_id, publicas } = req.query;
    const colecciones = await db.listarColecciones({
      propietario_id: propietario_id || undefined,
      publicas_only: publicas === 'true'
    });
    res.json({ colecciones });
  } catch (e) { next(e); }
});

router.get('/:id',
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const coleccion = await db.obtenerColeccion(req.params.id);
      if (!coleccion) return res.status(404).json({ error: 'Colección no encontrada', code: 404 });
      const libros = await db.obtenerLibrosColeccion(req.params.id);
      res.json({ coleccion, libros });
    } catch (e) { next(e); }
  });

router.post('/',
  auth,
  body('titulo').isString().isLength({ min: 1 }),
  body('descripcion').optional().isString(),
  body('url_portada').optional().isString(),
  body('color').optional().isString(),
  body('es_publica').optional().isBoolean({ loose: true }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const coleccion = await db.crearColeccion({
        propietario_id: req.user.sub,
        titulo: req.body.titulo,
        descripcion: req.body.descripcion,
        url_portada: req.body.url_portada,
        color: req.body.color,
        es_publica: req.body.es_publica
      });
      res.status(201).json({ coleccion });
    } catch (e) { next(e); }
  });

router.put('/:id',
  auth, isOwnerOrAdmin(),
  param('id').isString().isLength({ min: 1 }),
  body('titulo').optional().isString().isLength({ min: 1 }),
  body('descripcion').optional().isString(),
  body('url_portada').optional().isString(),
  body('color').optional().isString(),
  body('es_publica').optional().isBoolean({ loose: true }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const allowed = ['titulo', 'descripcion', 'url_portada', 'color', 'es_publica'];
      const patch = {};
      for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];
      const coleccion = await db.actualizarColeccion(req.params.id, patch);
      if (!coleccion) return res.status(404).json({ error: 'Colección no encontrada', code: 404 });
      res.json({ coleccion });
    } catch (e) { next(e); }
  });

router.delete('/:id',
  auth, isOwnerOrAdmin(),
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      await db.eliminarColeccion(req.params.id);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.post('/:id/libros',
  auth, isOwnerOrAdmin(),
  param('id').isString().isLength({ min: 1 }),
  body('libro_id').isString().isLength({ min: 1 }),
  body('orden').optional().isInt({ min: 0 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      await db.agregarLibroAColeccion(req.params.id, req.body.libro_id, req.body.orden);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.delete('/:id/libros/:libroId',
  auth, isOwnerOrAdmin(),
  param('id').isString().isLength({ min: 1 }),
  param('libroId').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      await db.quitarLibroDeColeccion(req.params.id, req.params.libroId);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.put('/:id/reordenar',
  auth, isOwnerOrAdmin(),
  param('id').isString().isLength({ min: 1 }),
  body('orden_libros').isArray(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      await db.reordenarLibrosColeccion(req.params.id, req.body.orden_libros);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

module.exports = router;
