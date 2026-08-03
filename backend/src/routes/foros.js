const { Router } = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { auth, requireAdmin, requireModerator } = require('../middlewares/auth');
const db = require('../db');
const { pgQuery, isPg } = require('../db');

const router = Router();

// =====================================================================
// CATEGORÍAS (solo Soporte)
// =====================================================================

router.get('/', async (req, res, next) => {
  try {
    if (isPg) {
      const [categoria] = await pgQuery('SELECT * FROM foro_categorias ORDER BY orden ASC LIMIT 1');
      return res.json({ categoria: categoria || null });
    }
    res.json({ categoria: null });
  } catch (e) { next(e); }
});

// =====================================================================
// BÚSQUEDA
// =====================================================================

router.get('/buscar',
  query('q').optional().isString().isLength({ max: 200 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const q = (req.query.q || '').trim();
      if (!q) return res.json({ hilos: [] });
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;

      if (isPg) {
        const sq = q.replace(/[%_\\]/g, '\\$&');
        const params = ['%' + sq + '%', limit, offset];
        const hilos = await pgQuery(`
          SELECT h.*, u.nombre_mostrado AS nombre_autor, u.url_avatar AS avatar_autor,
            (SELECT COUNT(*)::int FROM foro_respuestas WHERE hilo_id = h.id) AS total_respuestas,
            h.resuelto
          FROM foro_hilos h
          JOIN usuarios u ON u.id = h.autor_id
          WHERE (h.titulo ILIKE $1 ESCAPE '\\' OR h.contenido ILIKE $1 ESCAPE '\\')
          ORDER BY h.fijado DESC, h.created_at DESC
          LIMIT $2 OFFSET $3
        `, params);
        return res.json({ hilos });
      }
      res.json({ hilos: [] });
    } catch (e) { next(e); }
  });

// =====================================================================
// HHILOS POR ESTADO (pendientes / resueltos)
// =====================================================================

router.get('/estado/:estado',
  param('estado').isIn(['pendientes', 'resueltos']),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { estado } = req.params;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;
      const resuelto = estado === 'resueltos';

      if (isPg) {
        const countResult = await pgQuery(
          'SELECT COUNT(*)::int AS total FROM foro_hilos WHERE resuelto=$1', [resuelto]);
        const total = countResult[0]?.total || 0;

        const hilos = await pgQuery(`
          SELECT h.*, u.nombre_mostrado AS nombre_autor, u.url_avatar AS avatar_autor,
            (SELECT COUNT(*)::int FROM foro_respuestas WHERE hilo_id = h.id) AS total_respuestas,
            CASE WHEN EXISTS (
              SELECT 1 FROM foro_respuestas r2 WHERE r2.hilo_id = h.id AND r2.es_solucion = true
            ) THEN (
              SELECT r2.id FROM foro_respuestas r2 WHERE r2.hilo_id = h.id AND r2.es_solucion = true LIMIT 1
            ) ELSE NULL END AS solucion_id
          FROM foro_hilos h
          LEFT JOIN usuarios u ON u.id = h.autor_id
          WHERE h.resuelto = $1
          ORDER BY h.fijado DESC, h.created_at DESC
          LIMIT $2 OFFSET $3
        `, [resuelto, limit, offset]);

        return res.json({
          hilos,
          paginacion: { pagina: page, limite: limit, total, total_paginas: Math.ceil(total / limit) }
        });
      }
      res.json({ hilos: [], paginacion: { pagina: 1, limite: 20, total: 0, total_paginas: 0 } });
    } catch (e) { next(e); }
  });

// =====================================================================
// ANUNCIOS DEL FORO (mods/admins)
// =====================================================================

router.get('/anuncios', async (req, res, next) => {
  try {
    if (isPg) {
      const anuncios = await pgQuery(`
        SELECT a.id, a.titulo, a.contenido, a.created_at, a.admin_id,
          COALESCE(a.autor_nombre, u.nombre_mostrado, 'Admin') AS autor_nombre,
          u.url_avatar AS autor_avatar
        FROM anuncios a
        LEFT JOIN usuarios u ON u.id = a.admin_id
        WHERE a.visible = true
        ORDER BY a.created_at DESC
        LIMIT 20
      `);
      return res.json({ anuncios });
    }
    res.json({ anuncios: [] });
  } catch (e) { next(e); }
});

// =====================================================================
// HILOS (THREADS)
// =====================================================================

