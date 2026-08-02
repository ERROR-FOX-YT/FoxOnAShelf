const express = require('express');
const { createObjectCsvStringifier } = require('csv-writer');
const { body, param, validationResult } = require('express-validator');
const db      = require('../db');
const { auth, requireAdmin, requireModerator } = require('../middlewares/auth');

const router = express.Router();

// ---- Obtener información de contacto del admin principal (público) ----
router.get('/informacion-contacto', async (req, res, next) => {
  try {
    const main = await db.obtenerUsuarioPorEmail('admin@foxonashelf.app');
    if (!main) return res.json({ informacion_contacto: '' });
    res.json({ informacion_contacto: main.informacion_contacto || '' });
  } catch (e) { next(e); }
});

// ---- Rutas accesibles por moderadores y admins ----
router.use('/baneados', auth, requireModerator);
router.use('/banear', auth, requireModerator);
router.use('/desbanear', auth, requireModerator);
router.use('/moderadores', auth, requireModerator);

router.get('/baneados', async (req, res, next) => {
  try { res.json({ baneados: await db.listarBaneados() }); }
  catch (e) { next(e); }
});

router.post('/banear',
  body('email').isEmail(),
  body('razon').isString().isLength({ min: 3 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { email, razon } = req.body;

      const target = await db.obtenerUsuarioPorEmail(email);
      if (target && target.role === 'admin') {
        return res.status(403).json({ error: 'No puedes banear a otro administrador', code: 403 });
      }
      if (target && target.role === 'moderator' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'No puedes banear a otro moderador', code: 403 });
      }
      if (target && target.email === req.user.email) {
        return res.status(403).json({ error: 'No puedes banearte a ti mismo', code: 403 });
      }

      await db.banearUsuario({ email, razon, banned_by: req.user.email });
      await db.agregarTokensUsuarioAListaNegra(email);
      await db.registrarModeracion({
        email_actor: req.user.email, accion: 'banear',
        objetivo: email, ip: req.ip
      });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.post('/desbanear',
  body('email').isEmail(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      await db.unbanearUsuario(req.body.email, req.user.email);
      await db.registrarModeracion({
        email_actor: req.user.email, accion: 'desbanear',
        objetivo: req.body.email, ip: req.ip
      });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.get('/moderadores', async (req, res, next) => {
  try {
    const all = await db.listarModeradores();
    res.json({ moderadores: all.map(u => ({
      id: u.id,
      email: u.email,
      nombre_mostrado: u.nombre_mostrado,
      role: u.role,
      orden_equipo: u.orden_equipo || 0,
      created_at: u.created_at,
      puede_eliminar: puedeEliminar(req.user, u)
    })) });
  } catch (e) { next(e); }
});

router.post('/moderadores/reordenar', auth, requireAdmin,
  async (req, res, next) => {
    try {
      const { id, direccion } = req.body;
      if (!id || !['up','down'].includes(direccion)) {
        return res.status(400).json({ error: 'id y direccion (up/down) requeridos', code: 400 });
      }
      const ok = await db.moverModerador(id, direccion);
      if (!ok) return res.status(400).json({ error: 'No se puede mover más en esa dirección', code: 400 });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

function puedeEliminar(actor, target) {
  if (target.role === 'admin') return false;
  if (actor.role !== 'admin') return false;
  return true;
}

// ---- Rutas sólo para administradores ----
router.delete('/baneados/:email', auth, requireAdmin,
  param('email').isEmail(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { email } = req.params;
      const group = (await db.listarBaneados()).find(g => g.email.toLowerCase() === email.toLowerCase());
      if (!group) return res.status(404).json({ error: 'Registro no encontrado', code: 404 });
      const hasActive = group.bans.some(b => !b.unbanned_at);
      if (hasActive) return res.status(400).json({ error: 'El usuario aún está baneado, desbanéalo primero', code: 400 });
      await db.eliminarRegistroBaneo(email);
      await db.registrarModeracion({
        email_actor: req.user.email, accion: 'eliminar-registro-baneo',
        objetivo: email, ip: req.ip
      });
      res.json({ ok: true });
    } catch (e) { next(e); }
});

router.post('/quitar-moderador', auth, requireAdmin,
  body('id').isString().notEmpty(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { id } = req.body;
      const target = await db.obtenerUsuarioPorId(id);
      if (!target) return res.status(404).json({ error: 'Usuario no encontrado', code: 404 });
      if (target.role !== 'moderator') return res.status(400).json({ error: 'El usuario no es moderador', code: 400 });
      await db.removerModerador(id);
      await db.registrarModeracion({
        email_actor: req.user.email, accion: 'quitar-moderador',
        objetivo: target.email, ip: req.ip
      });
      res.json({ ok: true });
    } catch (e) { next(e); }
});

router.post('/establecer-moderador', auth, requireAdmin,
  body('email').isEmail(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { email } = req.body;
      const target = await db.obtenerUsuarioPorEmail(email);
      if (!target) return res.status(404).json({ error: 'Usuario no encontrado', code: 404 });
      if (target.role === 'admin') return res.status(400).json({ error: 'No puedes convertir un admin en moderador', code: 400 });
      if (target.role === 'moderator') return res.status(400).json({ error: 'El usuario ya es moderador', code: 400 });
      await db.establecerModerador(target.id);
      await db.registrarModeracion({
        email_actor: req.user.email, accion: 'establecer-moderador',
        objetivo: target.email, ip: req.ip
      });
      res.json({ ok: true });
    } catch (e) { next(e); }
});

router.post('/exportar-baneados', auth, requireAdmin, async (req, res, next) => {
  try {
    const baneados = await db.listarBaneados();
    const rows = [];
    for (const group of baneados) {
      for (const b of group.bans) {
        rows.push({
          email: group.email, razon: b.razon, apelacion: b.apelacion || '',
          banned_at: b.banned_at, unbanned_at: b.unbanned_at || '',
          banned_by: b.banned_by || '', unbanned_by: b.unbanned_by || ''
        });
      }
    }
    const csv = createObjectCsvStringifier({
      header: [
        { id: 'email',        title: 'email' },
        { id: 'razon',        title: 'razón' },
        { id: 'apelacion',    title: 'apelación' },
        { id: 'banned_at',    title: 'baneado el' },
        { id: 'unbanned_at',  title: 'desbaneado el' },
        { id: 'banned_by',    title: 'baneado por' },
        { id: 'unbanned_by',  title: 'desbaneado por' }
      ]
    });
    const body = csv.getHeaderString() + csv.stringifyRecords(rows);
    await db.registrarModeracion({ email_actor: req.user.email,
                                   accion: 'exportar-baneados', objetivo: '-', ip: req.ip });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="usuarios_baneados.csv"');
    res.send('\uFEFF' + body);
  } catch (e) { next(e); }
});

router.put('/informacion-contacto', auth, requireAdmin,
  body('informacion_contacto').isString().isLength({ max: 4000 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const main = await db.obtenerUsuarioPorEmail('admin@foxonashelf.app');
      if (!main) return res.status(404).json({ error: 'Admin principal no encontrado', code: 404 });
      await db.actualizarInformacionContactoUsuario(main.id, req.body.informacion_contacto);
      await db.registrarModeracion({ email_actor: req.user.email,
                                     accion: 'editar-informacion-contacto', objetivo: 'admin@foxonashelf.app', ip: req.ip });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.get('/usuarios', auth, requireModerator,
  async (req, res, next) => {
    try {
      const { q, role } = req.query;
      const result = await db.listarUsuarios({ q, role, page: 1, limit: 500 });
      const bannedList = await db.listarBaneados();
      const bannedMap = {};
      for (const g of bannedList) {
        bannedMap[g.email.toLowerCase()] = g.bans;
      }
      const users = (result.usuarios || []).map(u => ({
        id: u.id,
        email: u.email,
        nombre_mostrado: u.nombre_mostrado,
        role: u.role,
        url_avatar: u.url_avatar,
        created_at: u.created_at,
        historial_baneos: bannedMap[u.email.toLowerCase()] || [],
        esta_baneado: (bannedMap[u.email.toLowerCase()] || []).some(b => !b.unbanned_at)
      }));

      // Agregar cuentas pre-baneadas (existen en usuarios_baneados pero no en usuarios)
      const emailsUsuarios = new Set(users.map(u => u.email.toLowerCase()));
      for (const group of bannedList) {
        const emailLower = group.email.toLowerCase();
        if (!emailsUsuarios.has(emailLower)) {
          const active = group.bans.some(b => !b.unbanned_at);
          // Solo incluirlas si el filtro es 'banned' o no hay filtro
          if (!role || role === 'banned') {
            users.push({
              id: null,
              email: group.email,
              nombre_mostrado: null,
              role: null,
              url_avatar: null,
              created_at: null,
              historial_baneos: group.bans,
              esta_baneado: active,
              pre_baneado: true
            });
          }
        }
      }

      res.json({ users, total: users.length });
    } catch (e) { next(e); }
  });

router.get('/cuentas-eliminadas', auth, requireModerator,
  async (req, res, next) => {
    try {
      const bannedList = await db.listarBaneados();
      const result = [];
      for (const group of bannedList) {
        const delRecords = group.bans.filter(b => b.deleted_at)
          .sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));
        if (delRecords.length === 0) continue;
        const currentUser = await db.obtenerUsuarioPorEmail(group.email);
        result.push({
          email: group.email,
          eliminado_en: delRecords[0].deleted_at,
          eliminado_por: delRecords[0].banned_by || delRecords[0].unbanned_by || null,
          tiene_nuevo_usuario: !!currentUser,
          nuevo_usuario: currentUser ? { id: currentUser.id, nombre_mostrado: currentUser.nombre_mostrado, role: currentUser.role } : null,
          total_eliminaciones: delRecords.length
        });
      }
      res.json({ eliminados: result.sort((a, b) => new Date(b.eliminado_en) - new Date(a.eliminado_en)) });
    } catch (e) { next(e); }
  });

router.post('/apelar',
  auth,
  body('email').isEmail(),
  body('apelacion').isString().isLength({ min: 5, max: 4000 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      if (req.body.email !== req.user.email && req.user.role !== 'admin')
        return res.status(403).json({ error: 'No puedes apelar por otra cuenta', code: 403 });
      await db.enviarApelacion(req.body.email, req.body.apelacion);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

module.exports = router;
