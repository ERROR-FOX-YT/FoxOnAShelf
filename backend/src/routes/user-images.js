const express = require('express');
const path    = require('path');
const { param, body, query, validationResult } = require('express-validator');
const db      = require('../db');
const cfg     = require('../config');
const { auth } = require('../middlewares/auth');
const { requireAdmin, requireModerator } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');
const { rateLimit } = require('../middlewares/rate-limit');
const storageSvc = require('../services/storage');

const router = express.Router();

const REGEX_NOMBRE = /^[a-zA-Z0-9\-_,\.\?!¿¡<>]+$/;

function validarNombre(nombre) {
  return nombre && nombre.length >= 1 && nombre.length <= 60 && REGEX_NOMBRE.test(nombre);
}

function imagenUrl(img) {
  if (!img || !img.ruta_almacenamiento) return '';
  if (img.ruta_almacenamiento.startsWith('http')) return img.ruta_almacenamiento;
  return '/storage/' + path.basename(img.ruta_almacenamiento);
}

// GET / — listar imágenes del usuario con info de uso
router.get('/', auth, async (req, res, next) => {
  try {
    const imagenes = await db.listarImagenesUsuario(req.user.sub);
    const librosUsuario = await db.listarLibros({ autor_id: req.user.sub, estado: 'all', limit: 1000 });
    const todoContenido = [];
    for (const b of librosUsuario) {
      const capitulos = await db.listarCapitulos(b.id);
      for (const c of capitulos) {
        if (c.contenido) todoContenido.push({ libro_id: b.id, titulo_libro: b.titulo, contenido: c.contenido });
      }
    }
    const result = imagenes.map(img => {
      const usosEn = [];
      for (const item of todoContenido) {
        const re = new RegExp('@img:' + escaparRegex(img.nombre_personalizado) + '(?![a-zA-Z0-9\-_,\.\?!¿¡<>])');
        if (re.test(item.contenido)) {
          usosEn.push({ libro_id: item.libro_id, titulo_libro: item.titulo_libro });
        }
      }
      return {
        id: img.id,
        ruta_almacenamiento: img.ruta_almacenamiento,
        nombre_personalizado: img.nombre_personalizado,
        url: imagenUrl(img),
        orden_ordenamiento: img.orden_ordenamiento,
        created_at: img.created_at,
        en_uso: usosEn.length > 0,
        usado_en: usosEn,
        moderada: img.moderada || false
      };
    });
    res.json({ imagenes: result });
  } catch (e) { next(e); }
});

function escaparRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// POST / — subir imagen con nombre personalizado
router.post('/', auth, upload.single('file'), async (req, res, next) => {
  if (rateLimit('subida:'+req.user.sub, 20, 60000)) return res.status(429).json({ error: 'Demasiadas subidas, intenta más tarde', code: 429 });
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido', code: 400 });
    if (req.file._kind !== 'image')
      return res.status(400).json({ error: 'Sólo imágenes: .jpg .jpeg .png .webp', code: 400 });
    const nombrePersonalizado = (req.body.nombre_personalizado || '').trim();
    if (!validarNombre(nombrePersonalizado))
      return res.status(400).json({ error: 'Nombre inválido. Usa letras, números y -_,.!?¿¡<> (máx 60 caracteres)', code: 400 });
    const available = await db.verificarDisponibilidadNombreImagenUsuario(req.user.sub, nombrePersonalizado);
    if (!available)
      return res.status(409).json({ error: 'Ya existe una imagen con ese nombre', code: 409, nombre_en_uso: true });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const all = await db.listarImagenesUsuario(req.user.sub);
    const siguienteNumero = all.length + 1;
    const siguienteOrden = all.reduce((max, img) => Math.max(max, img.orden_ordenamiento || 0), 0) + 1;
    const cloudPath = 'imagenes-usuario/' + req.user.sub + '/' + req.user.sub + '-' + Date.now() + '-' + siguienteNumero + ext;
    const publicUrl = await storageSvc.uploadFile(req.file.buffer, cloudPath, req.file.mimetype);
    const img = await db.crearImagenUsuario({
      usuario_id: req.user.sub,
      ruta_almacenamiento: publicUrl,
      nombre_personalizado: nombrePersonalizado,
      orden_ordenamiento: siguienteOrden
    });
    res.json({
      image: {
        ...img,
        url: publicUrl,
        en_uso: false,
        usado_en: []
      }
    });
  } catch (e) { next(e); }
});