router.get('/:hiloId',
  param('hiloId').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { hiloId } = req.params;

      if (isPg) {
        const rows = await pgQuery(`
          SELECT h.*, u.nombre_mostrado AS nombre_autor, u.url_avatar AS avatar_autor,
            u.role AS autor_rol
          FROM foro_hilos h
          LEFT JOIN usuarios u ON u.id = h.autor_id
          WHERE h.id = $1
        `, [hiloId]);
        if (!rows.length) return res.status(404).json({ error: 'Hilo no encontrado', code: 404 });

        await pgQuery('UPDATE foro_hilos SET vistas = vistas + 1 WHERE id = $1', [hiloId]);

        return res.json({ hilo: { ...rows[0], vistas: rows[0].vistas + 1 } });
      }
      res.status(404).json({ error: 'Hilo no encontrado', code: 404 });
    } catch (e) { next(e); }
  });

router.post('/',
  auth,
  body('titulo').isString().isLength({ min: 1, max: 300 }),
  body('contenido').isString().isLength({ min: 1, max: 50000 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { titulo, contenido } = req.body;

      if (isPg) {
        const cat = await pgQuery('SELECT id FROM foro_categorias ORDER BY orden ASC LIMIT 1');
        if (!cat.length) return res.status(500).json({ error: 'No hay categoría disponible', code: 500 });

        const id = uuidv4();
        const now = new Date().toISOString();
        await pgQuery(
          `INSERT INTO foro_hilos (id, categoria_id, autor_id, titulo, contenido, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, cat[0].id, req.user.sub, titulo.trim(), contenido.trim(), now, now]);
        return res.status(201).json({ ok: true, hilo: { id, titulo: titulo.trim(), created_at: now } });
      }
      res.status(500).json({ error: 'Base de datos no disponible', code: 500 });
    } catch (e) { next(e); }
  });

router.put('/:hiloId',
  auth,
  param('hiloId').isString().isLength({ min: 1 }),
  body('titulo').optional().isString().isLength({ min: 1, max: 300 }),
  body('contenido').optional().isString().isLength({ min: 1, max: 50000 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { hiloId } = req.params;
      const { titulo, contenido } = req.body;

      if (isPg) {
        const rows = await pgQuery('SELECT * FROM foro_hilos WHERE id=$1', [hiloId]);
        if (!rows.length) return res.status(404).json({ error: 'Hilo no encontrado', code: 404 });
        if (rows[0].autor_id !== req.user.sub && req.user.role !== 'admin' && req.user.role !== 'moderator') return res.status(403).json({ error: 'No tienes permisos', code: 403 });

        const updates = [];
        const params = [];
        if (titulo !== undefined) { params.push(titulo.trim()); updates.push(`titulo=$${params.length}`); }
        if (contenido !== undefined) { params.push(contenido.trim()); updates.push(`contenido=$${params.length}`); }
        if (updates.length) {
          params.push(new Date().toISOString());
          updates.push(`updated_at=$${params.length}`);
          params.push(hiloId);
          await pgQuery(`UPDATE foro_hilos SET ${updates.join(', ')} WHERE id=$${params.length}`, params);
        }
        return res.json({ ok: true });
      }
      res.status(500).json({ error: 'Base de datos no disponible', code: 500 });
    } catch (e) { next(e); }
  });

router.delete('/:hiloId',
  auth,
  param('hiloId').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { hiloId } = req.params;

      if (isPg) {
        const rows = await pgQuery('SELECT * FROM foro_hilos WHERE id=$1', [hiloId]);
        if (!rows.length) return res.status(404).json({ error: 'Hilo no encontrado', code: 404 });
        const hilo = rows[0];
        if (hilo.autor_id !== req.user.sub && req.user.role !== 'admin' && req.user.role !== 'moderator') {
          return res.status(403).json({ error: 'No tienes permisos', code: 403 });
        }
        await pgQuery('DELETE FROM foro_votos WHERE respuesta_id IN (SELECT id FROM foro_respuestas WHERE hilo_id=$1)', [hiloId]);
        await pgQuery('DELETE FROM foro_historial_solucion WHERE respuesta_id IN (SELECT id FROM foro_respuestas WHERE hilo_id=$1)', [hiloId]);
        await pgQuery('DELETE FROM foro_respuestas WHERE hilo_id=$1', [hiloId]);
        await pgQuery('DELETE FROM foro_hilos WHERE id=$1', [hiloId]);
        return res.json({ ok: true });
      }
      res.status(500).json({ error: 'Base de datos no disponible', code: 500 });
    } catch (e) { next(e); }
  });

// =====================================================================
// FIJAR / CERRAR (solo mod/admin)
// =====================================================================

router.put('/:hiloId/fijar',
  auth,
  requireModerator,
  param('hiloId').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { hiloId } = req.params;
      if (isPg) {
        const rows = await pgQuery('SELECT fijado FROM foro_hilos WHERE id=$1', [hiloId]);
        if (!rows.length) return res.status(404).json({ error: 'Hilo no encontrado', code: 404 });
        await pgQuery('UPDATE foro_hilos SET fijado = NOT fijado WHERE id=$1', [hiloId]);
        return res.json({ ok: true, fijado: !rows[0].fijado });
      }
      res.status(500).json({ error: 'Base de datos no disponible', code: 500 });
    } catch (e) { next(e); }
  });

router.put('/:hiloId/cerrar',
  auth,
  requireModerator,
  param('hiloId').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { hiloId } = req.params;
      if (isPg) {
        const rows = await pgQuery('SELECT cerrado FROM foro_hilos WHERE id=$1', [hiloId]);
        if (!rows.length) return res.status(404).json({ error: 'Hilo no encontrado', code: 404 });
        await pgQuery('UPDATE foro_hilos SET cerrado = NOT cerrado WHERE id=$1', [hiloId]);
        return res.json({ ok: true, cerrado: !rows[0].cerrado });
      }
      res.status(500).json({ error: 'Base de datos no disponible', code: 500 });
    } catch (e) { next(e); }
  });

// =====================================================================
// RESPUESTAS
// =====================================================================

router.get('/:hiloId/respuestas',
  param('hiloId').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { hiloId } = req.params;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 50));
      const offset = (page - 1) * limit;

      if (isPg) {
        const countResult = await pgQuery(
          'SELECT COUNT(*)::int AS total FROM foro_respuestas WHERE hilo_id=$1', [hiloId]);
        const total = countResult[0]?.total || 0;

        const respuestas = await pgQuery(`
          SELECT r.*, u.nombre_mostrado AS nombre_autor, u.url_avatar AS avatar_autor,
            u.role AS autor_rol,
            COALESCE(vu.votos_utiles, 0)::int AS votos_utiles,
            COALESCE(vn.votos_no_utiles, 0)::int AS votos_no_utiles
          FROM foro_respuestas r
          LEFT JOIN usuarios u ON u.id = r.autor_id
          LEFT JOIN (
            SELECT respuesta_id, COUNT(*)::int AS votos_utiles
            FROM foro_votos WHERE tipo = 'util' GROUP BY respuesta_id
          ) vu ON vu.respuesta_id = r.id
          LEFT JOIN (
            SELECT respuesta_id, COUNT(*)::int AS votos_no_utiles
            FROM foro_votos WHERE tipo = 'no_util' GROUP BY respuesta_id
          ) vn ON vn.respuesta_id = r.id
          WHERE r.hilo_id = $1
          ORDER BY r.es_solucion DESC, r.created_at ASC
          LIMIT $2 OFFSET $3
        `, [hiloId, limit, offset]);

        return res.json({
          respuestas,
          paginacion: { pagina: page, limite: limit, total, total_paginas: Math.ceil(total / limit) }
        });
      }
      res.json({ respuestas: [], paginacion: { pagina: 1, limite: 50, total: 0, total_paginas: 0 } });
    } catch (e) { next(e); }
  });

router.post('/:hiloId/respuestas',
  auth,
  param('hiloId').isString().isLength({ min: 1 }),
  body('contenido').isString().isLength({ min: 1, max: 20000 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { hiloId } = req.params;
      const { contenido } = req.body;

      if (isPg) {
        const rows = await pgQuery('SELECT cerrado FROM foro_hilos WHERE id=$1', [hiloId]);
        if (!rows.length) return res.status(404).json({ error: 'Hilo no encontrado', code: 404 });
        if (rows[0].cerrado) return res.status(403).json({ error: 'Este hilo está cerrado', code: 403 });

        const id = uuidv4();
        const now = new Date().toISOString();
        await pgQuery(
          `INSERT INTO foro_respuestas (id, hilo_id, autor_id, contenido, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, hiloId, req.user.sub, contenido.trim(), now, now]);
        return res.status(201).json({ ok: true, respuesta: { id, hilo_id: hiloId, contenido: contenido.trim(), created_at: now } });
      }
      res.status(500).json({ error: 'Base de datos no disponible', code: 500 });
    } catch (e) { next(e); }
  });

