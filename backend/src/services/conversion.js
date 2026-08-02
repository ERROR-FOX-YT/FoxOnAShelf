const path = require('path');

async function convertFileToChapters(buffer, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  let raw = '';

  if (ext === '.docx') {
    try {
      const mammoth = require('mammoth');
      const r = await mammoth.extractRawText({ buffer });
      raw = r.value || '';
    } catch (e) {
      throw new Error('Error convirtiendo archivo .docx. Verifica que sea un documento válido.');
    }
  } else if (ext === '.rtf') {
    try {
      raw = buffer.toString('utf8').replace(/\\pard?/g, '\n').replace(/\\[a-z]+-?\d* ?/gi, '').replace(/[{}]/g, '');
    } catch (e) {
      throw new Error('Error leyendo archivo RTF. Verifica que sea un documento válido.');
    }
  } else {
    try {
      raw = buffer.toString('utf8');
    } catch (e) {
      throw new Error('Error leyendo archivo. Verifica que exista y sea accesible.');
    }
  }

  return splitIntoChapters(raw, ext);
}

function splitIntoChapters(raw, ext) {
  if (!raw || !raw.trim()) return [{ titulo: 'Capítulo 1', contenido: '', orden: 1 }];

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
      current = { titulo: hdr, contenido: '', orden: order++ };
    } else {
      if (!current) current = { titulo: 'Capítulo 1', contenido: '', orden: order++ };
      current.contenido += line + '\n';
    }
  }
  if (current) chapters.push(current);

  // Heurística secundaria: si no se detectaron capítulos, partir por dobles saltos.
  if (chapters.length <= 1 && raw.includes('\n\n\n')) {
    const bloques = raw.split(/\n{3,}/).map(b => b.trim()).filter(Boolean);
    return bloques.map((contenido, i) => ({
      titulo: 'Capítulo ' + (i + 1),
      contenido,
      orden: i + 1
    }));
  }
  return chapters.map(c => ({ ...c, contenido: c.contenido.trim() }));
}

module.exports = { convertFileToChapters };
