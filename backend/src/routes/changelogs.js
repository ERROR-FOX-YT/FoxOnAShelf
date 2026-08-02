const express = require('express');
const { body, param, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { auth, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const list = await db.listarHistoriales();
    res.json({ historiales: list });
  } catch (e) { next(e); }
});

router.put('/frontend',
  auth, requireAdmin,
  async (req, res, next) => {
    try {
      const { versiones } = req.body;
      if (!Array.isArray(versiones)) {
        return res.status(400).json({ error: 'versiones debe ser un array', code: 400 });
      }
      const mdPath = path.join(__dirname, '../../../CHANGELOGfront.md');
      const header = '# CHANGELOG \u2014 FoxOnAShelf\u2122\n\nTodas las fechas en formato YYYY-MM-DD.\n';
      const contenidoMd = versiones.map(v => {
        const secciones = (v.secciones || []).map(s => {
          return '### ' + s.nombre + '\n' + (s.elementos || []).join('\n');
        }).join('\n\n');
        return '\n## [' + v.version + '] \u2014 ' + v.fecha + (v.autor ? ' \u2014 ' + v.autor : '') + '\n\n' + secciones;
      }).join('\n');
      fs.writeFileSync(mdPath, header + contenidoMd, 'utf8');
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
);

router.get('/frontend', async (_req, res, next) => {
  try {
    const mdPath = path.join(__dirname, '../../../CHANGELOGfront.md');
    const raw = fs.readFileSync(mdPath, 'utf8');
    const versiones = [];
    const versionRx = /^## \[(.+?)\] — (.+)$/gm;
    const sectionRx = /^### (.+)$/gm;
    let match;
    let actual = null;
    let seccionActual = null;
    const lines = raw.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/\r$/, '');
      const vMatch = line.match(/^## \[(.+?)\] — (\d{4}-\d{2}-\d{2}|\?\?\/\?\?\/\?\?\?\?)(?: — (.+))?$/);
      if (vMatch) {
        if (actual) versiones.push(actual);
        actual = { version: vMatch[1], fecha: vMatch[2], autor: vMatch[3] || '', secciones: [] };
        seccionActual = null;
        continue;
      }
      const sMatch = line.match(/^### (.+)$/);
      if (sMatch && actual) {
        seccionActual = { nombre: sMatch[1], elementos: [] };
        actual.secciones.push(seccionActual);
        continue;
      }
      if (seccionActual && line.trim()) {
        seccionActual.elementos.push(line);
      }
    }
    if (actual) versiones.push(actual);
    res.json({ versiones });
  } catch (e) { next(e); }
});

router.get('/configuracion', async (_req, res, next) => {
  try {
    const cfg = await db.obtenerConfigHistorial();
    res.json(cfg);
  } catch (e) { next(e); }
});

router.post('/',
  auth, requireAdmin,
  body('version').notEmpty().withMessage('Número de versión requerido'),
  body('titulo').notEmpty().withMessage('Título requerido'),
  body('entradas').notEmpty().withMessage('Entradas requeridas'),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const entry = await db.crearHistorial(req.body);
      res.status(201).json(entry);
    } catch (e) { next(e); }
  }
);

router.put('/configuracion',
  auth, requireAdmin,
  body('texto_enlace').notEmpty().withMessage('Texto del link requerido'),
  body('version_actual').notEmpty().withMessage('Versión actual requerida'),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      await db.actualizarConfigHistorial(req.body);
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
);

router.put('/:id',
  auth, requireAdmin,
  body('version').notEmpty().withMessage('Número de versión requerido'),
  body('titulo').notEmpty().withMessage('Título requerido'),
  body('entradas').notEmpty().withMessage('Entradas requeridas'),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      await db.actualizarHistorial(req.params.id, req.body);
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
);

router.delete('/:id',
  auth, requireAdmin,
  async (req, res, next) => {
    try {
      await db.eliminarHistorial(req.params.id);
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
);

module.exports = router;