router.put('/respuestas/:respuestaId',
  auth,
  param('respuestaId').isString().isLength({ min: 1 }),
  body('contenido').isString().isLength({ min: 1, max: 20000 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { respuestaId } = req.params;
      const { contenido } = req.body;

      if (isPg) {
        const rows = await pgQuery('SELECT * FROM foro_respuestas WHERE id=$1', [respuestaId]);
        if (!rows.length) return res.status(404).json({ error: 'Respuesta no encontrada', code: 404 });
        const resp = rows[0];
        if (resp.autor_id !== req.user.sub && req.user.role !== 'admin' && req.user.role !== 'moderator') {
          return res.status(403).json({ error: 'No tienes permisos', code: 403 });
        }

        await pgQuery(
          'UPDATE foro_respuestas SET contenido=$1, editado=true, updated_at=$2 WHERE id=$3',
          [contenido.trim(), new Date().toISOString(), respuestaId]);
        return res.json({ ok: true });
      }
      res.status(500).json({ error: 'Base de datos no disponible', code: 500 });
    } catch (e) { next(e); }
  });

router.delete('/respuestas/:respuestaId',
  auth,
  param('respuestaId').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { respuestaId } = req.params;

      if (isPg) {
        const rows = await pgQuery('SELECT * FROM foro_respuestas WHERE id=$1', [respuestaId]);
        if (!rows.length) return res.status(404).json({ error: 'Respuesta no encontrada', code: 404 });
        const resp = rows[0];
        const isModOrAdmin = req.user.role === 'admin' || req.user.role === 'moderator';
        if (resp.autor_id !== req.user.sub && !isModOrAdmin) {
          return res.status(403).json({ error: 'No tienes permisos', code: 403 });
        }

        if (resp.es_solucion) {
          await pgQuery('UPDATE foro_hilos SET resuelto = false WHERE id = $1', [resp.hilo_id]);
        }
        await pgQuery('DELETE FROM foro_votos WHERE respuesta_id=$1', [respuestaId]);
        await pgQuery('DELETE FROM foro_historial_solucion WHERE respuesta_id=$1', [respuestaId]);
        await pgQuery('DELETE FROM foro_respuestas WHERE id=$1', [respuestaId]);
        return res.json({ ok: true });
      }
      res.status(500).json({ error: 'Base de datos no disponible', code: 500 });
    } catch (e) { next(e); }
  });

