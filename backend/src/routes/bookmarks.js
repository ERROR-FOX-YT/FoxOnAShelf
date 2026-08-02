const express = require('express');
const db    = require('../db');
const { auth } = require('../middlewares/auth');

const router = express.Router();

// Todas requieren autenticación
router.use(auth);

router.get('/', async (req, res, next) => {
  try { res.json({ marcadores: await db.listarMarcadores(req.user.sub) }); }
  catch (e) { next(e); }
});

router.get('/:libroId', async (req, res, next) => {
  try {
    const bk = await db.obtenerMarcador(req.user.sub, req.params.libroId);
    res.json({ marcador: bk });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { libro_id, capitulo_id, indice_capitulo, posicion_desplazamiento, terminado } = req.body;
    if (!libro_id) return res.status(400).json({ error: 'libro_id requerido', code: 400 });
    await db.upsertarMarcador({
      usuario_id: req.user.sub, libro_id,
      capitulo_id: capitulo_id || null,
      indice_capitulo: indice_capitulo || 0,
      posicion_desplazamiento: posicion_desplazamiento || 0,
      terminado: !!terminado
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.put('/:libroId/terminar', async (req, res, next) => {
  try {
    const { terminado } = req.body;
    await db.marcarTerminado(req.user.sub, req.params.libroId, terminado !== false);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:libroId', async (req, res, next) => {
  try {
    await db.eliminarMarcador(req.user.sub, req.params.libroId);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
