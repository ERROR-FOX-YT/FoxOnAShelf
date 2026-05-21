const express = require('express');
const path    = require('path');
const fs      = require('fs');
const cfg     = require('../config');
const { auth } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');

const router = express.Router();

router.post('/', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Archivo requerido', code: 400 });
  res.json({
    file: {
      filename: req.file.filename,
      kind: req.file._kind,
      size: req.file.size,
      url: '/storage/' + req.file.filename
    }
  });
});

router.get('/download/:fileName', async (req, res) => {
  const file = path.join(cfg.STORAGE_PATH, req.params.fileName);
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'No encontrado', code: 404 });
  res.download(file);
});

module.exports = router;
