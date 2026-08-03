const express = require('express');
const path    = require('path');
const { body, param, validationResult } = require('express-validator');
const db    = require('../db');
const { auth, optionalAuth, requireAdmin, isAuthorOrModerator, isOwnerOrAdmin } = require('../middlewares/auth');
const { rateLimit } = require('../middlewares/rate-limit');
const { upload } = require('../middlewares/upload');
const { convertFileToChapters } = require('../services/conversion');
const storageSvc = require('../services/storage');

const router = express.Router();


router.get('/', async (req, res, next) => {
  try {
    const { categoria, grupo_edad, q, autor_id, estado } = req.query;
    const rawLimit = Math.min(100, parseInt(req.query.limit) || 50);
    const rawOffset = parseInt(req.query.offset) || 0;
    const libros = await db.listarLibros({ categoria, grupo_edad, q, autor_id, estado,
                                           limit: rawLimit,
                                           offset: rawOffset });
    res.json({ libros });
  } catch (e) { next(e); }
});

router.get('/:id', optionalAuth,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
    const libro = await db.obtenerLibro(req.params.id);
    if (!libro) return res.status(404).json({ error: 'Libro no encontrado', code: 404 });

    const user_id = req.user ? req.user.sub : null;

    const capitulos = await db.listarCapitulos(req.params.id);

    let favorited = false, calificacion_usuario = 0, marcador = null;
    if (user_id) {
      const fav = await db.obtenerFavorito(user_id, req.params.id);
      favorited = fav.favorited;
      calificacion_usuario = await db.obtenerCalificacionUsuario(user_id, req.params.id);
      marcador = await db.obtenerMarcador(user_id, req.params.id);
    }

    res.json({ libro, capitulos, favorited, calificacion_usuario, marcador });
  } catch (e) { next(e); }
});

router.post('/',
  auth,
  body('titulo').isString().isLength({ min: 1 }),
  body('descripcion').optional().isString(),
  body('categoria').optional().isString(),
  body('grupo_edad').optional().isIn(['infantil','adolescente','adulto']),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const libro = await db.crearLibro({
        titulo: req.body.titulo,
        subtitulo: req.body.subtitulo,
        descripcion: req.body.descripcion,
        categoria: req.body.categoria,
        grupo_edad: req.body.grupo_edad,
        autor_id: req.user.sub,
        estado: 'borrador'
      });
      res.json({ libro });
    } catch (e) { next(e); }
  });

router.put('/:id', auth, isAuthorOrModerator,
  param('id').isString().isLength({ min: 1 }),
  body('titulo').optional().isString(),
  body('descripcion').optional().isString(),
  body('categoria').optional().isString(),
  body('grupo_edad').optional().isIn(['infantil','adolescente','adulto']),
  body('es_gratis').optional().isBoolean({ loose: true }),
  body('precio_centavos').optional().isInt({ min: 0 }),
  body('estado').optional().isIn(['borrador','publicado','eliminado']),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const allowed = ['titulo','subtitulo','descripcion','categoria','grupo_edad',
                      'es_gratis','precio_centavos','url_portada','original_publico','estado'];
      const patch = {};
      for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];

      const libro = await db.actualizarLibro(req.params.id, patch);
      if (!libro) return res.status(404).json({ error: 'Libro no encontrado', code: 404 });
      res.json({ libro });
    } catch (e) { next(e); }
  });

router.delete('/:id', auth, isOwnerOrAdmin,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try { await db.eliminarLibro(req.params.id); res.json({ ok: true }); }
  catch (e) { next(e); }
});

// ---------------- CAPÍTULOS ----------------
router.post('/:id/capitulos', auth, isAuthorOrModerator,
  param('id').isString().isLength({ min: 1 }),
  body('titulo').optional().isString(),
  body('contenido').optional().isString(),
  body('orden').optional().isInt({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const capitulo = await db.crearCapitulo({
        libro_id: req.params.id,
        titulo: req.body.titulo || 'Capítulo',
        contenido: req.body.contenido || '',
        orden: req.body.orden ?? 1
      });
      res.json({ capitulo });
    } catch (e) { next(e); }
  });