// =====================================================================
// SOLUCIÓN
// =====================================================================

router.post('/:hiloId/solucion',
  auth,
  param('hiloId').isString().isLength({ min: 1 }),
  body('respuesta_id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { hiloId } = req.params;
      const { respuesta_id } = req.body;

      if (isPg) {
        const hiloRows = await pgQuery('SELECT id, resuelto FROM foro_hilos WHERE id=$1', [hiloId]);
        if (!hiloRows.length) return res.status(404).json({ error: 'Hilo no encontrado', code: 404 });

        const respRows = await pgQuery('SELECT id, es_solucion FROM foro_respuestas WHERE id=$1 AND hilo_id=$2', [respuesta_id, hiloId]);
        if (!respRows.length) return res.status(404).json({ error: 'Respuesta no encontrada', code: 404 });

        if (respRows[0].es_solucion) {
          await pgQuery('UPDATE foro_respuestas SET es_solucion = false WHERE id=$1', [respuesta_id]);
          await pgQuery('UPDATE foro_hilos SET resuelto = false WHERE id=$1', [hiloId]);
          return res.json({ ok: true, es_solucion: false, resuelto: false });
        }

        await pgQuery('UPDATE foro_respuestas SET es_solucion = false WHERE hilo_id=$1 AND es_solucion = true', [hiloId]);
        await pgQuery('UPDATE foro_respuestas SET es_solucion = true WHERE id=$1', [respuesta_id]);
        await pgQuery('UPDATE foro_hilos SET resuelto = true WHERE id=$1', [hiloId]);
        return res.json({ ok: true, es_solucion: true, resuelto: true });
      }
      res.status(500).json({ error: 'Base de datos no disponible', code: 500 });
    } catch (e) { next(e); }
  });

