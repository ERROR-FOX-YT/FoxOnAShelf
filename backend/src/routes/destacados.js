const { Router } = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { auth } = require('../middlewares/auth');
const db = require('../db');
const { pgQuery, isPg } = require('../db');

const router = Router();

// Todas las rutas requieren autenticación
router.use(auth);

// =====================================================================
// LISTAR DESTACADOS POR LIBRO (agrupados por capítulo)
// =====================================================================
router.get('/',
  query('libro_id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { libro_id } = req.query;
      const usuario_id = req.user.sub;

      if (isPg) {
        const destacados = await pgQuery(`
          SELECT d.*, c.titulo AS titulo_capitulo, c."orden" AS orden_capitulo
          FROM destacados d
          JOIN capitulos c ON c.id = d.capitulo_id
          WHERE d.usuario_id = $1 AND d.libro_id = $2
          ORDER BY c."orden" ASC, d.posicion_inicio ASC NULLS LAST
        `, [usuario_id, libro_id]);

        const agrupados = {};
        for (const d of destacados) {
          const capId = d.capitulo_id;
          if (!agrupados[capId]) {
            agrupados[capId] = {
              capitulo_id: capId,
              titulo_capitulo: d.titulo_capitulo,
              orden_capitulo: d.orden_capitulo,
              destacados: []
            };
          }
          agrupados[capId].destacados.push(d);
        }
        return res.json({ capitulos: Object.values(agrupados) });
      }

      // JSON fallback
      const todos = (await db.listarDestacados(usuario_id, libro_id)) || [];
      const agrupados = {};
      for (const d of todos) {
        const cap = await db.obtenerCapitulo(d.capitulo_id);
        const capId = d.capitulo_id;
        if (!agrupados[capId]) {
          agrupados[capId] = {
            capitulo_id: capId,
            titulo_capitulo: cap?.titulo || null,
            orden_capitulo: cap?.orden || 0,
            destacados: []
          };
        }
        agrupados[capId].destacados.push(d);
      }
      res.json({ capitulos: Object.values(agrupados) });
    } catch (e) { next(e); }
  });

