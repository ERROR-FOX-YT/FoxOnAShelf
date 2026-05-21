/**
 * Booked™ - Subida de archivos (imágenes + archivos de texto para conversión).
 */
const fs     = require('fs');
const path   = require('path');
const multer = require('multer');
const cfg    = require('../config');

const STORAGE = cfg.STORAGE_PATH;
fs.mkdirSync(STORAGE, { recursive: true });

const ALLOWED_IMAGE = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_TEXT  = ['.txt', '.md', '.docx', '.rtf'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, STORAGE),
  filename:    (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext);
  }
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const isImg = ALLOWED_IMAGE.includes(ext);
  const isTxt = ALLOWED_TEXT.includes(ext);
  if (!isImg && !isTxt) return cb(new Error('Formato no permitido: ' + ext));
  file._kind = isImg ? 'image' : 'text';
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: cfg.MAX_UPLOAD_SIZE_BYTES }
});

module.exports = { upload, STORAGE, ALLOWED_IMAGE, ALLOWED_TEXT };
