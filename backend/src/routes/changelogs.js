const express = require('express');
const { body, param, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const db = require('../db');
const { auth, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const list = await db.listChangelogs();
    res.json({ changelogs: list });
  } catch (e) { next(e); }
});

router.put('/front',
  auth, requireAdmin,
  async (req, res, next) => {
    try {
      const { versions } = req.body;
      if (!Array.isArray(versions)) {
        return res.status(400).json({ error: 'versions debe ser un array', code: 400 });
      }
      const mdPath = path.join(__dirname, '../../../CHANGELOGfront.md');
      const header = '# CHANGELOG \u2014 BookShelf\u2122\n\nTodas las fechas en formato YYYY-MM-DD.\n';
      const body = versions.map(v => {
        const sections = (v.sections || []).map(s => {
          return '### ' + s.name + '\n' + (s.items || []).join('\n');
        }).join('\n\n');
        return '\n## [' + v.version + '] \u2014 ' + v.date + (v.author ? ' \u2014 ' + v.author : '') + '\n\n' + sections;
      }).join('\n');
      fs.writeFileSync(mdPath, header + body, 'utf8');
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
);

router.get('/front', async (_req, res, next) => {
  try {
    const mdPath = path.join(__dirname, '../../../CHANGELOGfront.md');
    const raw = fs.readFileSync(mdPath, 'utf8');
    const versions = [];
    const versionRx = /^## \[(.+?)\] — (.+)$/gm;
    const sectionRx = /^### (.+)$/gm;
    let match;
    let current = null;
    let currentSection = null;
    const lines = raw.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/\r$/, '');
      const vMatch = line.match(/^## \[(.+?)\] — (\d{4}-\d{2}-\d{2}|\?\?\/\?\?\/\?\?\?\?)(?: — (.+))?$/);
      if (vMatch) {
        if (current) versions.push(current);
        current = { version: vMatch[1], date: vMatch[2], author: vMatch[3] || '', sections: [] };
        currentSection = null;
        continue;
      }
      const sMatch = line.match(/^### (.+)$/);
      if (sMatch && current) {
        currentSection = { name: sMatch[1], items: [] };
        current.sections.push(currentSection);
        continue;
      }
      if (currentSection && line.trim()) {
        currentSection.items.push(line);
      }
    }
    if (current) versions.push(current);
    res.json({ versions });
  } catch (e) { next(e); }
});

router.get('/config', async (_req, res, next) => {
  try {
    const cfg = await db.getChangelogConfig();
    res.json(cfg);
  } catch (e) { next(e); }
});

router.post('/',
  auth, requireAdmin,
  body('version').notEmpty().withMessage('Número de versión requerido'),
  body('title').notEmpty().withMessage('Título requerido'),
  body('entries').notEmpty().withMessage('Entradas requeridas'),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const entry = await db.createChangelog(req.body);
      res.status(201).json(entry);
    } catch (e) { next(e); }
  }
);

router.put('/config',
  auth, requireAdmin,
  body('link_text').notEmpty().withMessage('Texto del link requerido'),
  body('current_version').notEmpty().withMessage('Versión actual requerida'),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      await db.updateChangelogConfig(req.body);
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
);

router.put('/:id',
  auth, requireAdmin,
  body('version').notEmpty().withMessage('Número de versión requerido'),
  body('title').notEmpty().withMessage('Título requerido'),
  body('entries').notEmpty().withMessage('Entradas requeridas'),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      await db.updateChangelog(req.params.id, req.body);
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
);

router.delete('/:id',
  auth, requireAdmin,
  async (req, res, next) => {
    try {
      await db.deleteChangelog(req.params.id);
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
);

module.exports = router;