// =====================================================================
// CREAR DESTACADO
// =====================================================================
router.post('/',
  body('libro_id').isString().isLength({ min: 1 }),
  body('capitulo_id').isString().isLength({ min: 1 }),
  body('texto_seleccionado').isString().isLength({ min: 1, max: 5000 }),
  body('nota').optional().isString().isLength({ max: 2000 }),
  body('color').optional().isString().isLength({ min: 1, max: 20 }),
  body('posicion_inicio').optional().isInt({ min: 0 }),
  body('posicion_fin').optional().isInt({ min: 0 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { libro_id, capitulo_id, texto_seleccionado, nota, color, posicion_inicio, posicion_fin } = req.body;
      const usuario_id = req.user.sub;

      if (isPg) {
        const libroRows = await pgQuery('SELECT id FROM libros WHERE id=$1', [libro_id]);
        if (!libroRows.length) return res.status(404).json({ error: 'Libro no encontrado', code: 404 });

        const capRows = await pgQuery('SELECT id FROM capitulos WHERE id=$1 AND libro_id=$2', [capitulo_id, libro_id]);
        if (!capRows.length) return res.status(404).json({ error: 'Capítulo no encontrado en este libro', code: 404 });

        const id = uuidv4();
        await pgQuery(`
          INSERT INTO destacados (id, usuario_id, libro_id, capitulo_id, texto_seleccionado, nota, color, posicion_inicio, posicion_fin)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          id, usuario_id, libro_id, capitulo_id,
          texto_seleccionado.trim(),
          nota || null,
          color || '#FBBF24',
          posicion_inicio ?? null,
          posicion_fin ?? null
        ]);

        const rows = await pgQuery('SELECT * FROM destacados WHERE id=$1', [id]);
        return res.status(201).json({ ok: true, destacado: rows[0] });
      }

      // JSON fallback
      const libro = await db.obtenerLibro(libro_id);
      if (!libro) return res.status(404).json({ error: 'Libro no encontrado', code: 404 });
      const cap = await db.obtenerCapitulo(capitulo_id);
      if (!cap || cap.libro_id !== libro_id) {
        return res.status(404).json({ error: 'Capítulo no encontrado en este libro', code: 404 });
      }

      const destacado = await db.crearDestacado({
        id: uuidv4(), usuario_id, libro_id, capitulo_id,
        texto_seleccionado: texto_seleccionado.trim(),
        nota: nota || null,
        color: color || '#FBBF24',
        posicion_inicio: posicion_inicio ?? null,
        posicion_fin: posicion_fin ?? null
      });
      res.status(201).json({ ok: true, destacado });
    } catch (e) { next(e); }
  });

// =====================================================================
// ACTUALIZAR DESTACADO (nota / color) — solo el propietario
// =====================================================================
router.put('/:id',
  param('id').isString().isLength({ min: 1 }),
  body('nota').optional().isString().isLength({ max: 2000 }),
  body('color').optional().isString().isLength({ min: 1, max: 20 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { id } = req.params;
      const { nota, color } = req.body;

      if (isPg) {
        const rows = await pgQuery('SELECT * FROM destacados WHERE id=$1', [id]);
        if (!rows.length) return res.status(404).json({ error: 'Destacado no encontrado', code: 404 });
        if (rows[0].usuario_id !== req.user.sub) {
          return res.status(403).json({ error: 'No tienes permisos para editar este destacado', code: 403 });
        }

        const updates = [];
        const params = [];
        if (nota !== undefined) { params.push(nota); updates.push(`nota=$${params.length}`); }
        if (color !== undefined) { params.push(color); updates.push(`color=$${params.length}`); }
        if (updates.length) {
          params.push(new Date().toISOString());
          updates.push(`updated_at=$${params.length}`);
          params.push(id);
          await pgQuery(`UPDATE destacados SET ${updates.join(', ')} WHERE id=$${params.length}`, params);
        }
        const updated = await pgQuery('SELECT * FROM destacados WHERE id=$1', [id]);
        return res.json({ ok: true, destacado: updated[0] });
      }

      // JSON fallback
      await db.actualizarDestacado(id, req.user.sub, { nota, color });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

// =====================================================================
// ELIMINAR DESTACADO — solo el propietario
// =====================================================================
router.delete('/:id',
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { id } = req.params;

      if (isPg) {
        const rows = await pgQuery('SELECT * FROM destacados WHERE id=$1', [id]);
        if (!rows.length) return res.status(404).json({ error: 'Destacado no encontrado', code: 404 });
        if (rows[0].usuario_id !== req.user.sub) {
          return res.status(403).json({ error: 'No tienes permisos para eliminar este destacado', code: 403 });
        }
        await pgQuery('DELETE FROM destacados WHERE id=$1', [id]);
        return res.json({ ok: true });
      }

      // JSON fallback
      await db.eliminarDestacado(id, req.user.sub);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

// =====================================================================
// OBTENER TODOS LOS DESTACADOS DE UN LIBRO (vista resumen/exportación)
// =====================================================================
router.get('/libro/:libroId/todos',
  param('libroId').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const { libroId } = req.params;

      if (isPg) {
        const destacados = await pgQuery(`
          SELECT d.*, c.titulo AS titulo_capitulo, c."orden" AS orden_capitulo
          FROM destacados d
          JOIN capitulos c ON c.id = d.capitulo_id
          WHERE d.usuario_id = $1 AND d.libro_id = $2
          ORDER BY c."orden" ASC, d.posicion_inicio ASC NULLS LAST
        `, [req.user.sub, libroId]);

        const libro = await pgQuery('SELECT id, titulo FROM libros WHERE id=$1', [libroId]);
        return res.json({
          libro: libro[0] || null,
          total_destacados: destacados.length,
          destacados
        });
      }

      // JSON fallback
      const libro = await db.obtenerLibro(libroId);
      const todos = (await db.listarDestacados(req.user.sub, libroId)) || [];
      res.json({
        libro: libro ? { id: libro.id, titulo: libro.titulo } : null,
        total_destacados: todos.length,
        destacados: todos
      });
    } catch (e) { next(e); }
  });

module.exports = router;
