/**
 * FoxOnAShelf™ - Middlewares de autenticación y roles.
 */
const jwt = require('jsonwebtoken');
const cfg = require('../config');
const db  = require('../db');

const DOMINIO_FOX = '@foxonashelf.app';

function esCuentaFox(email) {
  return typeof email === 'string' && email.toLowerCase().endsWith(DOMINIO_FOX);
}

function normalizarIp(ip) {
  if (!ip) return '';
  return String(ip).trim().toLowerCase().replace(/^::ffff:/, '').replace(/^\[|\]$/g, '');
}

function esPrivada(ip) {
  const n = normalizarIp(ip);
  if (!n) return false;
  if (n === '::1' || n.startsWith('127.')) return true;
  if (n.startsWith('10.') || n.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(n)) return true;
  if (n.startsWith('169.254.') || n.startsWith('fe80:')) return true;
  return false;
}

function obtenerIpCliente(req) {
  const xff = req.headers['x-forwarded-for'];
  const candidatos = [];
  if (xff) candidatos.push(...xff.split(',').map(s => s.trim()));
  if (req.socket && req.socket.remoteAddress) candidatos.push(req.socket.remoteAddress);
  const norm = candidatos.map(normalizarIp).filter(Boolean);
  if (norm.length === 0) return '';
  for (let i = norm.length - 1; i >= 0; i--) {
    if (!esPrivada(norm[i])) return norm[i];
  }
  return norm[norm.length - 1];
}

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
    if (await db.tokenEstaEnListaNegra(token)) {
      return res.status(401).json({ error: 'Sesión revocada', code: 401 });
    }
    const payload = jwt.verify(token, cfg.JWT_SECRET);
    const cutoff = await db.tokensUsuarioInvalidadosDespuesDe(payload.email);
    if (cutoff && (payload.iat * 1000) < cutoff) {
      return res.status(401).json({ error: 'Sesión revocada', code: 401 });
    }
    if (await db.emailEstaBaneado(payload.email)) {
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
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, cfg.JWT_SECRET);
    if (await db.tokenEstaEnListaNegra(token)) return next();
    const cutoff = await db.tokensUsuarioInvalidadosDespuesDe(payload.email);
    if (cutoff && (payload.iat * 1000) < cutoff) return next();
    if (await db.emailEstaBaneado(payload.email)) return next();
    const user = await db.obtenerUsuarioPorId(payload.sub);
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
    const book = await db.obtenerLibro(req.params.id);
    if (!book) return res.status(404).json({ error: 'Libro no encontrado', code: 404 });
    const owner = book.autor_id === req.user.sub;
    const mod   = ['admin','moderator'].includes(req.user.role);
    if (!owner && !mod) return res.status(403).json({ error: 'No tienes permisos sobre este libro', code: 403 });
    if (!owner && req.user.role === 'moderator' && !book.es_gratis)
      return res.status(403).json({ error: 'Moderadores sólo pueden gestionar libros gratuitos', code: 403 });
    req.book = book;
    next();
  } catch (e) { next(e); }
}

async function isOwnerOrAdmin(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autenticado', code: 401 });
    const book = await db.obtenerLibro(req.params.id);
    if (!book) return res.status(404).json({ error: 'Libro no encontrado', code: 404 });
    const owner = book.autor_id === req.user.sub;
    if (!owner && req.user.role !== 'admin')
      return res.status(403).json({ error: 'No tienes permisos para esta acción', code: 403 });
    req.book = book;
    next();
  } catch (e) { next(e); }
}

module.exports = { signToken, auth, optionalAuth, requireAdmin, requireModerator,
                   isAuthorOrModerator, isOwnerOrAdmin,
                   esCuentaFox, obtenerIpCliente };
