const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const db    = require('../db');
const cfg   = require('../config');
const { auth, requireRole, isAuthorOrModerator } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');
const { convertFileToChapters } = require('../services/conversion');

const router = express.Router();

// Estado en memoria para el límite de 2 minutos de publicación
const publishWindows = new Map(); // bookId -> startedAt (ms)

router.get('/', async (req, res, next) => {
  try {
    const { category, age_group, q, limit=50, offset=0 } = req.query;
    const books = await db.listBooks({ category, age_group, q,
                                       limit: Math.min(100, +limit),
                                       offset: +offset });
    res.json({ books });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const book = await db.getBook(req.params.id);
    if (!book) return res.status(404).json({ error: 'Libro no encontrado', code: 404 });
    await db.incrementViews(req.params.id);
    const chapters = await db.listChapters(req.params.id);
    res.json({ book, chapters });
  } catch (e) { next(e); }
});

router.post('/',
  auth,
  requireRole('creator', 'admin'),
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
      publishWindows.set(book.id, Date.now());
      res.json({ book, publish_deadline: Date.now() + cfg.PUBLISH_WINDOW_MS });
    } catch (e) { next(e); }
  });

router.put('/:id', auth, isAuthorOrModerator, async (req, res, next) => {
  try {
    const allowed = ['title','subtitle','description','category','age_group',
                     'is_free','price_cents','cover_url','original_public','status'];
    const patch = {};
    for (const k of allowed) if (req.body[k] !== undefined) patch[k] = req.body[k];

    if (patch.status === 'published') {
      const started = publishWindows.get(req.params.id);
      if (started && Date.now() - started > cfg.PUBLISH_WINDOW_MS) {
        return res.status(400).json({
          error: 'Se excedió el límite de 2 minutos para publicar. Edita y vuelve a intentar.',
          code: 400
        });
      }
      publishWindows.delete(req.params.id);
    }
    const book = await db.updateBook(req.params.id, patch);
    res.json({ book });
  } catch (e) { next(e); }
});

router.delete('/:id', auth, isAuthorOrModerator, async (req, res, next) => {
  try { await db.deleteBook(req.params.id); res.json({ ok: true }); }
  catch (e) { next(e); }
});

// ---------------- CAPÍTULOS ----------------
router.post('/:id/chapters', auth, isAuthorOrModerator,
  body('title').optional().isString(),
  body('content').optional().isString(),
  async (req, res, next) => {
    try {
      const chapter = await db.createChapter({
        book_id: req.params.id,
        title: req.body.title || 'Capítulo',
        content: req.body.content || '',
        order: req.body.order || 1
      });
      res.json({ chapter });
    } catch (e) { next(e); }
  });

// ---------------- FAVORITES / RATINGS / COMMENTS ----------------
router.post('/:id/favorite', auth, async (req, res, next) => {
  try { const r = await db.toggleFavorite(req.user.sub, req.params.id); res.json(r); }
  catch (e) { next(e); }
});

router.post('/:id/rate', auth,
  body('rating').isInt({ min: 1, max: 5 }),
  async (req, res, next) => {
    try { await db.rateBook(req.user.sub, req.params.id, +req.body.rating); res.json({ ok: true }); }
    catch (e) { next(e); }
  });

router.post('/:id/comment', auth,
  body('content').isString().isLength({ min: 1, max: 2000 }),
  async (req, res, next) => {
    try {
      const c = await db.addComment({ user_id: req.user.sub, book_id: req.params.id,
                                      chapter_id: req.body.chapter_id,
                                      parent_comment_id: req.body.parent_comment_id,
                                      content: req.body.content });
      res.json({ comment: c });
    } catch (e) { next(e); }
  });

router.get('/:id/comments', async (req, res, next) => {
  try { res.json({ comments: await db.listComments(req.params.id) }); }
  catch (e) { next(e); }
});

// ---------------- CONVERSIÓN DE ARCHIVO A LIBRO ----------------
router.post('/:id/import-file',
  auth, isAuthorOrModerator,
  upload.single('file'),
  async (req, res, next) => {
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
        original_public: !!req.body.original_public && req.body.original_public !== 'false'
      });
      res.json({ ok: true, chapters_created: chapters.length, book });
    } catch (e) { next(e); }
  });

module.exports = router;
