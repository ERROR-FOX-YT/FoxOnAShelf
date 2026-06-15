/**
 * BookShelf™ - Middlewares de autenticación y roles.
 */
const jwt = require('jsonwebtoken');
const cfg = require('../config');
const db  = require('../db');

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    cfg.JWT_SECRET,
    { expiresIn: cfg.JWT_EXPIRES_IN }
  );
}

async function auth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requerido', code: 401 });
  try {
    if (await db.isTokenBlacklisted(token)) {
      return res.status(401).json({ error: 'Sesión revocada', code: 401 });
    }
    const payload = jwt.verify(token, cfg.JWT_SECRET);
    const cutoff = await db.userTokensInvalidatedAfter(payload.email);
    if (cutoff && (payload.iat * 1000) < cutoff) {
      return res.status(401).json({ error: 'Sesión revocada', code: 401 });
    }
    if (await db.isEmailBanned(payload.email)) {
      return res.status(403).json({ error: 'Usuario baneado', code: 403 });
    }
    req.user = payload;
    next();
  } catch (e) {
    if (e.name === 'JsonWebTokenError' || e.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token inválido', code: 401 });
    }
    next(e);
  }
}

async function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next();
  try {
    const payload = jwt.verify(token, cfg.JWT_SECRET);
    if (await db.isTokenBlacklisted(token)) return next();
    const cutoff = await db.userTokensInvalidatedAfter(payload.email);
    if (cutoff && (payload.iat * 1000) < cutoff) return next();
    if (await db.isEmailBanned(payload.email)) return next();
    const user = await db.getUserById(payload.sub);
    if (!user) return next();
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') return next();
    return next(err);
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'No autenticado', code: 401 });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Sólo administradores', code: 403 });
  next();
}

function requireModerator(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'No autenticado', code: 401 });
  if (!['admin','moderator'].includes(req.user.role)) return res.status(403).json({ error: 'Permisos insuficientes', code: 403 });
  next();
}

async function isAuthorOrModerator(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado', code: 401 });
    const book = await db.getBook(req.params.id);
    if (!book) return res.status(404).json({ error: 'Libro no encontrado', code: 404 });
    const owner = book.author_id === req.user.sub;
    const mod   = ['admin','moderator'].includes(req.user.role);
    if (!owner && !mod) return res.status(403).json({ error: 'No tienes permisos sobre este libro', code: 403 });
    if (!owner && req.user.role === 'moderator' && !book.is_free)
      return res.status(403).json({ error: 'Moderadores sólo pueden gestionar libros gratuitos', code: 403 });
    req.book = book;
    next();
  } catch (e) { next(e); }
}

async function isOwnerOrAdmin(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado', code: 401 });
    const book = await db.getBook(req.params.id);
    if (!book) return res.status(404).json({ error: 'Libro no encontrado', code: 404 });
    const owner = book.author_id === req.user.sub;
    if (!owner && req.user.role !== 'admin')
      return res.status(403).json({ error: 'No tienes permisos para esta acción', code: 403 });
    req.book = book;
    next();
  } catch (e) { next(e); }
}

module.exports = { signToken, auth, optionalAuth, requireAdmin, requireModerator,
                   isAuthorOrModerator, isOwnerOrAdmin };
