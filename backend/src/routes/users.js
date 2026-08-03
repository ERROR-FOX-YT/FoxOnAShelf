const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db    = require('../db');
const { auth, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

router.get('/', auth, requireAdmin,
  async (req, res, next) => {
    try {
      const { q, role, page } = req.query;
      const result = await db.listarUsuarios({ q, role, page: parseInt(page) || 1 });
      res.json(result);
    } catch (e) { next(e); }
  });

router.get('/buscar/:email', auth, requireAdmin,
  param('email').isEmail(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: 'Correo inválido', code: 400 });
    try {
      const u = await db.obtenerUsuarioPorEmail(req.params.email);
      if (!u) return res.status(404).json({ error: 'Usuario no encontrado', code: 404 });
      res.json({ user: { id: u.id, email: u.email, nombre_mostrado: u.nombre_mostrado, role: u.role } });
    } catch (e) { next(e); }
  });

router.get('/:id',
  auth,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
    const u = await db.obtenerUsuarioPorId(req.params.id);
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado', code: 404 });
    const isSelf = req.user.sub === u.id;
    const isAdmin = req.user.role === 'admin';
    const data = { id: u.id, nombre_mostrado: u.nombre_mostrado, role: u.role, url_avatar: u.url_avatar };
    if (isSelf || isAdmin) {
      data.email = u.email;
      data.informacion_contacto = u.informacion_contacto;
    }
    res.json({ user: data });
  } catch (e) { next(e); }
});

router.put('/:id', auth,
  param('id').isString().isLength({ min: 1 }),
  body('informacion_contacto').optional().isString().isLength({ max: 4000 }),
  body('nombre_mostrado').optional().isString().isLength({ min: 1, max: 100 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      if (req.user.sub !== req.params.id && req.user.role !== 'admin')
        return res.status(403).json({ error: 'No autorizado', code: 403 });
      if (req.body.informacion_contacto !== undefined)
        await db.actualizarInformacionContactoUsuario(req.params.id, req.body.informacion_contacto);
      if (req.body.nombre_mostrado !== undefined)
        await db.actualizarNombreMostradoUsuario(req.params.id, req.body.nombre_mostrado);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

// Eliminar usuario → lo mueve a la papelera (soft delete con recuperación)
router.delete('/:id', auth, requireAdmin,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const target = await db.obtenerUsuarioPorId(req.params.id);
      if (!target) return res.status(404).json({ error: 'Usuario no encontrado', code: 404 });
      if (target.id === req.user.sub) return res.status(403).json({ error: 'No puedes eliminarte a ti mismo', code: 403 });
      if (target.role === 'admin') return res.status(403).json({ error: 'No puedes eliminar a otro administrador', code: 403 });
      const result = await db.eliminarUsuario(req.params.id, { adminEmail: req.user.email });
      if (!result) return res.status(404).json({ error: 'Usuario no encontrado', code: 404 });
      await db.registrarModeracion({ email_actor: req.user.email, accion: 'eliminar-usuario',
                                     objetivo: target.email, ip: req.ip });
      res.json({ ok: true, message: 'Usuario enviado a la papelera. Período de recuperación: 30 días.',
                 enPapelera: result.enPapelera !== false });
    } catch (e) { next(e); }
  });

// ---- PAPELERA ----

// Listar usuarios en la papelera
router.get('/papelera/listar', auth, requireAdmin,
  async (req, res, next) => {
    try {
      const list = await db.listarPapelera();
      res.json({ papelera: list });
    } catch (e) { next(e); }
  });

// Obtener detalle de una entrada de la papelera
router.get('/papelera/:id', auth, requireAdmin,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: 'ID inválido', code: 400 });
    try {
      const entry = await db.obtenerEntradaPapelera(req.params.id);
      if (!entry) return res.status(404).json({ error: 'Entrada no encontrada en la papelera', code: 404 });
      res.json({ entry: {
        id: entry.id,
        email_usuario: entry.email_usuario,
        eliminado_en: entry.eliminado_en,
        expira_en: entry.expira_en,
        eliminado_por: entry.eliminado_por,
        expired: entry.expired,
        user: entry.user,
        data: entry.data
      } });
    } catch (e) { next(e); }
  });

// Restaurar usuario desde la papelera
router.post('/papelera/:id/restaurar', auth, requireAdmin,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: 'ID inválido', code: 400 });
    try {
      const result = await db.restaurarDesdePapelera(req.params.id);
      if (!result) return res.status(404).json({ error: 'Entrada no encontrada en la papelera', code: 404 });
      if (result.error === 'expired')
        return res.status(410).json({ error: 'El período de recuperación ha expirado. Debes eliminarlo permanentemente.', code: 410 });
      if (result.error === 'email_in_use')
        return res.status(409).json({ error: 'El email ya está registrado por otro usuario. No se puede restaurar.', code: 409 });
      await db.registrarModeracion({ email_actor: req.user.email, accion: 'restaurar-usuario',
                                     objetivo: result.email_usuario || 'unknown', ip: req.ip });
      res.json({ ok: true, message: 'Usuario restaurado exitosamente' });
    } catch (e) { next(e); }
  });

// Eliminar permanentemente de la papelera
router.delete('/papelera/:id', auth, requireAdmin,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: 'ID inválido', code: 400 });
    try {
      const entry = await db.obtenerEntradaPapelera(req.params.id);
      if (!entry) return res.status(404).json({ error: 'Entrada no encontrada en la papelera', code: 404 });
      await db.eliminarPermanentePapelera(req.params.id);
      await db.registrarModeracion({ email_actor: req.user.email, accion: 'eliminar-permanente-usuario',
                                     objetivo: entry.email_usuario, ip: req.ip });
      res.json({ ok: true, message: 'Usuario eliminado permanentemente' });
    } catch (e) { next(e); }
  });

// Limpiar entradas expiradas de la papelera
router.post('/papelera/limpiar', auth, requireAdmin,
  async (req, res, next) => {
    try {
      const result = await db.limpiarPapeleraExpirada();
      res.json({ ok: true, eliminados: result.deleted, message: result.deleted + ' entradas expiradas eliminadas' });
    } catch (e) { next(e); }
  });

module.exports = router;
