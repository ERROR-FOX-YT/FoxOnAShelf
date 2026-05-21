const express = require('express');
const bcrypt  = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db      = require('../db');
const { signToken } = require('../middlewares/auth');

const router = express.Router();

router.post('/register',
  body('email').isEmail().withMessage('Correo inválido'),
  body('password').isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
  body('display_name').isString().optional(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { email, password, display_name } = req.body;
      if (await db.isEmailBanned(email))
        return res.status(403).json({ error: 'Este correo está baneado', code: 403 });
      const existing = await db.getUserByEmail(email);
      if (existing) return res.status(400).json({ error: 'El correo ya está registrado', code: 400 });
      const hash = await bcrypt.hash(password, 10);
      const user = await db.createUser({ email, password_hash: hash,
                                         display_name: display_name || email.split('@')[0],
                                         role: 'user' });
      const token = signToken(user);
      res.json({ token, user: publicUser(user) });
    } catch (e) { next(e); }
  });

router.post('/login',
  body('email').isEmail(),
  body('password').isString(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: 'Datos inválidos', code: 400 });
    try {
      const { email, password } = req.body;
      const banned = await db.isEmailBanned(email);
      if (banned) {
        return res.status(403).json({
          error: 'Cuenta baneada',
          code: 403,
          banned: true,
          can_appeal: !banned.appeal_submitted,
          reason: banned.reason
        });
      }
      const user = await db.getUserByEmail(email);
      if (!user) return res.status(401).json({ error: 'Credenciales inválidas', code: 401 });
      const ok = await bcrypt.compare(password, user.password_hash || '');
      if (!ok) return res.status(401).json({ error: 'Credenciales inválidas', code: 401 });
      const token = signToken(user);
      res.json({ token, user: publicUser(user) });
    } catch (e) { next(e); }
  });

router.post('/appeal',
  body('email').isEmail(),
  body('appeal').isString().isLength({ min: 5 }),
  async (req, res, next) => {
    try {
      const { email, appeal } = req.body;
      const banned = await db.isEmailBanned(email);
      if (!banned)      return res.status(400).json({ error: 'Cuenta no baneada', code: 400 });
      if (banned.appeal_submitted)
        return res.status(400).json({ error: 'Ya enviaste tu apelación', code: 400 });
      await db.submitAppeal(email, appeal);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

function publicUser(u) {
  return { id: u.id, email: u.email, display_name: u.display_name,
           role: u.role, is_admin_fox: !!u.is_admin_fox, avatar_url: u.avatar_url };
}

module.exports = router;
