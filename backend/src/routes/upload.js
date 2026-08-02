const { param, validationResult } = require('express-validator');
const express = require('express');
const path    = require('path');
const { auth, requireAdmin, requireModerator } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');
const storageSvc = require('../services/storage');

const router = express.Router();

router.post('/', auth, upload.single('file'), async (req, res, next) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo requerido', code: 400 });
  try {
    const ext = path.extname(req.file.originalname).toLowerCase();
    const cloudPath = 'uploads/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext;
    const publicUrl = await storageSvc.uploadFile(req.file.buffer, cloudPath, req.file.mimetype);
    res.json({
      archivo: {
        nombre_archivo: path.basename(cloudPath),
        tipo: req.file._kind,
        tamano: req.file.size,
        url: publicUrl
      }
    });
  } catch (e) { next(e); }
});

router.delete('/:nombreArchivo', auth, requireModerator,
  param('nombreArchivo').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const cloudPath = 'uploads/' + req.params.nombreArchivo;
      await storageSvc.deleteFile(cloudPath).catch(() => {});
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.get('/descargar/:nombreArchivo',
  param('nombreArchivo').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const cloudPath = 'uploads/' + req.params.nombreArchivo;
      const url = storageSvc.getPublicUrl(cloudPath);
      res.redirect(url);
    } catch (e) { next(e); }
  });

module.exports = router;
