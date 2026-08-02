const express = require('express');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const cfg     = require('../config');
const db      = require('../db');
const { signToken, esCuentaFox, obtenerIpCliente } = require('../middlewares/auth');
const { rateLimit } = require('../middlewares/rate-limit');

const router = express.Router();

router.post('/registro',
  body('email').isEmail().withMessage('Correo inválido'),
  body('password').isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
  body('nombre_mostrado').optional().isString(),
  async (req, res, next) => {
    const ip = obtenerIpCliente(req);
    if (rateLimit(ip, 5, 60000)) return res.status(429).json({ error: 'Demasiados registros, intenta más tarde', code: 429 });
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { email, password, nombre_mostrado } = req.body;
      if (esCuentaFox(email))
        return res.status(403).json({ error: 'No puedes registrarte con una cuenta @foxonashelf.app. Estas cuentas son creadas por el equipo de FoxOnAShelf.', code: 403 });
      const egg = await db.obtenerHuevoPascua('register_username');
      const mensajeHuevo = (egg && egg.mensaje) || 'Nu uh, eso es mío!';
      const emojiHuevo = (egg && egg.emoji) || '🦊';
      const nombresHuevo = (egg && egg.nombres) || ['ERROR_FOX'];
      const normalizar = s => s.toLowerCase()
        .replace(/[\s_-]+/g, '')
        .replace(/0/g, 'o')
        .replace(/1/g, 'i')
        .replace(/3/g, 'e')
        .replace(/4/g, 'a')
        .replace(/5/g, 's')
        .replace(/7/g, 't');
      const comprobarExclusivo = nombre => {
        const norm = normalizar(nombre);
        return nombresHuevo.some(n => normalizar(n) === norm);
      };
      if (nombre_mostrado && comprobarExclusivo(nombre_mostrado)) {
        return res.status(418).json({ error: 'ERROR 418: "' + mensajeHuevo + '"', code: 418, huevo_pascua: true, emoji: emojiHuevo });
      }
      if (await db.emailEstaBaneado(email))
        return res.status(403).json({ error: 'Este correo está baneado', code: 403 });
      const existing = await db.obtenerUsuarioPorEmail(email);
      if (existing) return res.status(400).json({ error: 'El correo ya está registrado', code: 400 });
      const nombreFinal = (nombre_mostrado || email.split('@')[0]).toLowerCase().replace(/\s+/g, ' ');
      if (comprobarExclusivo(nombreFinal))
        return res.status(418).json({ error: 'ERROR 418: "' + mensajeHuevo + '"', code: 418, huevo_pascua: true, emoji: emojiHuevo });
      const hash = await bcrypt.hash(password, 10);
      const user = await db.crearUsuario({ email, hash_contrasena: hash,
                                         nombre_mostrado: nombre_mostrado || email.split('@')[0],
                                         role: 'user' });
      const token = signToken(user);
      const refreshToken = await db.crearTokenRefresco(user.id);
      res.json({ token, refreshToken, user: publicUser(user) });
    } catch (e) { next(e); }
  });

router.post('/iniciar-sesion',
  body('email').isEmail(),
  body('password').isString(),
  async (req, res, next) => {
    const ip = obtenerIpCliente(req);
    if (rateLimit(ip, 10, 60000)) return res.status(429).json({ error: 'Demasiados intentos, intenta más tarde', code: 429 });
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: 'Datos inválidos', code: 400 });
    try {
      const { email, password } = req.body;
      const baneado = await db.emailEstaBaneado(email);
      if (baneado) {
        return res.status(403).json({
          error: 'Cuenta baneada',
          code: 403,
          baneado: true,
          puede_apelar: !baneado.apelacion_enviada,
          razon: baneado.razon
        });
      }
      const user = await db.obtenerUsuarioPorEmail(email);
      if (!user) return res.status(401).json({ error: 'Credenciales inválidas', code: 401 });
      const ok = await bcrypt.compare(password, user.hash_contrasena || '');
      if (!ok) return res.status(401).json({ error: 'Credenciales inválidas', code: 401 });
      const token = signToken(user);
      const refreshToken = await db.crearTokenRefresco(user.id);
      res.json({ token, refreshToken, user: publicUser(user) });
    } catch (e) { next(e); }
  });

router.post('/apelar',
  body('email').isEmail(),
  body('apelacion').isString().isLength({ min: 5 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { email, apelacion } = req.body;
      const baneado = await db.emailEstaBaneado(email);
      if (!baneado)      return res.status(400).json({ error: 'Cuenta no baneada', code: 400 });
      await db.enviarApelacion(email, apelacion);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.post('/salir', (req, res, next) => {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.json({ ok: true });
  try {
    const payload = jwt.verify(token, cfg.JWT_SECRET);
    db.revocarTokensRefrescoUsuario(payload.sub).catch(e => console.warn('logout: revocarTokensRefrescoUsuario error', e.message));
    db.agregarTokenListaNegra(token, payload.email).catch(e => console.warn('logout: agregarTokenListaNegra error', e.message));
  } catch {}
  res.json({ ok: true });
});

router.post('/refrescar',
  body('refreshToken').isString().withMessage('refreshToken requerido'),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: 'Token inválido', code: 400 });
    try {
      const entry = await db.validarTokenRefresco(req.body.refreshToken);
      if (!entry) return res.status(401).json({ error: 'Refresh token inválido o expirado', code: 401 });
      const user = await db.obtenerUsuarioPorId(entry.usuario_id);
      if (!user) return res.status(401).json({ error: 'Usuario no encontrado', code: 401 });
      if (await db.emailEstaBaneado(user.email))
        return res.status(403).json({ error: 'Usuario baneado', code: 403 });
      await db.revocarTokenRefresco(req.body.refreshToken);
      const token = signToken(user);
      const refreshToken = await db.crearTokenRefresco(user.id);
      res.json({ token, refreshToken, user: publicUser(user) });
    } catch (e) { next(e); }
  });

function publicUser(u) {
  return { id: u.id, email: u.email, nombre_mostrado: u.nombre_mostrado,
           role: u.role, url_avatar: u.url_avatar };
}

module.exports = router;
