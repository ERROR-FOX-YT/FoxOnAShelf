const express = require('express');
const db    = require('../db');
const { auth } = require('../middlewares/auth');

const router = express.Router();

// Todas requieren autenticación
router.use(auth);

router.get('/', async (req, res, next) => {
  try { res.json({ bookmarks: await db.listBookmarks(req.user.sub) }); }
  catch (e) { next(e); }
});

router.get('/:bookId', async (req, res, next) => {
  try {
    const bk = await db.getBookmark(req.user.sub, req.params.bookId);
    res.json({ bookmark: bk });
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { book_id, chapter_id, chapter_index, scroll_position, finished } = req.body;
    if (!book_id) return res.status(400).json({ error: 'book_id requerido', code: 400 });
    await db.upsertBookmark({
      user_id: req.user.sub, book_id,
      chapter_id: chapter_id || null,
      chapter_index: chapter_index || 0,
      scroll_position: scroll_position || 0,
      finished: !!finished
    });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.put('/:bookId/finish', async (req, res, next) => {
  try {
    const { finished } = req.body;
    await db.markFinished(req.user.sub, req.params.bookId, finished !== false);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:bookId', async (req, res, next) => {
  try {
    await db.deleteBookmark(req.user.sub, req.params.bookId);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
