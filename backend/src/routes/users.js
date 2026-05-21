const express = require('express');
const db    = require('../db');
const { auth } = require('../middlewares/auth');

const router = express.Router();

router.get('/:id', async (req, res, next) => {
  try {
    const u = await db.getUserById(req.params.id);
    if (!u) return res.status(404).json({ error: 'Usuario no encontrado', code: 404 });
    res.json({ user: { id: u.id, email: u.email, display_name: u.display_name,
                       role: u.role, avatar_url: u.avatar_url,
                       contact_info: u.contact_info } });
  } catch (e) { next(e); }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    if (req.user.sub !== req.params.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'No autorizado', code: 403 });
    // Sólo permitimos contact_info y display_name vía este endpoint demo
    if (req.body.contact_info !== undefined)
      await db.updateUserContactInfo(req.params.id, req.body.contact_info);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
