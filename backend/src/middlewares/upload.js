const multer = require('multer');
const path   = require('path');
const cfg    = require('../config');

const ALLOWED_IMAGE = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_TEXT  = ['.txt', '.md', '.docx', '.rtf'];

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const isImg = ALLOWED_IMAGE.includes(ext);
  const isTxt = ALLOWED_TEXT.includes(ext);
  if (!isImg && !isTxt) return cb(new Error('Formato no permitido: ' + ext));
  file._kind = isImg ? 'image' : 'text';
  cb(null, true);
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: cfg.MAX_UPLOAD_SIZE_BYTES }
});

module.exports = { upload, ALLOWED_IMAGE, ALLOWED_TEXT };
