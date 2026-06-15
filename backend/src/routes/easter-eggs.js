const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { auth, requireAdmin } = require('../middlewares/auth');

const router = express.Router();

router.get('/', auth, requireAdmin, async (_req, res, next) => {
  try {
    const eggs = await db.getEasterEggs();
    res.json({ easter_eggs: eggs });
  } catch (e) { next(e); }
});

router.put('/',
  auth, requireAdmin,
  body('easter_eggs').isArray().withMessage('easter_eggs debe ser un array'),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      await db.updateEasterEggs(req.body.easter_eggs);
      res.json({ ok: true });
    } catch (e) { next(e); }
  }
);

module.exports = router;
