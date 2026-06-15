const express = require('express');
const { createObjectCsvStringifier } = require('csv-writer');
const { body, param, validationResult } = require('express-validator');
const db      = require('../db');
const { auth, requireAdmin, requireModerator } = require('../middlewares/auth');

const router = express.Router();

// ---- Obtener información de contacto del admin principal (público) ----
router.get('/contact-info', async (req, res, next) => {
  try {
    const main = await db.getUserByEmail('admin@bookshelf.app');
    if (!main) return res.json({ contact_info: '' });
    res.json({ contact_info: main.contact_info || '' });
  } catch (e) { next(e); }
});

// ---- Rutas accesibles por moderadores y admins ----
router.use('/banned', auth, requireModerator);
router.use('/ban', auth, requireModerator);
router.use('/unban', auth, requireModerator);
router.use('/moderators', auth, requireModerator);

router.get('/banned', async (req, res, next) => {
  try { res.json({ banned: await db.listBanned() }); }
  catch (e) { next(e); }
});

router.post('/ban',
  body('email').isEmail(),
  body('reason').isString().isLength({ min: 3 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { email, reason } = req.body;

      const target = await db.getUserByEmail(email);
      if (target && target.role === 'admin') {
        return res.status(403).json({ error: 'No puedes banear a otro administrador', code: 403 });
      }
      if (target && target.role === 'moderator' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'No puedes banear a otro moderador', code: 403 });
      }
      if (target && target.email === req.user.email) {
        return res.status(403).json({ error: 'No puedes banearte a ti mismo', code: 403 });
      }

      await db.banUser({ email, reason, banned_by: req.user.email });
      await db.blacklistAllUserTokens(email);
      await db.logModeration({
        actor_email: req.user.email, action: 'ban',
        target: email, ip: req.ip
      });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.post('/unban',
  body('email').isEmail(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      await db.unbanUser(req.body.email, req.user.email);
      await db.logModeration({
        actor_email: req.user.email, action: 'unban',
        target: req.body.email, ip: req.ip
      });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.get('/moderators', async (req, res, next) => {
  try {
    const all = await db.listModerators();
    res.json({ moderators: all.map(u => ({
      id: u.id,
      email: u.email,
      display_name: u.display_name,
      role: u.role,
      team_sort: u.team_sort || 0,
      created_at: u.created_at,
      can_delete: canDelete(req.user, u)
    })) });
  } catch (e) { next(e); }
});

router.post('/moderators/reorder', auth, requireAdmin,
  async (req, res, next) => {
    try {
      const { id, direction } = req.body;
      if (!id || !['up','down'].includes(direction)) {
        return res.status(400).json({ error: 'id y direction (up/down) requeridos', code: 400 });
      }
      const ok = await db.moveModerator(id, direction);
      if (!ok) return res.status(400).json({ error: 'No se puede mover más en esa dirección', code: 400 });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

function canDelete(actor, target) {
  if (target.role === 'admin') return false;
  if (actor.role !== 'admin') return false;
  return true;
}

// ---- Rutas sólo para administradores ----
router.delete('/banned/:email', auth, requireAdmin,
  param('email').isEmail(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { email } = req.params;
      const group = (await db.listBanned()).find(g => g.email.toLowerCase() === email.toLowerCase());
      if (!group) return res.status(404).json({ error: 'Registro no encontrado', code: 404 });
      const hasActive = group.bans.some(b => !b.unbanned_at);
      if (hasActive) return res.status(400).json({ error: 'El usuario aún está baneado, desbanéalo primero', code: 400 });
      await db.deleteBanRecord(email);
      await db.logModeration({
        actor_email: req.user.email, action: 'delete-ban-record',
        target: email, ip: req.ip
      });
      res.json({ ok: true });
    } catch (e) { next(e); }
});

router.post('/remove-moderator', auth, requireAdmin,
  body('id').isString().notEmpty(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { id } = req.body;
      const target = await db.getUserById(id);
      if (!target) return res.status(404).json({ error: 'Usuario no encontrado', code: 404 });
      if (target.role !== 'moderator') return res.status(400).json({ error: 'El usuario no es moderador', code: 400 });
      await db.removeModerator(id);
      await db.logModeration({
        actor_email: req.user.email, action: 'remove-moderator',
        target: target.email, ip: req.ip
      });
      res.json({ ok: true });
    } catch (e) { next(e); }
});

router.post('/set-moderator', auth, requireAdmin,
  body('email').isEmail(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { email } = req.body;
      const target = await db.getUserByEmail(email);
      if (!target) return res.status(404).json({ error: 'Usuario no encontrado', code: 404 });
      if (target.role === 'admin') return res.status(400).json({ error: 'No puedes convertir un admin en moderador', code: 400 });
      if (target.role === 'moderator') return res.status(400).json({ error: 'El usuario ya es moderador', code: 400 });
      await db.setModerator(target.id);
      await db.logModeration({
        actor_email: req.user.email, action: 'set-moderator',
        target: target.email, ip: req.ip
      });
      res.json({ ok: true });
    } catch (e) { next(e); }
});

router.post('/export-banned', auth, requireAdmin, async (req, res, next) => {
  try {
    const banned = await db.listBanned();
    const rows = [];
    for (const group of banned) {
      for (const b of group.bans) {
        rows.push({
          email: group.email, reason: b.reason, appeal: b.appeal || '',
          banned_at: b.banned_at, unbanned_at: b.unbanned_at || '',
          banned_by: b.banned_by || '', unbanned_by: b.unbanned_by || ''
        });
      }
    }
    const csv = createObjectCsvStringifier({
      header: [
        { id: 'email',       title: 'email' },
        { id: 'reason',      title: 'reason' },
        { id: 'appeal',      title: 'appeal' },
        { id: 'banned_at',   title: 'banned_at' },
        { id: 'unbanned_at', title: 'unbanned_at' },
        { id: 'banned_by',   title: 'banned_by' },
        { id: 'unbanned_by', title: 'unbanned_by' }
      ]
    });
    const body = csv.getHeaderString() + csv.stringifyRecords(rows);
    await db.logModeration({ actor_email: req.user.email,
                             action: 'export-banned', target: '-', ip: req.ip });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="banned_users.csv"');
    res.send('\uFEFF' + body);
  } catch (e) { next(e); }
});

router.put('/contact-info', auth, requireAdmin,
  body('contact_info').isString().isLength({ max: 4000 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const main = await db.getUserByEmail('admin@bookshelf.app');
      if (!main) return res.status(404).json({ error: 'Admin principal no encontrado', code: 404 });
      await db.updateUserContactInfo(main.id, req.body.contact_info);
      await db.logModeration({ actor_email: req.user.email,
                               action: 'edit-contact-info', target: 'admin@bookshelf.app', ip: req.ip });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.get('/users', auth, requireModerator,
  async (req, res, next) => {
    try {
      const { q, role } = req.query;
      const result = await db.listUsers({ q, role, page: 1, limit: 500 });
      const bannedList = await db.listBanned();
      const bannedMap = {};
      for (const g of bannedList) {
        bannedMap[g.email.toLowerCase()] = g.bans;
      }
      const users = (result.users || []).map(u => ({
        id: u.id,
        email: u.email,
        display_name: u.display_name,
        role: u.role,
        avatar_url: u.avatar_url,
        created_at: u.created_at,
        ban_history: bannedMap[u.email.toLowerCase()] || [],
        is_banned: (bannedMap[u.email.toLowerCase()] || []).some(b => !b.unbanned_at)
      }));

      // Agregar cuentas pre-baneadas (existen en banned_users pero no en users)
      const userEmails = new Set(users.map(u => u.email.toLowerCase()));
      for (const group of bannedList) {
        const emailLower = group.email.toLowerCase();
        if (!userEmails.has(emailLower)) {
          const active = group.bans.some(b => !b.unbanned_at);
          // Solo incluirlas si el filtro es 'banned' o no hay filtro
          if (active || role !== 'banned') {
            users.push({
              id: null,
              email: group.email,
              display_name: null,
              role: null,
              avatar_url: null,
              created_at: null,
              ban_history: group.bans,
              is_banned: active,
              pre_banned: true
            });
          }
        }
      }

      res.json({ users, total: users.length });
    } catch (e) { next(e); }
  });

router.get('/deleted-accounts', auth, requireModerator,
  async (req, res, next) => {
    try {
      const bannedList = await db.listBanned();
      const result = [];
      for (const group of bannedList) {
        const delRecords = group.bans.filter(b => b.deleted_at)
          .sort((a, b) => b.deleted_at.localeCompare(a.deleted_at));
        if (delRecords.length === 0) continue;
        const currentUser = await db.getUserByEmail(group.email);
        result.push({
          email: group.email,
          deleted_at: delRecords[0].deleted_at,
          deleted_by: delRecords[0].banned_by || delRecords[0].unbanned_by || null,
          has_new_user: !!currentUser,
          new_user: currentUser ? { id: currentUser.id, display_name: currentUser.display_name, role: currentUser.role } : null,
          total_deletions: delRecords.length
        });
      }
      res.json({ deleted: result.sort((a, b) => b.deleted_at.localeCompare(a.deleted_at)) });
    } catch (e) { next(e); }
  });

router.post('/appeal',
  auth,
  body('email').isEmail(),
  body('appeal').isString().isLength({ min: 5, max: 4000 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      await db.submitAppeal(req.body.email, req.body.appeal);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

module.exports = router;