router.put('/respuestas/:respuestaId/solucion',
  auth,
  param('respuestaId').isString().isLength({ min: 1 }),
  body('contenido').isString().isLength({ min: 1, max: 20000 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { respuestaId } = req.params;
      const { contenido } = req.body;

      if (isPg) {
        const rows = await pgQuery('SELECT * FROM foro_respuestas WHERE id=$1', [respuestaId]);
        if (!rows.length) return res.status(404).json({ error: 'Respuesta no encontrada', code: 404 });
        const resp = rows[0];
        if (!resp.es_solucion) return res.status(400).json({ error: 'Esta respuesta no es la solución', code: 400 });
        if (resp.autor_id !== req.user.sub && req.user.role !== 'admin' && req.user.role !== 'moderator')
          return res.status(403).json({ error: 'No tienes permisos para editar esta solución', code: 403 });

        const contenidoAnterior = resp.contenido;
        const now = new Date().toISOString();

        await pgQuery(
          'UPDATE foro_respuestas SET contenido=$1, editado=true, updated_at=$2 WHERE id=$3',
          [contenido.trim(), now, respuestaId]);

        await pgQuery(
          `INSERT INTO foro_historial_solucion (id, respuesta_id, usuario_id, contenido_anterior, contenido_nuevo, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [uuidv4(), respuestaId, req.user.sub, contenidoAnterior, contenido.trim(), now]);

        await pgQuery('DELETE FROM foro_votos WHERE respuesta_id=$1', [respuestaId]);

        return res.json({ ok: true, votos_reiniciados: true });
      }
      res.status(500).json({ error: 'Base de datos no disponible', code: 500 });
    } catch (e) { next(e); }
  });

router.get('/respuestas/:respuestaId/historial',
  param('respuestaId').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { respuestaId } = req.params;

      if (isPg) {
        const historial = await pgQuery(`
          SELECT h.*, u.nombre_mostrado AS usuario_nombre, u.url_avatar AS usuario_avatar
          FROM foro_historial_solucion h
          LEFT JOIN usuarios u ON u.id = h.usuario_id
          WHERE h.respuesta_id = $1
          ORDER BY h.created_at DESC
        `, [respuestaId]);
        return res.json({ historial });
      }
      res.json({ historial: [] });
    } catch (e) { next(e); }
  });

// =====================================================================
// VOTOS
// =====================================================================

router.post('/respuestas/:respuestaId/votos',
  auth,
  param('respuestaId').isString().isLength({ min: 1 }),
  body('tipo').isIn(['util', 'no_util']),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { respuestaId } = req.params;
      const { tipo } = req.body;

      if (isPg) {
        const respRows = await pgQuery('SELECT id, es_solucion, hilo_id FROM foro_respuestas WHERE id=$1', [respuestaId]);
        if (!respRows.length) return res.status(404).json({ error: 'Respuesta no encontrada', code: 404 });

        const existing = await pgQuery(
          'SELECT id, tipo FROM foro_votos WHERE respuesta_id=$1 AND usuario_id=$2',
          [respuestaId, req.user.sub]);

        if (existing.length) {
          if (existing[0].tipo === tipo) {
            await pgQuery('DELETE FROM foro_votos WHERE id=$1', [existing[0].id]);
          } else {
            await pgQuery('UPDATE foro_votos SET tipo=$1 WHERE id=$2', [tipo, existing[0].id]);
          }
        } else {
          await pgQuery(
            `INSERT INTO foro_votos (id, respuesta_id, usuario_id, tipo, created_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [uuidv4(), respuestaId, req.user.sub, tipo, new Date().toISOString()]);
        }

        if (respRows[0].es_solucion) {
          const [{ total }, { no_util }] = await Promise.all([
            pgQuery('SELECT COUNT(*)::int AS total FROM foro_votos WHERE respuesta_id=$1', [respuestaId]),
            pgQuery("SELECT COUNT(*)::int AS no_util FROM foro_votos WHERE respuesta_id=$1 AND tipo='no_util'", [respuestaId])
          ]);
          if (total >= 10 && (no_util / total) >= 0.80) {
            await pgQuery('UPDATE foro_respuestas SET es_solucion = false WHERE id=$1', [respuestaId]);
            await pgQuery('UPDATE foro_hilos SET resuelto = false WHERE id=$1', [respRows[0].hilo_id]);
            return res.json({ ok: true, auto_desmarcado: true });
          }
        }

        return res.json({ ok: true });
      }
      res.status(500).json({ error: 'Base de datos no disponible', code: 500 });
    } catch (e) { next(e); }
  });

module.exports = router;