router.put('/:id/capitulos/:capituloId', auth, isAuthorOrModerator,
  param('id').isString().isLength({ min: 1 }),
  param('capituloId').isString().isLength({ min: 1 }),
  body('titulo').optional().isString(),
  body('contenido').optional().isString(),
  body('orden').optional().isInt({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const capitulo = await db.obtenerCapitulo(req.params.capituloId);
      if (!capitulo || capitulo.libro_id !== req.params.id) {
        return res.status(404).json({ error: 'Capítulo no encontrado', code: 404 });
      }
      const patch = {};
      if (req.body.titulo !== undefined) patch.titulo = req.body.titulo;
      if (req.body.contenido !== undefined) patch.contenido = req.body.contenido;
      if (req.body.orden !== undefined) patch.orden = req.body.orden;
      await db.actualizarCapitulo(req.params.capituloId, patch);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.delete('/:id/capitulos/:capituloId', auth, isAuthorOrModerator,
  param('id').isString().isLength({ min: 1 }),
  param('capituloId').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const capitulo = await db.obtenerCapitulo(req.params.capituloId);
      if (!capitulo || capitulo.libro_id !== req.params.id) {
        return res.status(404).json({ error: 'Capítulo no encontrado', code: 404 });
      }
      await db.eliminarCapitulo(req.params.capituloId);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

// ---------------- FAVORITOS / CALIFICACIONES / COMENTARIOS ----------------
router.post('/:id/favorito', auth,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const libro = await db.obtenerLibro(req.params.id);
      if (!libro) return res.status(404).json({ error: 'Libro no encontrado', code: 404 });
      if (libro.autor_id === req.user.sub) return res.status(403).json({ error: 'No puedes marcar tu propio libro como favorito', code: 403 });
      const r = await db.alternarFavorito(req.user.sub, req.params.id); res.json(r);
    } catch (e) { next(e); }
});

router.post('/:id/calificar', auth,
  param('id').isString().isLength({ min: 1 }),
  body('puntuacion').isInt({ min: 1, max: 5 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const libro = await db.obtenerLibro(req.params.id);
      if (!libro) return res.status(404).json({ error: 'Libro no encontrado', code: 404 });
      if (libro.autor_id === req.user.sub) return res.status(403).json({ error: 'No puedes calificar tu propio libro', code: 403 });
      await db.calificarLibro(req.user.sub, req.params.id, +req.body.puntuacion); res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.post('/:id/comentario', auth,
  param('id').isString().isLength({ min: 1 }),
  body('contenido').isString().isLength({ min: 1, max: 2000 }),
  body('capitulo_id').optional().isString(),
  body('comentario_padre_id').optional().isString(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const c = await db.agregarComentario({ usuario_id: req.user.sub, libro_id: req.params.id,
                                             capitulo_id: req.body.capitulo_id,
                                             comentario_padre_id: req.body.comentario_padre_id,
                                             contenido: req.body.contenido });
      res.json({ comentario: c });
    } catch (e) { next(e); }
  });

router.delete('/:id/comentarios/:comentarioId', auth,
  param('id').isString().isLength({ min: 1 }),
  param('comentarioId').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const comentario = await db.obtenerComentario(req.params.comentarioId);
      if (!comentario || comentario.libro_id !== req.params.id)
        return res.status(404).json({ error: 'Comentario no encontrado', code: 404 });
      if (comentario.usuario_id !== req.user.sub && req.user.role !== 'moderator' && req.user.role !== 'admin')
        return res.status(403).json({ error: 'No autorizado', code: 403 });
      await db.eliminarComentario(req.params.comentarioId);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.get('/:id/comentarios',
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try { res.json({ comentarios: await db.listarComentarios(req.params.id) }); }
  catch (e) { next(e); }
});

router.post('/:id/vista', optionalAuth,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    if (rateLimit('vista:'+req.params.id+':'+ip, 10, 60000)) return res.json({ ok: true });
    const user_id = req.user ? req.user.sub : null;
    await db.incrementarVistas(req.params.id, user_id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/:id/reiniciar-vistas', auth, requireAdmin,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
    await db.restablecerVistasLibro(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------- CONVERSIÓN DE ARCHIVO A LIBRO ----------------
router.post('/:id/importar-archivo',
  auth, isAuthorOrModerator,
  upload.single('file'),
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      if (!req.file) return res.status(400).json({ error: 'Archivo requerido', code: 400 });
      if (req.file._kind !== 'text')
        return res.status(400).json({ error: 'Sólo archivos de texto: .txt .md .docx .rtf', code: 400 });

      const capitulos = await convertFileToChapters(req.file.buffer, req.file.originalname);
      for (const c of capitulos) {
        await db.crearCapitulo({ libro_id: req.params.id,
                                 titulo: c.titulo, contenido: c.contenido,
                                 orden: c.orden, es_acceso_anticipado: false });
      }
      const ext = path.extname(req.file.originalname).toLowerCase();
      const cloudPath = 'imports/' + req.params.id + '/' + Date.now() + ext;
      const publicUrl = await storageSvc.uploadFile(req.file.buffer, cloudPath, req.file.mimetype);
      const libro = await db.actualizarLibro(req.params.id, {
        archivo_original: publicUrl,
        original_publico: req.body.original_publico === true || req.body.original_publico === 'true'
      });
      res.json({ ok: true, capitulos_creados: capitulos.length, libro });
    } catch (e) { next(e); }
  });

// ---------------- IMÁGENES DEL LIBRO (para editores externos) ----------------
router.get('/:id/imagenes', auth, isAuthorOrModerator,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const libro = req.book;
      const capitulos = await db.listarCapitulos(req.params.id);
      const seen = new Set();
      const IMG_RE = /@img:([a-zA-Z0-9\-_,\.\?!¿¡<>]+)/g;
      for (const ch of capitulos) {
        if (!ch.contenido) continue;
        let m;
        while ((m = IMG_RE.exec(ch.contenido)) !== null) {
          seen.add(m[1]);
        }
      }
      const imagenes = [];
      const autor = await db.obtenerUsuarioPorId(libro.autor_id);
      for (const nombre of seen) {
        const img = await db.obtenerImagenUsuarioPorNombrePersonalizado(libro.autor_id, nombre);
        if (img) {
          imagenes.push({
            nombre_personalizado: img.nombre_personalizado,
            url: '/api/imagenes-usuario/resolver/' + libro.autor_id + '/' + encodeURIComponent(img.nombre_personalizado),
            propietario: {
              id: autor?.id || libro.autor_id,
              nombre_mostrado: autor?.nombre_mostrado || 'Desconocido',
              email: autor?.email || ''
            }
          });
        }
      }
      res.json({ imagenes, autor_id: libro.autor_id });
    } catch (e) { next(e); }
  });

module.exports = router;
