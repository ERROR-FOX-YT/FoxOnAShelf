const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { auth, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try { res.json({ announcements: await db.listAnnouncements() }); }
  catch (e) { next(e); }
});

router.post('/', auth, requireAdmin,
  body('title').isString().isLength({ min: 1 }),
  body('content').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const a = await db.createAnnouncement({
        admin_id: req.user.sub, title: req.body.title,
        content: req.body.content, image_path: req.body.image_path
      });
      res.json({ announcement: a });
    } catch (e) { next(e); }
  });

module.exports = router;
