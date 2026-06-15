const { param, validationResult } = require('express-validator');
const express = require('express');
const path    = require('path');
const fs      = require('fs');
const cfg     = require('../config');
const { auth } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');

const router = express.Router();

router.post('/', auth, upload.single('file'), (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo requerido', code: 400 });
  res.json({
    file: {
      filename: req.file.filename,
      kind: req.file._kind,
      size: req.file.size,
      url: '/storage/' + req.file.filename
    }
  });
});

router.delete('/:fileName', auth,
  param('fileName').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: 'Nombre inválido', code: 400 });
    try {
      const filePath = path.resolve(cfg.STORAGE_PATH, req.params.fileName);
      if (!filePath.startsWith(path.resolve(cfg.STORAGE_PATH)))
        return res.status(403).json({ error: 'Acceso denegado', code: 403 });
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'No encontrado', code: 404 });
      fs.unlinkSync(filePath);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.get('/download/:fileName',
  param('fileName').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const file = path.resolve(cfg.STORAGE_PATH, req.params.fileName);
      if (!file.startsWith(path.resolve(cfg.STORAGE_PATH))) {
        return res.status(403).json({ error: 'Acceso denegado', code: 403 });
      }
      if (!fs.existsSync(file)) return res.status(404).json({ error: 'No encontrado', code: 404 });
      res.download(file, (err) => { if (err) next(err); });
    } catch (e) { next(e); }
  });

module.exports = router;