// PUT /:id — renombrar o reordenar
router.put('/:id', auth,
  param('id').isString().isLength({ min: 1 }),
  body('nombre_personalizado').optional().isString(),
  body('orden_ordenamiento').optional().isInt(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const img = await db.obtenerImagenUsuario(req.params.id);
      if (!img || img.usuario_id !== req.user.sub)
        return res.status(404).json({ error: 'Imagen no encontrada', code: 404 });
      if (img.moderada)
        return res.status(403).json({ error: 'Imagen en revisión, no se puede modificar', code: 403 });
      const patch = {};
      if (req.body.nombre_personalizado !== undefined) {
        const nombre = (req.body.nombre_personalizado || '').trim();
        if (!validarNombre(nombre))
          return res.status(400).json({ error: 'Nombre inválido', code: 400 });
        const available = await db.verificarDisponibilidadNombreImagenUsuario(req.user.sub, nombre, req.params.id);
        if (!available)
          return res.status(409).json({ error: 'Ya existe una imagen con ese nombre', code: 409 });
        patch.nombre_personalizado = nombre;
      }
      if (req.body.orden_ordenamiento !== undefined) patch.orden_ordenamiento = req.body.orden_ordenamiento;
      await db.actualizarImagenUsuario(req.params.id, patch);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

// DELETE /:id
router.delete('/:id', auth,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const img = await db.obtenerImagenUsuario(req.params.id);
      if (!img || img.usuario_id !== req.user.sub)
        return res.status(404).json({ error: 'Imagen no encontrada', code: 404 });
      if (img.moderada)
        return res.status(403).json({ error: 'Imagen en revisión, no se puede eliminar', code: 403 });
      if (cfg.SUPABASE_URL && img.ruta_almacenamiento?.startsWith(cfg.SUPABASE_URL)) {
        const parts = img.ruta_almacenamiento.split('/bookshelf/');
        if (parts[1]) await storageSvc.deleteFile(decodeURIComponent(parts[1])).catch(() => {});
      } else if (img.ruta_almacenamiento) {
        const fs = require('fs');
        const filePath = path.resolve(img.ruta_almacenamiento);
        if (filePath.startsWith(path.resolve(cfg.STORAGE_PATH)) && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      await db.eliminarImagenUsuario(req.params.id);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

// GET /resolver/:autorId/:nombre — resolver nombre de imagen a archivo para el lector
router.get('/resolver/:autorId/:nombre',
  param('autorId').isString().isLength({ min: 1 }),
  param('nombre').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const img = await db.obtenerImagenUsuarioPorNombrePersonalizado(req.params.autorId, req.params.nombre);
      if (!img) return res.status(404).json({ error: 'Imagen no encontrada', code: 404 });
      if (img.moderada) return res.status(403).json({ error: 'Imagen no disponible', code: 403 });
      const url = imagenUrl(img);
      if (url.startsWith('http')) return res.redirect(url);
      const fs = require('fs');
      const filePath = path.resolve(img.ruta_almacenamiento);
      if (!filePath.startsWith(path.resolve(cfg.STORAGE_PATH)) || !fs.existsSync(filePath))
        return res.status(404).json({ error: 'Archivo no encontrado', code: 404 });
      res.sendFile(filePath);
    } catch (e) { next(e); }
  });

// =====================================================================
// MODERACIÓN DE IMÁGENES (mods/admins)
// =====================================================================

// GET /moderacion — listar todas las imágenes con info de usuario
router.get('/moderacion', auth, requireModerator,
  async (req, res, next) => {
    try {
      const busqueda = (req.query.q || '').trim() || null;
      const pagina = Math.max(1, parseInt(req.query.pagina) || 1);
      const result = await db.listarTodasImagenes({ busqueda, pagina, limite: 40 });
      res.json({
        imagenes: result.imagenes.map(img => ({
          id: img.id,
          ruta_almacenamiento: img.ruta_almacenamiento,
          nombre_personalizado: img.nombre_personalizado,
          url: imagenUrl(img),
          created_at: img.created_at,
          moderada: img.moderada,
          moderada_en: img.moderada_en,
          usuario_id: img.usuario_id,
          nombre_usuario: img.nombre_usuario,
          email_usuario: img.email_usuario,
          avatar_usuario: img.avatar_usuario
        })),
        total: result.total,
        paginas: result.paginas,
        pagina: pagina
      });
    } catch (e) { next(e); }
  });

// PUT /:id/moderar — marcar imagen como moderada
router.put('/:id/moderar', auth, requireModerator,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const img = await db.obtenerImagenUsuario(req.params.id);
      if (!img) return res.status(404).json({ error: 'Imagen no encontrada', code: 404 });
      await db.moderarImagen(req.params.id, req.user.sub);
      res.json({ ok: true, moderada: true });
    } catch (e) { next(e); }
  });

// PUT /:id/desmoderar — quitar moderación de imagen
router.put('/:id/desmoderar', auth, requireModerator,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const img = await db.obtenerImagenUsuario(req.params.id);
      if (!img) return res.status(404).json({ error: 'Imagen no encontrada', code: 404 });
      await db.desmoderarImagen(req.params.id);
      res.json({ ok: true, moderada: false });
    } catch (e) { next(e); }
  });

// =====================================================================

module.exports = router;
