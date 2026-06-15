const express = require('express');
const path    = require('path');
const { body, param, validationResult } = require('express-validator');
const db    = require('../db');
const cfg   = require('../config');
const { auth, optionalAuth, requireAdmin, isAuthorOrModerator, isOwnerOrAdmin } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');
const { convertFileToChapters } = require('../services/conversion');

const router = express.Router();


router.get('/', async (req, res, next) => {
  try {
    const { category, age_group, q, author_id, status } = req.query;
    const rawLimit = Math.min(100, parseInt(req.query.limit) || 50);
    const rawOffset = parseInt(req.query.offset) || 0;
    const books = await db.listBooks({ category, age_group, q, author_id, status,
                                       limit: rawLimit,
                                       offset: rawOffset });
    res.json({ books });
  } catch (e) { next(e); }
});

router.get('/:id', optionalAuth,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
    const book = await db.getBook(req.params.id);
    if (!book) return res.status(404).json({ error: 'Libro no encontrado', code: 404 });

    const user_id = req.user ? req.user.sub : null;

    const chapters = await db.listChapters(req.params.id);

    let favorited = false, user_rating = 0, bookmark = null;
    if (user_id) {
      const fav = await db.getFavorite(user_id, req.params.id);
      favorited = fav.favorited;
      user_rating = await db.getUserRating(user_id, req.params.id);
      bookmark = await db.getBookmark(user_id, req.params.id);
    }

    res.json({ book, chapters, favorited, user_rating, bookmark });
  } catch (e) { next(e); }
});

router.post('/',
  auth,
  body('title').isString().isLength({ min: 1 }),
  body('description').optional().isString(),
  body('category').optional().isString(),
  body('age_group').optional().isIn(['infantil','adolescente','adulto']),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const book = await db.createBook({
        title: req.body.title,
        subtitle: req.body.subtitle,
        description: req.body.description,
        category: req.body.category,
        age_group: req.body.age_group,
        author_id: req.user.sub,
        status: 'draft'
      });
      res.json({ book });
    } catch (e) { next(e); }
  });

router.put('/:id', auth, isAuthorOrModerator,
  param('id').isString().isLength({ min: 1 }),
  body('title').optional().isString(),
  body('description').optional().isString(),
  body('category').optional().isString(),
  body('age_group').optional().isIn(['infantil','adolescente','adulto']),
  body('is_free').optional().isBoolean({ loose: true }),
  body('price_cents').optional().isInt({ min: 0 }),
  body('status').optional().isIn(['draft','published','deleted']),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const allowed = ['title','subtitle','description','category','age_group',
                      'is_free','price_cents','cover_url','original_public','status'];
      const patch = {};
      for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];

      const book = await db.updateBook(req.params.id, patch);
      if (!book) return res.status(404).json({ error: 'Libro no encontrado', code: 404 });
      res.json({ book });
    } catch (e) { next(e); }
  });

router.delete('/:id', auth, isOwnerOrAdmin,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try { await db.deleteBook(req.params.id); res.json({ ok: true }); }
  catch (e) { next(e); }
});

// ---------------- CAPÍTULOS ----------------
router.post('/:id/chapters', auth, isAuthorOrModerator,
  param('id').isString().isLength({ min: 1 }),
  body('title').optional().isString(),
  body('content').optional().isString(),
  body('order').optional().isInt({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const chapter = await db.createChapter({
        book_id: req.params.id,
        title: req.body.title || 'Capítulo',
        content: req.body.content || '',
        order: req.body.order ?? 1
      });
      res.json({ chapter });
    } catch (e) { next(e); }
  });

