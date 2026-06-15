const { body, param, validationResult } = require('express-validator');
const express = require('express');
const db = require('../db');
const { auth, requireAdmin, requireModerator } = require('../middlewares/auth');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try { res.json({ announcements: await db.listAnnouncements() }); }
  catch (e) { next(e); }
});

router.post('/', auth, requireModerator,
  body('title').isString().isLength({ min: 1 }),
  body('content').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const user = await db.getUserById(req.user.sub);
      const a = await db.createAnnouncement({
        admin_id: req.user.sub, title: req.body.title,
        content: req.body.content, image_path: req.body.image_path,
        created_by_name: user ? user.display_name : null,
        created_by_role: req.user.role
      });
      res.json({ announcement: a });
    } catch (e) { next(e); }
  });

router.put('/:id/feature', auth, requireAdmin,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      await db.setFeaturedAnnouncement(req.params.id);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.put('/:id/published-by', auth, requireAdmin,
  param('id').isString().isLength({ min: 1 }),
  body('published_by').isString(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      await db.updatePublishedBy(req.params.id, req.body.published_by);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.put('/:id', auth,
  param('id').isString().isLength({ min: 1 }),
  body('title').isString().isLength({ min: 1 }),
  body('content').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const ann = await db.getAnnouncement(req.params.id);
      if (!ann) return res.status(404).json({ error: 'Anuncio no encontrado', code: 404 });
      if (ann.admin_id !== req.user.sub && req.user.role !== 'admin')
        return res.status(403).json({ error: 'Solo el autor o un administrador pueden editar este anuncio', code: 403 });
      await db.updateAnnouncement(req.params.id, {
        title: req.body.title, content: req.body.content,
        image_path: req.body.image_path !== undefined ? req.body.image_path : ann.image_path
      });
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.delete('/:id', auth,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const ann = await db.getAnnouncement(req.params.id);
      if (!ann) return res.status(404).json({ error: 'Anuncio no encontrado', code: 404 });
      if (ann.admin_id !== req.user.sub && req.user.role !== 'admin')
        return res.status(403).json({ error: 'Solo el autor o un administrador pueden eliminar este anuncio', code: 403 });
      await db.deleteAnnouncement(req.params.id);
      res.json({ ok: true });
    }
  catch (e) { next(e); }
});

module.exports = router;
