const express = require('express');
const fs      = require('fs');
const path    = require('path');
const { createObjectCsvStringifier } = require('csv-writer');
const { body, validationResult } = require('express-validator');
const db      = require('../db');
const { auth, requireAdmin, isAdminFox, isAdminMain } = require('../middlewares/auth');

const router = express.Router();

router.use(auth, requireAdmin);

// ---- Lista de baneados ----
router.get('/banned', async (req, res, next) => {
  try { res.json({ banned: await db.listBanned() }); }
  catch (e) { next(e); }
});

// ---- Banear ----
router.post('/ban',
  body('email').isEmail(),
  body('reason').isString().isLength({ min: 3 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { email, reason } = req.body;

      // Reglas de protección entre admins
      const target = await db.getUserByEmail(email);
      if (target && target.role === 'admin') {
        return res.status(403).json({ error: 'No puedes banear a otro administrador', code: 403 });
      }
      if (target && target.email === req.user.email) {
        return res.status(403).json({ error: 'No puedes banearte a ti mismo', code: 403 });
      }

      await db.banUser({ email, reason });
      await db.blacklistAllUserTokens(email); // revoca sesiones activas
      await db.logModeration({
        actor_email: req.user.email, action: 'ban',
        target: email, ip: req.ip
      });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

// ---- Desbanear ----
router.post('/unban',
  body('email').isEmail(),
  async (req, res, next) => {
    try {
      await db.unbanUser(req.body.email);
      await db.logModeration({
        actor_email: req.user.email, action: 'unban',
        target: req.body.email, ip: req.ip
      });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

// ---- Lista de moderadores con reglas de visibilidad ----
router.get('/moderators', async (req, res, next) => {
  try {
    const all = await db.listModerators();
    // Reglas:
    //   admin (main o fox) ven a todos.
    //   moderadores regulares NO ven admin ni adminFox.
    const isAdmin = req.user.role === 'admin';
    const visible = isAdmin ? all : all.filter(u => u.role !== 'admin');
    res.json({ moderators: visible.map(u => ({
      id: u.id, email: u.email, display_name: u.display_name,
      role: u.role, is_admin_fox: !!u.is_admin_fox,
      created_at: u.created_at,
      can_delete: canDelete(req.user, u)
    })) });
  } catch (e) { next(e); }
});

function canDelete(actor, target) {
  // admin (main o fox) NO pueden eliminarse mutuamente ni a sí mismos
  if (target.role === 'admin') return false;
  // Sólo admin puede eliminar moderadores regulares
  if (actor.role !== 'admin') return false;
  return true;
}

// ---- Exportar CSV de baneados ----
router.post('/export-banned', async (req, res, next) => {
  try {
    const banned = await db.listBanned();
    const csv = createObjectCsvStringifier({
      header: [
        { id: 'email',       title: 'email' },
        { id: 'reason',      title: 'reason' },
        { id: 'appeal',      title: 'appeal' },
        { id: 'banned_at',   title: 'banned_at' },
        { id: 'unbanned_at', title: 'unbanned_at' }
      ]
    });
    const body = csv.getHeaderString() + csv.stringifyRecords(banned.map(b => ({
      email: b.email, reason: b.reason, appeal: b.appeal || '',
      banned_at: b.banned_at, unbanned_at: b.unbanned_at || ''
    })));
    await db.logModeration({ actor_email: req.user.email,
                             action: 'export-banned', target: '-', ip: req.ip });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="banned_users.csv"');
    res.send('﻿' + body); // BOM para Excel
  } catch (e) { next(e); }
});

// ---- Información y contactos (admin edita perfil del admin@booked.com) ----
router.put('/contact-info',
  body('contact_info').isString().isLength({ max: 4000 }),
  async (req, res, next) => {
    try {
      // Guardamos en el usuario admin principal
      const main = await db.getUserByEmail('admin@booked.com');
      if (!main) return res.status(404).json({ error: 'Admin principal no encontrado', code: 404 });
      await db.updateUserContactInfo(main.id, req.body.contact_info);
      await db.logModeration({ actor_email: req.user.email,
                               action: 'edit-contact-info', target: 'admin@booked.com', ip: req.ip });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

module.exports = router;
