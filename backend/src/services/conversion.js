/**
 * BookShelf™ - Conversión de archivos a estructura de libro.
 *
 * - .md / .txt: parseo nativo. Capítulos detectados por:
 *               líneas que empiezan con "# " (markdown header)
 *               o líneas con "Capítulo" / "Chapter"
 *               o doble salto de línea (heurística secundaria).
 * - .docx:      con la librería mammoth (extrae texto plano).
 * - .rtf:       extracción muy básica (strip de comandos RTF).
 */
const fs = require('fs');
const path = require('path');

async function convertFileToChapters(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let raw = '';

  if (ext === '.docx') {
    try {
      const mammoth = require('mammoth');
      const r = await mammoth.extractRawText({ path: filePath });
      raw = r.value || '';
    } catch (e) {
      throw new Error('Error convirtiendo archivo .docx. Verifica que sea un documento válido.');
    }
  } else if (ext === '.rtf') {
    try {
      const src = fs.readFileSync(filePath, 'utf8');
      raw = src.replace(/\\pard?/g, '\n').replace(/\\[a-z]+-?\d* ?/gi, '').replace(/[{}]/g, '');
    } catch (e) {
      throw new Error('Error leyendo archivo RTF. Verifica que sea un documento válido.');
    }
  } else {
    try {
      raw = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      throw new Error('Error leyendo archivo. Verifica que exista y sea accesible.');
    }
  }

  return splitIntoChapters(raw, ext);
}

function splitIntoChapters(raw, ext) {
  if (!raw || !raw.trim()) return [{ title: 'Capítulo 1', content: '', order: 1 }];

  const lines = raw.split(/\r?\n/);
  const chapters = [];
  let current = null;
  let order = 1;

  const isHeader = (line) => {
    if (ext === '.md' && /^#\s+/.test(line)) return line.replace(/^#\s+/, '').trim();
    const m = line.match(/^\s*(Cap[ií]tulo|Chapter)\s+([\w\dIVX]+)\.?[:\-\s]*(.*)$/i);
    if (m) return (m[0] || '').trim();
    return null;
  };

  for (const line of lines) {
    const hdr = isHeader(line);
    if (hdr) {
      if (current) chapters.push(current);
      current = { title: hdr, content: '', order: order++ };
    } else {
      if (!current) current = { title: 'Capítulo 1', content: '', order: order++ };
      current.content += line + '\n';
    }
  }
  if (current) chapters.push(current);

  // Heurística secundaria: si no se detectaron capítulos, partir por dobles saltos.
  if (chapters.length <= 1 && raw.includes('\n\n\n')) {
    const blocks = raw.split(/\n{3,}/).map(b => b.trim()).filter(Boolean);
    return blocks.map((content, i) => ({
      title: 'Capítulo ' + (i + 1),
      content,
      order: i + 1
    }));
  }
  return chapters.map(c => ({ ...c, content: c.content.trim() }));
}

module.exports = { convertFileToChapters };
