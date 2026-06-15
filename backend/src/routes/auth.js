const express = require('express');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const cfg     = require('../config');
const db      = require('../db');
const { signToken } = require('../middlewares/auth');
const { rateLimit } = require('../middlewares/rate-limit');

const router = express.Router();

router.post('/register',
  body('email').isEmail().withMessage('Correo inválido'),
  body('password').isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
  body('display_name').optional().isString(),
  async (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    if (rateLimit(ip, 5, 60000)) return res.status(429).json({ error: 'Demasiados registros, intenta más tarde', code: 429 });
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { email, password, display_name } = req.body;
      const egg = await db.getEasterEgg('register_username');
      const eggMsg = (egg && egg.message) || 'Nu uh, eso es mío!';
      if (display_name) {
        const normalized = display_name.toLowerCase().replace(/[\s_-]+/g, '');
        if (normalized === 'errorfox') {
          return res.status(418).json({ error: 'ERROR 418: "' + eggMsg + '"', code: 418, easter_egg: true });
        }
      }
      if (await db.isEmailBanned(email))
        return res.status(403).json({ error: 'Este correo está baneado', code: 403 });
      const existing = await db.getUserByEmail(email);
      if (existing) return res.status(400).json({ error: 'El correo ya está registrado', code: 400 });
      const finalName = (display_name || email.split('@')[0]).toLowerCase().replace(/\s+/g, ' ');
      if (/^error[ _]fox$/i.test(finalName))
        return res.status(418).json({ error: 'ERROR 418: "' + eggMsg + '"', code: 418, easter_egg: true });
      const hash = await bcrypt.hash(password, 10);
      const user = await db.createUser({ email, password_hash: hash,
                                         display_name: display_name || email.split('@')[0],
                                         role: 'user' });
      const token = signToken(user);
      const refreshToken = await db.createRefreshToken(user.id);
      res.json({ token, refreshToken, user: publicUser(user) });
    } catch (e) { next(e); }
  });

router.post('/login',
  body('email').isEmail(),
  body('password').isString(),
  async (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    if (rateLimit(ip, 10, 60000)) return res.status(429).json({ error: 'Demasiados intentos, intenta más tarde', code: 429 });
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
      const refreshToken = await db.createRefreshToken(user.id);
      res.json({ token, refreshToken, user: publicUser(user) });
    } catch (e) { next(e); }
  });

router.post('/appeal',
  body('email').isEmail(),
  body('appeal').isString().isLength({ min: 5 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { email, appeal } = req.body;
      const banned = await db.isEmailBanned(email);
      if (!banned)      return res.status(400).json({ error: 'Cuenta no baneada', code: 400 });
      await db.submitAppeal(email, appeal);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.post('/logout', (req, res, next) => {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.json({ ok: true });
  try {
    const payload = jwt.verify(token, cfg.JWT_SECRET);
    db.revokeAllUserRefreshTokens(payload.sub).catch(e => console.warn('logout: revokeAllUserRefreshTokens error', e.message));
    db.blacklistToken(token, payload.email).catch(e => console.warn('logout: blacklistToken error', e.message));
  } catch {}
  res.json({ ok: true });
});

router.post('/refresh',
  body('refreshToken').isString().withMessage('refreshToken requerido'),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: 'Token inválido', code: 400 });
    try {
      const entry = await db.validateRefreshToken(req.body.refreshToken);
      if (!entry) return res.status(401).json({ error: 'Refresh token inválido o expirado', code: 401 });
      const user = await db.getUserById(entry.user_id);
      if (!user) return res.status(401).json({ error: 'Usuario no encontrado', code: 401 });
      if (await db.isEmailBanned(user.email))
        return res.status(403).json({ error: 'Usuario baneado', code: 403 });
      await db.revokeRefreshToken(req.body.refreshToken);
      const token = signToken(user);
      const refreshToken = await db.createRefreshToken(user.id);
      res.json({ token, refreshToken, user: publicUser(user) });
    } catch (e) { next(e); }
  });

function publicUser(u) {
  return { id: u.id, email: u.email, display_name: u.display_name,
           role: u.role, avatar_url: u.avatar_url };
}

module.exports = router;
