const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { param, body, query, validationResult } = require('express-validator');
const db      = require('../db');
const cfg     = require('../config');
const { auth } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');
const { rateLimit } = require('../middlewares/rate-limit');

const router = express.Router();

const NAME_REGEX = /^[a-zA-Z0-9\-_,\.\?!¿¡<>]+$/;

function validateName(name) {
  return name && name.length >= 1 && name.length <= 60 && NAME_REGEX.test(name);
}

// GET / — list user images with usage info
router.get('/', auth, async (req, res, next) => {
  try {
    const images = await db.listUserImages(req.user.sub);
    const userBooks = await db.listBooks({ author_id: req.user.sub, status: 'all', limit: 1000 });
    const allContent = [];
    for (const b of userBooks) {
      const chapters = await db.listChapters(b.id);
      for (const c of chapters) {
        if (c.content) allContent.push({ book_id: b.id, book_title: b.title, content: c.content });
      }
    }
    const result = images.map(img => {
      const usedIn = [];
      for (const item of allContent) {
        const re = new RegExp('@img:' + escapeRegex(img.custom_name) + '(?![a-zA-Z0-9\-_,\.\?!¿¡<>])');
        if (re.test(item.content)) {
          usedIn.push({ book_id: item.book_id, book_title: item.book_title });
        }
      }
      return {
        id: img.id,
        storage_path: img.storage_path,
        custom_name: img.custom_name,
        url: '/storage/' + path.basename(img.storage_path || ''),
        sort_order: img.sort_order,
        created_at: img.created_at,
        in_use: usedIn.length > 0,
        used_in: usedIn
      };
    });
    res.json({ images: result });
  } catch (e) { next(e); }
});

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// POST / — upload image with custom name
router.post('/', auth, upload.single('file'), async (req, res, next) => {
  if (rateLimit('upload:'+req.user.sub, 20, 60000)) return res.status(429).json({ error: 'Demasiadas subidas, intenta más tarde', code: 429 });
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido', code: 400 });
    if (req.file._kind !== 'image')
      return res.status(400).json({ error: 'Sólo imágenes: .jpg .jpeg .png .webp', code: 400 });
    const customName = (req.body.custom_name || '').trim();
    if (!validateName(customName))
      return res.status(400).json({ error: 'Nombre inválido. Usa letras, números y -_,.!?¿¡<> (máx 60 caracteres)', code: 400 });
    const available = await db.checkUserImageNameAvailable(req.user.sub, customName);
    if (!available)
      return res.status(409).json({ error: 'Ya existe una imagen con ese nombre', code: 409 });
    const all = await db.listUserImages(req.user.sub);
    const nextSortOrder = all.reduce((max, img) => Math.max(max, img.sort_order || 0), 0) + 1;
    const img = await db.createUserImage({
      user_id: req.user.sub,
      storage_path: req.file.path,
      custom_name: customName,
      sort_order: nextSortOrder
    });
    res.json({
      image: {
        ...img,
        url: '/storage/' + req.file.filename,
        in_use: false,
        used_in: []
      }
    });
  } catch (e) { next(e); }
});

// PUT /:id — rename or reorder
router.put('/:id', auth,
  param('id').isString().isLength({ min: 1 }),
  body('custom_name').optional().isString(),
  body('sort_order').optional().isInt(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const img = await db.getUserImage(req.params.id);
      if (!img || img.user_id !== req.user.sub)
        return res.status(404).json({ error: 'Imagen no encontrada', code: 404 });
      const patch = {};
      if (req.body.custom_name !== undefined) {
        const name = (req.body.custom_name || '').trim();
        if (!validateName(name))
          return res.status(400).json({ error: 'Nombre inválido', code: 400 });
        const available = await db.checkUserImageNameAvailable(req.user.sub, name, req.params.id);
        if (!available)
          return res.status(409).json({ error: 'Ya existe una imagen con ese nombre', code: 409 });
        patch.custom_name = name;
      }
      if (req.body.sort_order !== undefined) patch.sort_order = req.body.sort_order;
      await db.updateUserImage(req.params.id, patch);
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
      const img = await db.getUserImage(req.params.id);
      if (!img || img.user_id !== req.user.sub)
        return res.status(404).json({ error: 'Imagen no encontrada', code: 404 });
      const filePath = path.resolve(img.storage_path);
      if (filePath.startsWith(path.resolve(cfg.STORAGE_PATH)) && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await db.deleteUserImage(req.params.id);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

// GET /resolve/:authorId/:name — resolve image name to file for reader
router.get('/resolve/:authorId/:name',
  param('authorId').isString().isLength({ min: 1 }),
  param('name').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const img = await db.getUserImageByCustomName(req.params.authorId, req.params.name);
      if (!img) return res.status(404).json({ error: 'Imagen no encontrada', code: 404 });
      const filePath = path.resolve(img.storage_path);
      if (!filePath.startsWith(path.resolve(cfg.STORAGE_PATH)) || !fs.existsSync(filePath))
        return res.status(404).json({ error: 'Archivo no encontrado', code: 404 });
      res.sendFile(filePath);
    } catch (e) { next(e); }
  });

module.exports = router;
