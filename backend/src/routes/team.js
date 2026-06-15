const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../db');
const { auth, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const [profiles, title] = await Promise.all([db.getTeamProfiles(), db.getTeamTitle()]);
    res.json({ profiles, title });
  } catch (e) { next(e); }
});

router.put('/title',
  auth, requireAdmin,
  body('title').isString().notEmpty(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      await db.setTeamTitle(req.body.title);
      res.json({ title: req.body.title });
    } catch (e) { next(e); }
  }
);

router.put('/reorder',
  auth, requireAdmin,
  body('orderedIds').isArray({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const profiles = await db.reorderTeamProfiles(req.body.orderedIds);
      res.json({ profiles });
    } catch (e) { next(e); }
  }
);

router.put('/:id',
  auth, requireAdmin,
  param('id').isString().notEmpty(),
  body('name').optional().isString(),
  body('age').optional().isString(),
  body('role').optional().isString(),
  body('admin_email').optional().isString(),
  body('contact').optional().isString(),
  body('info').optional().isString(),
  body('photo_url').optional().isString(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const profile = await db.updateTeamProfile(req.params.id, req.body);
      if (!profile) return res.status(404).json({ error: 'Perfil no encontrado', code: 404 });
      res.json({ profile });
    } catch (e) { next(e); }
  }
);

module.exports = router;
