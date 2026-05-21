/**
 * Booked™ - Middlewares de autenticación y roles.
 */
const jwt = require('jsonwebtoken');
const cfg = require('../config');
const db  = require('../db');

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, is_admin_fox: !!user.is_admin_fox },
    cfg.JWT_SECRET,
    { expiresIn: cfg.JWT_EXPIRES_IN }
  );
}

async function auth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    if (await db.isTokenBlacklisted(token)) {
      return res.status(401).json({ error: 'Sesión revocada' });
    }
    const payload = jwt.verify(token, cfg.JWT_SECRET);
    const cutoff = await db.userTokensInvalidatedAfter(payload.email);
    if (cutoff && (payload.iat * 1000) < cutoff) {
      return res.status(401).json({ error: 'Sesión revocada' });
    }
    if (await db.isEmailBanned(payload.email)) {
      return res.status(403).json({ error: 'Usuario baneado' });
    }
    req.user = payload;
    req.token = token;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Permisos insuficientes' });
    next();
  };
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Sólo administradores' });
  next();
}

function isAdminFox(user) { return user && user.role === 'admin' && user.is_admin_fox; }
function isAdminMain(user) { return user && user.role === 'admin' && !user.is_admin_fox; }

async function isAuthorOrModerator(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  const book = await db.getBook(req.params.id);
  if (!book) return res.status(404).json({ error: 'Libro no encontrado' });
  const owner = book.author_id === req.user.sub;
  const mod   = ['admin','moderator'].includes(req.user.role);
  if (!owner && !mod) return res.status(403).json({ error: 'No tienes permisos sobre este libro' });
  // Moderadores no admin sólo sobre libros gratuitos
  if (!owner && req.user.role === 'moderator' && !book.is_free)
    return res.status(403).json({ error: 'Moderadores sólo pueden gestionar libros gratuitos' });
  req.book = book;
  next();
}

module.exports = { signToken, auth, requireRole, requireAdmin,
                   isAuthorOrModerator, isAdminFox, isAdminMain };