router.put('/:id/chapters/:chapterId', auth, isAuthorOrModerator,
  param('id').isString().isLength({ min: 1 }),
  param('chapterId').isString().isLength({ min: 1 }),
  body('title').optional().isString(),
  body('content').optional().isString(),
  body('order').optional().isInt({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const chapter = await db.getChapter(req.params.chapterId);
      if (!chapter || chapter.book_id !== req.params.id) {
        return res.status(404).json({ error: 'Capítulo no encontrado', code: 404 });
      }
      const patch = {};
      if (req.body.title !== undefined) patch.title = req.body.title;
      if (req.body.content !== undefined) patch.content = req.body.content;
      if (req.body.order !== undefined) patch.order = req.body.order;
      await db.updateChapter(req.params.chapterId, patch);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.delete('/:id/chapters/:chapterId', auth, isAuthorOrModerator,
  param('id').isString().isLength({ min: 1 }),
  param('chapterId').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const chapter = await db.getChapter(req.params.chapterId);
      if (!chapter || chapter.book_id !== req.params.id) {
        return res.status(404).json({ error: 'Capítulo no encontrado', code: 404 });
      }
      await db.deleteChapter(req.params.chapterId);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

// ---------------- FAVORITES / RATINGS / COMMENTS ----------------
router.post('/:id/favorite', auth,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try { const r = await db.toggleFavorite(req.user.sub, req.params.id); res.json(r); }
  catch (e) { next(e); }
});

router.post('/:id/rate', auth,
  param('id').isString().isLength({ min: 1 }),
  body('rating').isInt({ min: 1, max: 5 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try { await db.rateBook(req.user.sub, req.params.id, +req.body.rating); res.json({ ok: true }); }
    catch (e) { next(e); }
  });

router.post('/:id/comment', auth,
  param('id').isString().isLength({ min: 1 }),
  body('content').isString().isLength({ min: 1, max: 2000 }),
  body('chapter_id').optional().isString(),
  body('parent_comment_id').optional().isString(),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const c = await db.addComment({ user_id: req.user.sub, book_id: req.params.id,
                                      chapter_id: req.body.chapter_id,
                                      parent_comment_id: req.body.parent_comment_id,
                                      content: req.body.content });
      res.json({ comment: c });
    } catch (e) { next(e); }
  });

router.delete('/:id/comments/:commentId', auth,
  param('id').isString().isLength({ min: 1 }),
  param('commentId').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const comment = await db.getComment(req.params.commentId);
      if (!comment || comment.book_id !== req.params.id)
        return res.status(404).json({ error: 'Comentario no encontrado', code: 404 });
      if (comment.user_id !== req.user.sub && req.user.role !== 'moderator' && req.user.role !== 'admin')
        return res.status(403).json({ error: 'No autorizado', code: 403 });
      await db.deleteComment(req.params.commentId);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

router.get('/:id/comments',
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try { res.json({ comments: await db.listComments(req.params.id) }); }
  catch (e) { next(e); }
});

router.post('/:id/view', optionalAuth,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
    const user_id = req.user ? req.user.sub : null;
    await db.incrementViews(req.params.id, user_id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/:id/reset-views', auth, requireAdmin,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
    await db.resetBookViews(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---------------- CONVERSIÓN DE ARCHIVO A LIBRO ----------------
router.post('/:id/import-file',
  auth, isAuthorOrModerator,
  upload.single('file'),
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      if (!req.file) return res.status(400).json({ error: 'Archivo requerido', code: 400 });
      if (req.file._kind !== 'text')
        return res.status(400).json({ error: 'Sólo archivos de texto: .txt .md .docx .rtf', code: 400 });

      const chapters = await convertFileToChapters(req.file.path);
      for (const c of chapters) {
        await db.createChapter({ book_id: req.params.id,
                                 title: c.title, content: c.content,
                                 order: c.order, is_early_access: false });
      }
      const original = path.relative(cfg.STORAGE_PATH, req.file.path);
      const book = await db.updateBook(req.params.id, {
        original_file: original,
        original_public: req.body.original_public === true || req.body.original_public === 'true'
      });
      res.json({ ok: true, chapters_created: chapters.length, book });
    } catch (e) { next(e); }
  });

// ---------------- IMÁGENES DEL LIBRO (para editores externos) ----------------
router.get('/:id/images', auth, isAuthorOrModerator,
  param('id').isString().isLength({ min: 1 }),
  async (req, res, next) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg, code: 400 });
    try {
      const book = req.book;
      const chapters = await db.listChapters(req.params.id);
      const seen = new Set();
      const IMG_RE = /@img:([a-zA-Z0-9\-_,\.\?!¿¡<>]+)/g;
      for (const ch of chapters) {
        if (!ch.content) continue;
        let m;
        while ((m = IMG_RE.exec(ch.content)) !== null) {
          seen.add(m[1]);
        }
      }
      const images = [];
      const author = await db.getUserById(book.author_id);
      for (const name of seen) {
        const img = await db.getUserImageByCustomName(book.author_id, name);
        if (img) {
          images.push({
            custom_name: img.custom_name,
            url: '/api/user-images/resolve/' + book.author_id + '/' + encodeURIComponent(img.custom_name),
            owner: {
              id: author?.id || book.author_id,
              display_name: author?.display_name || 'Desconocido',
              email: author?.email || ''
            }
          });
        }
      }
      res.json({ images, author_id: book.author_id });
    } catch (e) { next(e); }
  });

module.exports = router;
