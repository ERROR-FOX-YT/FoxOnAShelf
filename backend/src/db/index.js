/**
 * FoxOnAShelf™ - Capa de acceso a datos
 *
 * Dos backends intercambiables según DB_MODE:
 *   - 'postgres' (default si hay DATABASE_URL): usa node-postgres.
 *   - 'json':      usa storage/db.json (sin instalar Postgres).
 *
 * Expone una API uniforme con funciones de alto nivel
 * (listarLibros, obtenerUsuarioPorEmail, banearUsuario, etc.) para que las rutas
 * sean idénticas independientemente del backend.
 */
const fs   = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cfg  = require('../config');

const isPg = cfg.DB_MODE === 'postgres';

// ---------------------------------------------------------------------
// JSON backend
// ---------------------------------------------------------------------
const JSON_PATH = path.join(cfg.STORAGE_PATH, 'db.json');

function loadJson() {
  if (!fs.existsSync(JSON_PATH)) {
    fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
    fs.writeFileSync(JSON_PATH, JSON.stringify(emptyDb(), null, 2));
  }
  let raw = fs.readFileSync(JSON_PATH, 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  return JSON.parse(raw);
}
function saveJson(db) {
  fs.writeFileSync(JSON_PATH, JSON.stringify(db, null, 2));
}

// Serializa todas las operaciones de escritura para evitar race conditions
// en modo JSON. Cada operación load → modify → save se ejecuta secuencialmente.
let dbQueue = Promise.resolve();
function withDb(fn) {
  const p = dbQueue.then(() => {
    const db = loadJson();
    const result = fn(db);
    saveJson(db);
    return result;
  });
  dbQueue = p.catch(() => {});
  return p;
}

const VENTANA_RECUPERACION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function emptyDb() {
  return { usuarios:[], libros:[], capitulos:[], favoritos:[], calificaciones:[],
           comentarios:[], colecciones:[], libros_coleccion:[], notificaciones:[],
           anuncios:[], metricas:[], usuarios_baneados:[], lista_negra_tokens:[],
           registros_moderacion:[], vistas_libro:[], tokens_refresco:[], destacados:[],
           categorias:['fantasía','poesía','narrativa','educativa'],
           marcadores:[], imagenes_usuario:[], papelera:[],
             historiales:[], config_historial:{ texto_enlace:'Ver historial de versiones', version_actual:'1.0.0' },
             huevos_pascua:[{ id:'register_username', mensaje:'Nu uh, eso es mío!', descripcion:'Intenta registrarte con este nombre en la página de registro.', nombres:['ERROR_FOX'], emoji:'🦊' }],
             perfiles_equipo:[
                { id:'error-fox', nombre:'ERROR_FOX', edad:'', role:'', contacto:'', informacion:'Texto de ejemplo para el perfil.', urlFoto:'', admin_email:'' }
             ],
             titulo_equipo:'Nuestro Equipo' };
}

// ---------------------------------------------------------------------
// Postgres backend
// ---------------------------------------------------------------------
let pgPool = null;
if (isPg) {
  const { Pool } = require('pg');
  pgPool = new Pool({ connectionString: cfg.DATABASE_URL });
}

async function pgQuery(text, params = []) {
  const r = await pgPool.query(text, params);
  return r.rows;
}

function parseJsonb(val, fallback) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') try { return JSON.parse(val); } catch { return fallback; }
  return val;
}

// ---------------------------------------------------------------------
// API uniforme
// ---------------------------------------------------------------------
const api = {
  // ---- HEALTH ----
  async ping() {
    if (isPg) { await pgQuery('SELECT 1'); return true; }
    loadJson();
    return true;
  },

  // ---- USERS ----
  async listarUsuarios({ q, role, page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    if (isPg) {
      const where = []; const params = [];
      if (q) {
        const sq = q.replace(/[%_\\]/g, '\\$&');
        params.push('%' + sq + '%');
        where.push(`(email ILIKE $${params.length} ESCAPE '\\' OR nombre_mostrado ILIKE $${params.length} ESCAPE '\\')`);
      }
      if (role) { params.push(role); where.push(`role=$${params.length}`); }
      const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
      params.push(limit); params.push(offset);
      const rows = await pgQuery(
        `SELECT id, email, nombre_mostrado, role, url_avatar, informacion_contacto, created_at
           FROM usuarios ${whereClause}
           ORDER BY created_at DESC
           LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
      const countResult = await pgQuery(
        `SELECT count(*)::int AS total FROM usuarios ${whereClause}`, params.slice(0, -2));
      return { usuarios: rows, total: countResult[0]?.total || 0 };
    }
    const db = loadJson();
    let arr = db.usuarios.slice();
    if (q) {
      const qq = q.toLowerCase();
      arr = arr.filter(u =>
        u.email.toLowerCase().includes(qq) ||
        (u.nombre_mostrado || '').toLowerCase().includes(qq));
    }
    if (role) arr = arr.filter(u => u.role === role);
    const total = arr.length;
    arr = arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
    arr = arr.slice(offset, offset + limit);
    return { usuarios: arr.map(u => ({ id: u.id, email: u.email, nombre_mostrado: u.nombre_mostrado,
                                     role: u.role, url_avatar: u.url_avatar,
                                     informacion_contacto: u.informacion_contacto, created_at: u.created_at })),
             total };
  },
  async obtenerUsuarioPorEmail(email) {
    if (isPg) return (await pgQuery('SELECT * FROM usuarios WHERE LOWER(email)=LOWER($1)', [email]))[0] || null;
    return loadJson().usuarios.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },
  async obtenerUsuarioPorId(id) {
    if (isPg) return (await pgQuery('SELECT * FROM usuarios WHERE id=$1', [id]))[0] || null;
    return loadJson().usuarios.find(u => u.id === id) || null;
  },
  async crearUsuario({ email, hash_contrasena, nombre_mostrado, role='user' }) {
    const id = uuidv4();
    const user = { id, email, hash_contrasena, nombre_mostrado, role,
                   url_avatar:null, informacion_contacto:null,
                   created_at: new Date().toISOString() };
    if (isPg) {
      await pgQuery(
        `INSERT INTO usuarios (id,email,hash_contrasena,nombre_mostrado,role,url_avatar,informacion_contacto,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, email, hash_contrasena, nombre_mostrado, role, null, null, user.created_at]);
      return user;
    }
    return withDb(db => {
      db.usuarios.push(user);
      return user;
    });
  },
  async actualizarInformacionContactoUsuario(id, informacion_contacto) {
    if (isPg) { await pgQuery('UPDATE usuarios SET informacion_contacto=$1 WHERE id=$2', [informacion_contacto, id]); return; }
    await withDb(db => { const u = db.usuarios.find(x => x.id === id); if (u) u.informacion_contacto = informacion_contacto; });
  },
  async actualizarNombreMostradoUsuario(id, nombre_mostrado) {
    if (isPg) { await pgQuery('UPDATE usuarios SET nombre_mostrado=$1 WHERE id=$2', [nombre_mostrado, id]); return; }
    await withDb(db => { const u = db.usuarios.find(x => x.id === id); if (u) u.nombre_mostrado = nombre_mostrado; });
  },
  async moverModerador(id, direction) {
    const all = await this.listarModeradores();
    const idx = all.findIndex(u => u.id === id);
    if (idx === -1) return false;
    if (direction === 'up' && idx === 0) return false;
    if (direction === 'down' && idx === all.length - 1) return false;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (isPg) {
      await pgQuery('UPDATE usuarios SET orden_equipo=$1 WHERE id=$2', [swapIdx, id]);
      await pgQuery('UPDATE usuarios SET orden_equipo=$1 WHERE id=$2', [idx, all[swapIdx].id]);
      return true;
    }
    await withDb(db => {
      const a = db.usuarios.find(u => u.id === id);
      const b = db.usuarios.find(u => u.id === all[swapIdx].id);
      if (!a || !b) return;
      if (a.orden_equipo == null) a.orden_equipo = idx;
      if (b.orden_equipo == null) b.orden_equipo = swapIdx;
      const tmp = a.orden_equipo;
      a.orden_equipo = b.orden_equipo;
      b.orden_equipo = tmp;
    });
    return true;
  },
  async listarModeradores() {
    if (isPg) {
      const rows = await pgQuery(
        `SELECT id,email,nombre_mostrado,role,created_at,orden_equipo
           FROM usuarios WHERE role IN ('moderator','admin')
           ORDER BY COALESCE(orden_equipo, 0), created_at`);
      return rows;
    }
    return loadJson().usuarios.filter(u => ['moderator','admin'].includes(u.role))
      .map(u => ({ id: u.id, email: u.email, nombre_mostrado: u.nombre_mostrado,
                   role: u.role, created_at: u.created_at, url_avatar: u.url_avatar,
                   informacion_contacto: u.informacion_contacto,
                   orden_equipo: u.orden_equipo || 0 }))
      .sort((a, b) => (a.orden_equipo || 0) - (b.orden_equipo || 0) || new Date(a.created_at) - new Date(b.created_at));
  },
  async removerModerador(id) {
    if (isPg) { await pgQuery('UPDATE usuarios SET role=$1 WHERE id=$2 AND role=$3', ['user', id, 'moderator']); return; }
    await withDb(db => {
      const u = db.usuarios.find(x => x.id === id && x.role === 'moderator');
      if (u) u.role = 'user';
    });
  },
  async establecerModerador(id) {
    if (isPg) {
      const max = (await pgQuery('SELECT MAX(orden_equipo) FROM usuarios WHERE role IN (\'moderator\',\'admin\')'))[0]?.max || 0;
      await pgQuery('UPDATE usuarios SET role=$1, orden_equipo=$2 WHERE id=$3 AND role=$4', ['moderator', max + 1, id, 'user']);
      return;
    }
    await withDb(db => {
      const u = db.usuarios.find(x => x.id === id && x.role === 'user');
      if (u) {
        u.role = 'moderator';
        u.orden_equipo = db.usuarios.filter(x => ['moderator','admin'].includes(x.role)).length;
      }
    });
  },
  async eliminarUsuario(id, { adminEmail, permanent } = {}) {
    if (isPg) {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        const userRow = (await client.query('SELECT * FROM usuarios WHERE id=$1', [id])).rows[0];
        if (!userRow) { await client.query('ROLLBACK'); return null; }
        const email = userRow.email;

        // Snapshot para la papelera (si no es eliminación permanente desde papelera)
        if (!permanent) {
          const userBooks = (await client.query(
            'SELECT id, titulo FROM libros WHERE autor_id=$1', [id])).rows;
          const bookIds = userBooks.map(b => b.id);

          let capitulosEnPapelera = [];
          let vistasDeLibrosEnPapelera = [];
          let favoritosDeLibrosEnPapelera = [];
          let calificacionesDeLibrosEnPapelera = [];
          let comentariosDeLibrosEnPapelera = [];
          for (const bId of bookIds) {
            capitulosEnPapelera = capitulosEnPapelera.concat(
              (await client.query('SELECT * FROM capitulos WHERE libro_id=$1', [bId])).rows);
            vistasDeLibrosEnPapelera = vistasDeLibrosEnPapelera.concat(
              (await client.query('SELECT * FROM vistas_libro WHERE libro_id=$1', [bId])).rows);
            favoritosDeLibrosEnPapelera = favoritosDeLibrosEnPapelera.concat(
              (await client.query('SELECT * FROM favoritos WHERE libro_id=$1', [bId])).rows);
            calificacionesDeLibrosEnPapelera = calificacionesDeLibrosEnPapelera.concat(
              (await client.query('SELECT * FROM calificaciones WHERE libro_id=$1', [bId])).rows);
            comentariosDeLibrosEnPapelera = comentariosDeLibrosEnPapelera.concat(
              (await client.query('SELECT * FROM comentarios WHERE libro_id=$1', [bId])).rows);
          }

          const papeleraEntry = {
            id: uuidv4(),
            user: userRow,
            email_usuario: email,
            data: {
              favoritos: (await client.query(
                'SELECT * FROM favoritos WHERE usuario_id=$1', [id])).rows,
              calificaciones: (await client.query(
                'SELECT * FROM calificaciones WHERE usuario_id=$1', [id])).rows,
              comentarios: (await client.query(
                'SELECT * FROM comentarios WHERE usuario_id=$1', [id])).rows,
              marcadores: (await client.query(
                'SELECT * FROM marcadores WHERE usuario_id=$1', [id])).rows,
              vistas_libro: (await client.query(
                'SELECT * FROM vistas_libro WHERE usuario_id=$1', [id])).rows,
              notificaciones: (await client.query(
                'SELECT * FROM notificaciones WHERE usuario_id=$1', [id])).rows,
              imagenes_usuario: (await client.query(
                'SELECT * FROM imagenes_usuario WHERE usuario_id=$1', [id])).rows,
              colecciones: (await client.query(
                'SELECT * FROM colecciones WHERE propietario_id=$1', [id])).rows,
              libros_coleccion: (await client.query(
                'SELECT lc.* FROM libros_coleccion lc JOIN colecciones c ON c.id = lc.coleccion_id WHERE c.propietario_id=$1', [id])).rows,
              libros: userBooks,
              capitulos: capitulosEnPapelera,
              vistas_libro_en_libros: vistasDeLibrosEnPapelera,
              favoritos_en_libros: favoritosDeLibrosEnPapelera,
              calificaciones_en_libros: calificacionesDeLibrosEnPapelera,
              comentarios_en_libros: comentariosDeLibrosEnPapelera
            },
            eliminado_en: new Date().toISOString(),
            expira_en: new Date(Date.now() + VENTANA_RECUPERACION_MS).toISOString(),
            eliminado_por: adminEmail || 'unknown'
          };

          await client.query(
            `INSERT INTO papelera (id, email_usuario, entrada, eliminado_en, expira_en, eliminado_por)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [papeleraEntry.id, email, JSON.stringify(papeleraEntry),
             papeleraEntry.eliminado_en, papeleraEntry.expira_en, papeleraEntry.eliminado_por]);
        }

        // Limpieza de datos del usuario en las tablas activas
        await client.query('DELETE FROM vistas_libro WHERE usuario_id=$1', [id]);
        await client.query('DELETE FROM favoritos WHERE usuario_id=$1', [id]);
        await client.query('DELETE FROM calificaciones WHERE usuario_id=$1', [id]);
        await client.query('DELETE FROM marcadores WHERE usuario_id=$1', [id]);
        await client.query('DELETE FROM comentarios WHERE usuario_id=$1', [id]);
        await client.query('DELETE FROM notificaciones WHERE usuario_id=$1', [id]);
        await client.query('DELETE FROM imagenes_usuario WHERE usuario_id=$1', [id]);
        const colIds = (await client.query(
          'SELECT id FROM colecciones WHERE propietario_id=$1', [id])).rows.map(r => r.id);
        for (const cId of colIds) {
          await client.query('DELETE FROM libros_coleccion WHERE coleccion_id=$1', [cId]);
        }
        await client.query('DELETE FROM colecciones WHERE propietario_id=$1', [id]);

        const libros = (await client.query(
          'SELECT id FROM libros WHERE autor_id=$1', [id])).rows;
        for (const b of libros) {
          await client.query('DELETE FROM capitulos WHERE libro_id=$1', [b.id]);
          await client.query('DELETE FROM vistas_libro WHERE libro_id=$1', [b.id]);
          await client.query('DELETE FROM favoritos WHERE libro_id=$1', [b.id]);
          await client.query('DELETE FROM calificaciones WHERE libro_id=$1', [b.id]);
          await client.query('DELETE FROM comentarios WHERE libro_id=$1', [b.id]);
        }
        await client.query('DELETE FROM libros WHERE autor_id=$1', [id]);
        await client.query('UPDATE anuncios SET admin_id=NULL WHERE admin_id=$1', [id]);

        // Marcar email como eliminado
        await client.query(
          `INSERT INTO usuarios_baneados (email, razon, banned_at, deleted_at)
           VALUES ($1, 'Eliminación administrativa', now(), now())
           ON CONFLICT (email) DO UPDATE SET deleted_at=now()`,
          [email]);
        await client.query('DELETE FROM lista_negra_tokens WHERE email_usuario=$1', [email]);
        await client.query('DELETE FROM tokens_refresco WHERE usuario_id=$1', [id]);
        await client.query('DELETE FROM usuarios WHERE id=$1', [id]);
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK'); throw e; }
      finally { client.release(); }
      return { deleted: true, enPapelera: !permanent };
    }
    return withDb(db => {
      const u = db.usuarios.find(x => x.id === id);
      if (!u) return null;
      const email = u.email;
      const now = new Date().toISOString();

      // Snapshot para papelera (solo si no es permanent delete desde papelera)
      if (!permanent) {
        const papeleraBooks = db.libros.filter(b => b.autor_id === id);
        const bookIds = papeleraBooks.map(b => b.id);
        if (!db.papelera) db.papelera = [];
        const papeleraEntry = {
          id: uuidv4(),
          user: { ...u },
          email_usuario: email,
          data: {
            favoritos: db.favoritos.filter(x => x.usuario_id === id),
            calificaciones: db.calificaciones.filter(x => x.usuario_id === id),
            comentarios: db.comentarios.filter(x => x.usuario_id === id),
            marcadores: (db.marcadores || []).filter(x => x.usuario_id === id),
            vistas_libro: (db.vistas_libro || []).filter(x => x.usuario_id === id),
            notificaciones: (db.notificaciones || []).filter(x => x.usuario_id === id),
            imagenes_usuario: (db.imagenes_usuario || []).filter(x => x.usuario_id === id),
            colecciones: (db.colecciones || []).filter(x => x.propietario_id === id),
            libros_coleccion: [],
            libros: papeleraBooks,
            capitulos: db.capitulos.filter(c => bookIds.includes(c.libro_id)),
            vistas_libro_en_libros: (db.vistas_libro || []).filter(v => bookIds.includes(v.libro_id)),
            favoritos_en_libros: db.favoritos.filter(f => bookIds.includes(f.libro_id)),
            calificaciones_en_libros: db.calificaciones.filter(r => bookIds.includes(r.libro_id)),
            comentarios_en_libros: db.comentarios.filter(c => bookIds.includes(c.libro_id))
          },
          eliminado_en: now,
          expira_en: new Date(Date.now() + VENTANA_RECUPERACION_MS).toISOString(),
          eliminado_por: adminEmail || 'unknown'
        };
        // Collect libros_coleccion for user's colecciones
        const userColIds = papeleraEntry.data.colecciones.map(c => c.id);
        papeleraEntry.data.libros_coleccion = (db.libros_coleccion || [])
          .filter(cb => userColIds.includes(cb.coleccion_id));

        db.papelera.push(papeleraEntry);
      }

      // Limpiar datos del usuario de colecciones activas
      db.usuarios = db.usuarios.filter(x => x.id !== id);
      db.vistas_libro = (db.vistas_libro || []).filter(x => x.usuario_id !== id);
      db.favoritos = db.favoritos.filter(x => x.usuario_id !== id);
      db.calificaciones = db.calificaciones.filter(x => x.usuario_id !== id);
      db.marcadores = (db.marcadores || []).filter(x => x.usuario_id !== id);
      db.comentarios = db.comentarios.filter(x => x.usuario_id !== id);
      db.notificaciones = (db.notificaciones || []).filter(x => x.usuario_id !== id);
      db.imagenes_usuario = (db.imagenes_usuario || []).filter(x => x.usuario_id !== id);
      const userCols = (db.colecciones || []).filter(x => x.propietario_id === id);
      const userColIds = userCols.map(c => c.id);
      db.libros_coleccion = (db.libros_coleccion || []).filter(
        cb => !userColIds.includes(cb.coleccion_id));
      db.colecciones = (db.colecciones || []).filter(x => x.propietario_id !== id);

      const userBooks = db.libros.filter(b => b.autor_id === id);
      const bookIds = userBooks.map(b => b.id);
      for (const bId of bookIds) {
        db.capitulos = db.capitulos.filter(c => c.libro_id !== bId);
        db.vistas_libro = (db.vistas_libro || []).filter(v => v.libro_id !== bId);
        db.favoritos = db.favoritos.filter(f => f.libro_id !== bId);
        db.calificaciones = db.calificaciones.filter(r => r.libro_id !== bId);
        db.comentarios = db.comentarios.filter(c => c.libro_id !== bId);
      }
      db.libros = db.libros.filter(b => !bookIds.includes(b.id));
      db.anuncios.forEach(a => { if (a.admin_id === id) a.admin_id = null; });

      const existingBan = db.usuarios_baneados.find(b => b.email.toLowerCase() === email.toLowerCase() && !b.unbanned_at);
      if (existingBan) {
        existingBan.deleted_at = now;
        existingBan.unbanned_at = now;
        existingBan.unbanned_by = adminEmail || null;
      } else {
        db.usuarios_baneados.push({
          id: uuidv4(), email, razon: 'Eliminación administrativa',
          banned_by: adminEmail || null,
          unbanned_by: adminEmail || null,
          apelacion: null, apelacion_enviada: false,
          banned_at: now, deleted_at: now, unbanned_at: now
        });
      }
      db.lista_negra_tokens = db.lista_negra_tokens.filter(t => t.email_usuario.toLowerCase() !== email.toLowerCase());
      db.tokens_refresco = (db.tokens_refresco || []).filter(t => t.usuario_id !== id);
      return { eliminado: true, enPapelera: !permanent };
    });
  },

  // ---- PAPELERA (TRASH) ----
  async listarPapelera() {
    if (isPg) {
      const rows = await pgQuery(
        `SELECT p.id, p.email_usuario, p.eliminado_en, p.expira_en, p.eliminado_por,
                p.entrada,
                u.email AS user_email, u.nombre_mostrado AS user_nombre, u.role AS user_role
           FROM papelera p
           LEFT JOIN usuarios u ON LOWER(u.email) = LOWER(p.email_usuario)
           WHERE p.expira_en > now()
           ORDER BY p.eliminado_en DESC`);
      return rows.map(r => {
        let user = null, has_libros = false, conteo_libros = 0;
        try {
          const data = typeof r.entrada === 'string' ? JSON.parse(r.entrada) : (r.entrada || {});
          user = data.user || null;
          has_libros = (data.libros || []).length > 0;
          conteo_libros = (data.libros || []).length;
        } catch {}
        if (!user && r.user_email) {
          user = { id: null, email: r.user_email, nombre_mostrado: r.user_nombre, role: r.user_role };
        }
        return {
          id: r.id, email_usuario: r.email_usuario,
          eliminado_en: r.eliminado_en, expira_en: r.expira_en, eliminado_por: r.eliminado_por,
          user, has_libros, conteo_libros,
          expired: new Date(r.expira_en) < new Date()
        };
      });
    }
    return withDb(db => {
      if (!db.papelera) db.papelera = [];
      const now = new Date();
      // Auto-purge de entradas expiradas
      db.papelera = db.papelera.filter(t => new Date(t.expira_en) > now);
      return db.papelera.map(t => ({
        id: t.id,
        email_usuario: t.email_usuario,
        eliminado_en: t.eliminado_en,
        expira_en: t.expira_en,
        eliminado_por: t.eliminado_por,
        user: { id: t.user.id, email: t.user.email, nombre_mostrado: t.user.nombre_mostrado, role: t.user.role },
        has_libros: t.data.libros.length > 0,
        conteo_libros: t.data.libros.length,
        expired: false
      }));
    });
  },

  async obtenerEntradaPapelera(id) {
    if (isPg) {
      const rows = await pgQuery('SELECT * FROM papelera WHERE id=$1', [id]);
      if (!rows.length) return null;
      const row = rows[0];
      return { ...JSON.parse(row.entrada), expired: new Date(row.expira_en) < new Date() };
    }
    return withDb(db => {
      if (!db.papelera) return null;
      const entrada = db.papelera.find(t => t.id === id);
      if (!entrada) return null;
      return { ...entrada, expired: new Date(entrada.expira_en) < new Date() };
    });
  },

  async restaurarDesdePapelera(id) {
    const entrada = await api.obtenerEntradaPapelera(id);
    if (!entrada) return null;
    if (entrada.expired) return { error: 'expired', message: 'El período de recuperación ha expirado' };

    if (isPg) {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        const d = entrada.data;

        // Verificar que el email no esté en uso
        const existing = await client.query('SELECT id FROM usuarios WHERE email=$1', [entrada.email_usuario]);
        if (existing.rows.length > 0) {
          await client.query('ROLLBACK');
          return { error: 'email_in_use', message: 'El email ya está registrado por otro usuario' };
        }

        // Restaurar usuario
        const user = entrada.user;
        await client.query(
          `INSERT INTO usuarios (id,email,hash_contrasena,nombre_mostrado,role,url_avatar,informacion_contacto,created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [user.id, user.email, user.hash_contrasena, user.nombre_mostrado, user.role,
           user.url_avatar, user.informacion_contacto, user.created_at]);

        // Restaurar datos
        for (const f of (d.favoritos || [])) {
          await client.query('INSERT INTO favoritos (id,usuario_id,libro_id,created_at) VALUES ($1,$2,$3,$4)',
            [f.id, f.usuario_id, f.libro_id, f.created_at]).catch(e => console.warn('restore:', e.message));
        }
        for (const r of (d.calificaciones || [])) {
          await client.query('INSERT INTO calificaciones (id,usuario_id,libro_id,puntuacion,created_at) VALUES ($1,$2,$3,$4,$5)',
            [r.id, r.usuario_id, r.libro_id, r.puntuacion, r.created_at]).catch(e => console.warn("restore:", e.message));
        }
        for (const c of (d.comentarios || [])) {
          await client.query('INSERT INTO comentarios (id,usuario_id,libro_id,capitulo_id,comentario_padre_id,contenido,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
            [c.id, c.usuario_id, c.libro_id, c.capitulo_id, c.comentario_padre_id, c.contenido, c.created_at]).catch(e => console.warn("restore:", e.message));
        }
        for (const bk of (d.marcadores || [])) {
          await client.query('INSERT INTO marcadores (id,usuario_id,libro_id,capitulo_id,indice_capitulo,posicion_desplazamiento,terminado,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
            [bk.id, bk.usuario_id, bk.libro_id, bk.capitulo_id, bk.indice_capitulo, bk.posicion_desplazamiento, bk.terminado, bk.created_at, bk.updated_at]).catch(e => console.warn("restore:", e.message));
        }
        for (const bv of (d.vistas_libro || [])) {
          await client.query('INSERT INTO vistas_libro (usuario_id,libro_id,created_at) VALUES ($1,$2,$3)',
            [bv.usuario_id, bv.libro_id, bv.created_at]).catch(e => console.warn("restore:", e.message));
        }
        for (const n of (d.notificaciones || [])) {
          await client.query('INSERT INTO notificaciones (id,usuario_id,tipo,contenido,es_leida,created_at) VALUES ($1,$2,$3,$4,$5,$6)',
            [n.id, n.usuario_id, n.tipo, n.contenido, n.es_leida, n.created_at]).catch(e => console.warn("restore:", e.message));
        }
        for (const ui of (d.imagenes_usuario || [])) {
          await client.query('INSERT INTO imagenes_usuario (id,usuario_id,ruta_almacenamiento,nombre_personalizado,orden_ordenamiento,created_at) VALUES ($1,$2,$3,$4,$5,$6)',
            [ui.id, ui.usuario_id, ui.ruta_almacenamiento, ui.nombre_personalizado, ui.orden_ordenamiento, ui.created_at]).catch(e => console.warn("restore:", e.message));
        }
        for (const col of (d.colecciones || [])) {
          await client.query('INSERT INTO colecciones (id,propietario_id,titulo,descripcion,es_publica,created_at) VALUES ($1,$2,$3,$4,$5,$6)',
            [col.id, col.propietario_id, col.titulo, col.descripcion, col.es_publica, col.created_at]).catch(e => console.warn("restore:", e.message));
        }
        for (const cb of (d.libros_coleccion || [])) {
          await client.query('INSERT INTO libros_coleccion (coleccion_id,libro_id) VALUES ($1,$2)',
            [cb.coleccion_id, cb.libro_id]).catch(e => console.warn("restore:", e.message));
        }
        for (const book of (d.libros || [])) {
          await client.query(
            `INSERT INTO libros (id,titulo,subtitulo,descripcion,autor_id,estado,es_gratis,precio_centavos,
                                categoria,grupo_edad,url_portada,archivo_original,original_publico,
                                conteo_favoritos,vistas,created_at,updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
            [book.id, book.titulo, book.subtitulo, book.descripcion, book.autor_id, book.estado,
             book.es_gratis, book.precio_centavos, book.categoria, book.grupo_edad, book.url_portada,
             book.archivo_original, book.original_publico, book.conteo_favoritos, book.vistas,
             book.created_at, book.updated_at]).catch(e => console.warn("restore:", e.message));
        }
        for (const ch of (d.capitulos || [])) {
          await client.query(
            `INSERT INTO capitulos (id,libro_id,titulo,contenido,"orden",es_acceso_anticipado,created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [ch.id, ch.libro_id, ch.titulo, ch.contenido, ch.orden, ch.es_acceso_anticipado, ch.created_at]).catch(e => console.warn("restore:", e.message));
        }

        // Quitar de usuarios_baneados (ya no está eliminado)
        await client.query('DELETE FROM usuarios_baneados WHERE email=$1', [entrada.email_usuario]);

        // Eliminar entrada de papelera
        await client.query('DELETE FROM papelera WHERE id=$1', [id]);

        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK'); throw e; }
      finally { client.release(); }
      return { restored: true, email_usuario: entrada.email_usuario };
    }

    return withDb(db => {
      const d = entrada.data;

      // Verificar email no en uso
      if (db.usuarios.some(u => u.email.toLowerCase() === entrada.email_usuario.toLowerCase())) {
        return { error: 'email_in_use', message: 'El email ya está registrado por otro usuario' };
      }

      // Restaurar usuario
      db.usuarios.push(entrada.user);

      // Restaurar datos
      for (const item of (d.favoritos || [])) {
        if (!db.favoritos.some(x => x.usuario_id === item.usuario_id && x.libro_id === item.libro_id)) {
          db.favoritos.push(item);
        }
      }
      for (const item of (d.calificaciones || [])) {
        if (!db.calificaciones.some(x => x.usuario_id === item.usuario_id && x.libro_id === item.libro_id)) {
          db.calificaciones.push(item);
        }
      }
      for (const item of (d.comentarios || [])) {
        if (!db.comentarios.some(x => x.id === item.id)) {
          db.comentarios.push(item);
        }
      }
      for (const item of (d.marcadores || [])) {
        if (!(db.marcadores || []).some(x => x.id === item.id)) {
          if (!db.marcadores) db.marcadores = [];
          db.marcadores.push(item);
        }
      }
      for (const item of (d.vistas_libro || [])) {
        if (!(db.vistas_libro || []).some(x => x.usuario_id === item.usuario_id && x.libro_id === item.libro_id)) {
          if (!db.vistas_libro) db.vistas_libro = [];
          db.vistas_libro.push(item);
        }
      }
      for (const item of (d.notificaciones || [])) {
        if (!(db.notificaciones || []).some(x => x.id === item.id)) {
          if (!db.notificaciones) db.notificaciones = [];
          db.notificaciones.push(item);
        }
      }
      for (const item of (d.imagenes_usuario || [])) {
        if (!(db.imagenes_usuario || []).some(x => x.id === item.id)) {
          if (!db.imagenes_usuario) db.imagenes_usuario = [];
          db.imagenes_usuario.push(item);
        }
      }
      for (const item of (d.colecciones || [])) {
        if (!(db.colecciones || []).some(x => x.id === item.id)) {
          if (!db.colecciones) db.colecciones = [];
          db.colecciones.push(item);
        }
      }
      for (const item of (d.libros_coleccion || [])) {
        if (!(db.libros_coleccion || []).some(x => x.coleccion_id === item.coleccion_id && x.libro_id === item.libro_id)) {
          if (!db.libros_coleccion) db.libros_coleccion = [];
          db.libros_coleccion.push(item);
        }
      }
      for (const item of (d.libros || [])) {
        if (!db.libros.some(x => x.id === item.id)) {
          db.libros.push(item);
        }
      }
      for (const item of (d.capitulos || [])) {
        if (!db.capitulos.some(x => x.id === item.id)) {
          db.capitulos.push(item);
        }
      }
      for (const item of (d.favoritos_en_libros || [])) {
        if (!db.favoritos.some(x => x.usuario_id === item.usuario_id && x.libro_id === item.libro_id)) {
          db.favoritos.push(item);
        }
      }
      for (const item of (d.calificaciones_en_libros || [])) {
        if (!db.calificaciones.some(x => x.usuario_id === item.usuario_id && x.libro_id === item.libro_id)) {
          db.calificaciones.push(item);
        }
      }
      for (const item of (d.comentarios_en_libros || [])) {
        if (!db.comentarios.some(x => x.id === item.id)) {
          db.comentarios.push(item);
        }
      }
      for (const item of (d.vistas_libro_en_libros || [])) {
        if (!(db.vistas_libro || []).some(x => x.usuario_id === item.usuario_id && x.libro_id === item.libro_id)) {
          if (!db.vistas_libro) db.vistas_libro = [];
          db.vistas_libro.push(item);
        }
      }

      // Quitar de usuarios_baneados
      const banIdx = db.usuarios_baneados.findIndex(b => b.email.toLowerCase() === entrada.email_usuario.toLowerCase());
      if (banIdx !== -1) db.usuarios_baneados.splice(banIdx, 1);

      // Eliminar entrada de papelera
      db.papelera = (db.papelera || []).filter(t => t.id !== id);

      return { restored: true, email_usuario: entrada.email_usuario };
    });
  },

  async eliminarPermanentePapelera(id) {
    if (isPg) {
      await pgQuery('DELETE FROM papelera WHERE id=$1', [id]);
      return { deleted: true };
    }
    return withDb(db => {
      const before = (db.papelera || []).length;
      db.papelera = (db.papelera || []).filter(t => t.id !== id);
      return { deleted: before !== (db.papelera || []).length };
    });
  },

  async limpiarPapeleraExpirada() {
    if (isPg) {
      const r = await pgPool.query('DELETE FROM papelera WHERE expira_en < now()');
      return { deleted: r.rowCount || 0 };
    }
    return withDb(db => {
      if (!db.papelera) return { deleted: 0 };
      const before = db.papelera.length;
      db.papelera = db.papelera.filter(t => new Date(t.expira_en) > new Date());
      return { deleted: before - db.papelera.length };
    });
  },

  // ---- BOOKS ----
  async listarLibros({ categoria, grupo_edad, q, autor_id, estado='publicado', limit=50, offset=0 } = {}) {
    if (isPg) {
      const where = []; const params=[];
      if (estado && estado !== 'all') { params.push(estado); where.push(`estado=$${params.length}`); }
      if (categoria)  { params.push(categoria);  where.push(`categoria=$${params.length}`); }
      if (grupo_edad) { params.push(grupo_edad); where.push(`grupo_edad=$${params.length}`); }
      if (q) { const sq = q.replace(/[%_\\]/g, '\\$&'); params.push('%'+sq+'%'); where.push(`(titulo ILIKE $${params.length} ESCAPE '\\' OR descripcion ILIKE $${params.length} ESCAPE '\\')`); }
      if (autor_id) { params.push(autor_id); where.push(`autor_id=$${params.length}`); }
      params.push(limit); params.push(offset);
      const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
      return await pgQuery(
        `SELECT b.*, u.nombre_mostrado AS nombre_autor FROM libros b
           JOIN usuarios u ON u.id = b.autor_id
          ${whereClause}
          ORDER BY b.vistas DESC, b.created_at DESC
          LIMIT $${params.length-1} OFFSET $${params.length}`, params);
    }
    const db = loadJson();
    let arr = db.libros;
    if (estado && estado !== 'all') arr = arr.filter(b => b.estado === estado);
    if (categoria)  arr = arr.filter(b => b.categoria === categoria);
    if (grupo_edad) arr = arr.filter(b => b.grupo_edad === grupo_edad);
    if (autor_id) arr = arr.filter(b => b.autor_id === autor_id);
    if (q) {
      const qq = q.toLowerCase();
      arr = arr.filter(b => (b.titulo||'').toLowerCase().includes(qq) ||
                            (b.descripcion||'').toLowerCase().includes(qq));
    }
    arr = arr.sort((a,b) => (b.vistas||0)-(a.vistas||0)).slice(offset, offset+limit);
    return arr.map(b => ({
      ...b,
      nombre_autor: (db.usuarios.find(u => u.id===b.autor_id)||{}).nombre_mostrado
    }));
  },
  async obtenerLibro(id) {
    if (isPg) {
      const rows = await pgQuery(
        `SELECT b.*, u.nombre_mostrado AS nombre_autor FROM libros b
         JOIN usuarios u ON u.id=b.autor_id WHERE b.id=$1`, [id]);
      return rows[0] || null;
    }
    const db = loadJson();
    const b = db.libros.find(x => x.id === id);
    if (!b) return null;
    return { ...b, nombre_autor: (db.usuarios.find(u => u.id===b.autor_id)||{}).nombre_mostrado };
  },
  async incrementarVistas(id, userId) {
    if (isPg) {
      if (userId) {
        const existing = await pgQuery(
          `SELECT 1 FROM vistas_libro WHERE usuario_id=$1 AND libro_id=$2`, [userId, id]);
        if (existing.length > 0) return;
        await pgQuery(`INSERT INTO vistas_libro (usuario_id,libro_id) VALUES ($1,$2)`, [userId, id]);
      }
      await pgQuery('UPDATE libros SET vistas=vistas+1 WHERE id=$1', [id]);
      return;
    }
    await withDb(db => {
      if (userId) {
        const existing = db.vistas_libro?.find(v => v.usuario_id === userId && v.libro_id === id);
        if (existing) return;
        if (!db.vistas_libro) db.vistas_libro = [];
        db.vistas_libro.push({ usuario_id: userId, libro_id: id, created_at: new Date().toISOString() });
      }
      const b = db.libros.find(x => x.id === id);
      if (b) b.vistas = (b.vistas||0) + 1;
    });
  },
  async restablecerVistasLibro(id) {
    if (isPg) {
      await pgQuery(`DELETE FROM vistas_libro WHERE libro_id=$1`, [id]);
      await pgQuery(`UPDATE libros SET vistas=0 WHERE id=$1`, [id]);
      return;
    }
    await withDb(db => {
      db.vistas_libro = (db.vistas_libro || []).filter(v => v.libro_id !== id);
      const b = db.libros.find(x => x.id === id);
      if (b) b.vistas = 0;
    });
  },
  async crearLibro(book) {
    const now = new Date().toISOString();
    const full = { ...book, id: book.id || uuidv4(), conteo_favoritos:0, vistas:0,
                   estado:'borrador', es_gratis:true, precio_centavos:0,
                   archivo_original:null, original_publico:false, url_portada:null,
                   created_at: now, updated_at: now };
    if (isPg) {
      await pgQuery(
        `INSERT INTO libros (id,titulo,subtitulo,descripcion,autor_id,estado,es_gratis,precio_centavos,
                            categoria,grupo_edad,url_portada,archivo_original,original_publico,
                            conteo_favoritos,vistas,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [full.id, full.titulo, full.subtitulo, full.descripcion, full.autor_id, full.estado,
         full.es_gratis, full.precio_centavos, full.categoria, full.grupo_edad, full.url_portada,
         full.archivo_original, full.original_publico, full.conteo_favoritos, full.vistas,
         full.created_at, full.updated_at]);
      return full;
    }
    return withDb(db => {
      db.libros.push(full);
      return full;
    });
  },
  async actualizarLibro(id, patch) {
    if (isPg) {
      const keys = Object.keys(patch); if (!keys.length) return await api.obtenerLibro(id);
      if (keys.some(k => !/^[a-z_]+$/.test(k))) throw new Error('Invalid column nombre');
      const sets = keys.map((k,i) => `"${k}"=$${i+1}`).join(',');
      await pgQuery(
        `UPDATE libros SET ${sets}, updated_at=now() WHERE id=$${keys.length+1}`,
        [...keys.map(k => patch[k]), id]);
      return await api.obtenerLibro(id);
    }
    return withDb(db => {
      const b = db.libros.find(x => x.id === id);
      if (!b) return null;
      Object.assign(b, patch); b.updated_at = new Date().toISOString();
      return b;
    });
  },
  async eliminarLibro(id) {
    if (isPg) { await pgQuery(`UPDATE libros SET estado='eliminado' WHERE id=$1`, [id]); return; }
    await withDb(db => {
      const b = db.libros.find(x => x.id === id);
      if (b) b.estado = 'eliminado';
    });
  },

  // ---- CHAPTERS ----
  async listarCapitulos(libro_id) {
    if (isPg) return await pgQuery(
      `SELECT * FROM capitulos WHERE libro_id=$1 ORDER BY "orden" ASC`, [libro_id]);
    return loadJson().capitulos.filter(c => c.libro_id === libro_id)
                              .sort((a,b) => (a.orden||0)-(b.orden||0));
  },
  async obtenerCapitulo(id) {
    if (isPg) { const r = await pgQuery(`SELECT * FROM capitulos WHERE id=$1`, [id]); return r[0] || null; }
    return loadJson().capitulos.find(c => c.id === id) || null;
  },
  async crearCapitulo(chapter) {
    const c = { id: chapter.id || uuidv4(), orden:1, es_acceso_anticipado:false,
                created_at: new Date().toISOString(), ...chapter };
    if (isPg) {
      await pgQuery(
        `INSERT INTO capitulos (id,libro_id,titulo,contenido,"orden",es_acceso_anticipado,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [c.id, c.libro_id, c.titulo, c.contenido, c.orden, c.es_acceso_anticipado, c.created_at]);
      return c;
    }
    return withDb(db => {
      db.capitulos.push(c);
      return c;
    });
  },
  async actualizarCapitulo(id, patch) {
    if (isPg) {
      const keys = Object.keys(patch); if (!keys.length) return;
      if (keys.some(k => !/^[a-z_]+$/.test(k))) throw new Error('Invalid column nombre');
      const sets = keys.map((k,i) => `"${k}"=$${i+1}`).join(',');
      await pgQuery(
        `UPDATE capitulos SET ${sets} WHERE id=$${keys.length+1}`,
        [...keys.map(k => patch[k]), id]);
      return;
    }
    await withDb(db => {
      const c = db.capitulos.find(x => x.id === id);
      if (c) Object.assign(c, patch);
    });
  },
  async eliminarCapitulo(id) {
    if (isPg) { await pgQuery(`DELETE FROM capitulos WHERE id=$1`, [id]); return; }
    await withDb(db => {
      db.capitulos = db.capitulos.filter(c => c.id !== id);
    });
  },

  // ---- FAVORITES / RATINGS / COMMENTS ----
  async alternarFavorito(usuario_id, libro_id) {
    if (isPg) {
      const r = await pgQuery(`
        WITH del AS (
          DELETE FROM favoritos WHERE usuario_id=$1 AND libro_id=$2 RETURNING id
        ),
        ins AS (
          INSERT INTO favoritos (usuario_id, libro_id)
          SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM del)
          RETURNING id
        )
        SELECT EXISTS (SELECT 1 FROM ins) AS favorited
      `, [usuario_id, libro_id]);
      const favorited = r[0]?.favorited || false;
      await pgQuery(
        `UPDATE libros SET conteo_favoritos = (SELECT COUNT(*)::int FROM favoritos WHERE libro_id=$1) WHERE id=$1`,
        [libro_id]);
      return { favorited };
    }
    return withDb(db => {
      const idx = db.favoritos.findIndex(f => f.usuario_id===usuario_id && f.libro_id===libro_id);
      const book = db.libros.find(b => b.id === libro_id);
      if (idx >= 0) {
        db.favoritos.splice(idx, 1);
        if (book) book.conteo_favoritos = Math.max(0, (book.conteo_favoritos||0)-1);
        return { favorited:false };
      }
      db.favoritos.push({ id: uuidv4(), usuario_id, libro_id, created_at: new Date().toISOString() });
      if (book) book.conteo_favoritos = (book.conteo_favoritos||0)+1;
      return { favorited:true };
    });
  },
  async obtenerFavorito(usuario_id, libro_id) {
    if (isPg) {
      const rows = await pgQuery(
        `SELECT id FROM favoritos WHERE usuario_id=$1 AND libro_id=$2`, [usuario_id, libro_id]);
      return { favorited: rows.length > 0 };
    }
    const db = loadJson();
    const exists = db.favoritos.some(f => f.usuario_id===usuario_id && f.libro_id===libro_id);
    return { favorited: exists };
  },
  async obtenerCalificacionUsuario(usuario_id, libro_id) {
    if (isPg) {
      const rows = await pgQuery(
        `SELECT puntuacion FROM calificaciones WHERE usuario_id=$1 AND libro_id=$2`, [usuario_id, libro_id]);
      return rows.length ? rows[0].puntuacion : 0;
    }
    const db = loadJson();
    const r = db.calificaciones.find(x => x.usuario_id===usuario_id && x.libro_id===libro_id);
    return r ? r.puntuacion : 0;
  },
  async calificarLibro(usuario_id, libro_id, puntuacion) {
    if (isPg) {
      await pgQuery(
        `INSERT INTO calificaciones (usuario_id,libro_id,puntuacion) VALUES ($1,$2,$3)
         ON CONFLICT (usuario_id,libro_id) DO UPDATE SET puntuacion=EXCLUDED.puntuacion`,
        [usuario_id, libro_id, puntuacion]);
      return;
    }
    await withDb(db => {
      let r = db.calificaciones.find(x => x.usuario_id===usuario_id && x.libro_id===libro_id);
      if (r) r.puntuacion = puntuacion;
      else db.calificaciones.push({ id: uuidv4(), usuario_id, libro_id, puntuacion,
                             created_at: new Date().toISOString() });
    });
  },
  async agregarComentario({ usuario_id, libro_id, capitulo_id, comentario_padre_id, contenido }) {
    const c = { id: uuidv4(), usuario_id, libro_id, capitulo_id: capitulo_id||null,
                comentario_padre_id: comentario_padre_id||null, contenido,
                created_at: new Date().toISOString() };
    if (isPg) {
      await pgQuery(
        `INSERT INTO comentarios (id,usuario_id,libro_id,capitulo_id,comentario_padre_id,contenido)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [c.id, c.usuario_id, c.libro_id, c.capitulo_id, c.comentario_padre_id, c.contenido]);
      return c;
    }
    return withDb(db => {
      db.comentarios.push(c);
      return c;
    });
  },
  async listarComentarios(libro_id) {
    if (isPg) return await pgQuery(
      `SELECT c.*, u.nombre_mostrado AS nombre_autor, u.url_avatar AS avatar_autor
         FROM comentarios c
         JOIN usuarios u ON u.id=c.usuario_id
        WHERE c.libro_id=$1 ORDER BY c.created_at ASC`, [libro_id]);
    const db = loadJson();
    return db.comentarios.filter(c => c.libro_id === libro_id)
      .map(c => {
        const u = db.usuarios.find(u => u.id === c.usuario_id) || {};
        return { ...c, nombre_autor: u.nombre_mostrado, avatar_autor: u.url_avatar };
      });
  },
  async obtenerComentario(comment_id) {
    if (isPg) return (await pgQuery('SELECT * FROM comentarios WHERE id=$1', [comment_id]))[0] || null;
    const db = loadJson();
    return db.comentarios.find(c => c.id === comment_id) || null;
  },
  async eliminarComentario(comment_id) {
    if (isPg) {
      await pgQuery('DELETE FROM comentarios WHERE id=$1 OR comentario_padre_id=$1', [comment_id]);
      return;
    }
    await withDb(db => {
      const ids = new Set([comment_id]);
      for (const c of db.comentarios) if (c.comentario_padre_id === comment_id) ids.add(c.id);
      db.comentarios = db.comentarios.filter(c => !ids.has(c.id));
    });
  },

  // ---- ANUNCIOS ----
  async listarAnuncios() {
    if (isPg) {
      return await pgQuery(
        `SELECT a.id, a.admin_id, a.titulo, a.contenido,
                a.ruta_imagen AS "rutaImagen", a.visible, a.destacado,
                a.publicado_por AS "publicadoPor", a.created_at,
                COALESCE(u.nombre_mostrado, a.autor_nombre) AS "autorNombre",
                COALESCE(u.role, a.autor_rol, 'admin') AS "autorRol"
           FROM anuncios a
           LEFT JOIN usuarios u ON u.id = a.admin_id
          WHERE a.visible=true
          ORDER BY a.destacado DESC, a.created_at DESC`);
    }
    const db = loadJson();
    let arr = db.anuncios.filter(a => a.visible);
    arr = arr.sort((a,b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0)
                  || b.created_at.localeCompare(a.created_at));
    return arr.map(a => ({
      ...a,
      rutaImagen: a.ruta_imagen || null,
      autorNombre: a.autorNombre || (db.usuarios.find(u => u.id === a.admin_id)||{}).nombre_mostrado,
      autorRol: a.autorRol || 'admin'
    }));
  },
  async crearAnuncio({ admin_id, titulo, contenido, ruta_imagen, autorNombre, autorRol }) {
    const a = { id: uuidv4(), admin_id, titulo, contenido,
                ruta_imagen: ruta_imagen||null, visible:true,
                autorNombre: autorNombre||null,
                autorRol: autorRol||'admin',
                publicadoPor: null, destacado: false,
                created_at: new Date().toISOString() };
    if (isPg) {
      await pgQuery(
        `INSERT INTO anuncios (id,admin_id,titulo,contenido,ruta_imagen,visible,
                                     autor_nombre,autor_rol,publicado_por,destacado)
         VALUES ($1,$2,$3,$4,$5,true,$6,$7,$8,false)`,
        [a.id, a.admin_id, a.titulo, a.contenido, a.ruta_imagen,
         a.autorNombre, a.autorRol, a.publicadoPor]);
      return a;
    }
    return withDb(db => {
      db.anuncios.push(a);
      return a;
    });
  },

  async obtenerAnuncio(id) {
    if (isPg) {
      const r = (await pgQuery(
        `SELECT a.id, a.admin_id, a.titulo, a.contenido, a.ruta_imagen AS "rutaImagen",
                a.visible, a.destacado, a.publicado_por AS "publicadoPor", a.created_at,
                u.nombre_mostrado AS "autorNombre", u.role AS "autorRol"
           FROM anuncios a
           LEFT JOIN usuarios u ON u.id = a.admin_id
           WHERE a.id=$1`, [id]))[0];
      return r || null;
    }
    const db = loadJson();
    const a = db.anuncios.find(x => x.id === id);
    if (!a) return null;
    return { ...a, rutaImagen: a.ruta_imagen || null };
  },

  async eliminarAnuncio(id) {
    if (isPg) { await pgQuery(`UPDATE anuncios SET visible=false WHERE id=$1`, [id]); return; }
    await withDb(db => {
      const a = db.anuncios.find(x => x.id === id);
      if (a) a.visible = false;
    });
  },
  async alternarDestacado(id) {
    if (isPg) {
      const rows = await pgQuery(`SELECT destacado FROM anuncios WHERE id=$1`, [id]);
      if (!rows.length) return;
      const [{ destacado }] = rows;
      if (destacado) {
        await pgQuery(`UPDATE anuncios SET destacado=false WHERE id=$1`, [id]);
      } else {
        await pgQuery(`UPDATE anuncios SET destacado=false WHERE destacado=true`);
        await pgQuery(`UPDATE anuncios SET destacado=true WHERE id=$1`, [id]);
      }
      return;
    }
    await withDb(db => {
      const actualDestacado = db.anuncios.find(a => a.destacado);
      if (actualDestacado && actualDestacado.id === id) {
        for (const a of db.anuncios) a.destacado = false;
      } else {
        for (const a of db.anuncios) a.destacado = a.id === id;
      }
    });
  },
  async actualizarAnuncio(id, { titulo, contenido, ruta_imagen }) {
    if (isPg) {
      await pgQuery(`UPDATE anuncios SET titulo=$1, contenido=$2, ruta_imagen=$3 WHERE id=$4`, [titulo, contenido, ruta_imagen, id]);
      return;
    }
    await withDb(db => {
      const a = db.anuncios.find(x => x.id === id);
      if (a) { a.titulo = titulo; a.contenido = contenido; a.ruta_imagen = ruta_imagen; }
    });
  },
  async definirPublicadoPor(id, texto) {
    if (isPg) { await pgQuery(`UPDATE anuncios SET publicado_por=$1 WHERE id=$2`, [texto, id]); return; }
    await withDb(db => {
      const a = db.anuncios.find(x => x.id === id);
      if (a) a.publicadoPor = texto;
    });
  },

  // ---- METRICS (honestas: derivadas en vivo) ----
  async obtenerMetricas() {
    if (isPg) {
      const [{ count: authors }] = await pgQuery(
        `SELECT count(DISTINCT autor_id)::int AS count FROM libros WHERE estado='publicado'`);
      const [{ count: libros }] = await pgQuery(
        `SELECT count(*)::int AS count FROM libros WHERE estado='publicado'`);
      const [{ sum: vistas }] = await pgQuery(
        `SELECT COALESCE(sum(vistas),0)::int AS sum FROM libros WHERE estado='publicado'`);
      return { autores_total: authors, libros_total: libros, vistas_total: vistas };
    }
    const db = loadJson();
    const published = db.libros.filter(b => b.estado === 'publicado');
    const authors   = new Set(published.map(b => b.autor_id)).size;
    const libros     = published.length;
    const vistas     = published.reduce((s,b) => s + (b.vistas||0), 0);
    return { autores_total: authors, libros_total: libros, vistas_total: vistas };
  },

  // ---- BAN / BLACKLIST ----
  async emailEstaBaneado(email) {
    if (isPg) {
      const r = await pgQuery(
        `SELECT * FROM usuarios_baneados WHERE LOWER(email)=LOWER($1) AND unbanned_at IS NULL`, [email]);
      return r[0] || null;
    }
    return loadJson().usuarios_baneados.find(b => b.email.toLowerCase()===email.toLowerCase() && !b.unbanned_at) || null;
  },
  async listarBaneados() {
    if (isPg) {
      const rows = await pgQuery(`SELECT * FROM usuarios_baneados ORDER BY banned_at DESC`);
      return this._agruparRegistrosBaneo(rows);
    }
    const rows = loadJson().usuarios_baneados.slice().sort((a,b)=>b.banned_at.localeCompare(a.banned_at));
    return this._agruparRegistrosBaneo(rows);
  },
  _agruparRegistrosBaneo(rows) {
    const byEmail = {};
    for (const r of rows) {
      const key = r.email.toLowerCase();
      if (!byEmail[key]) byEmail[key] = { email: r.email, bans: [] };
      byEmail[key].bans.push(r);
    }
    return Object.values(byEmail).sort((a,b) => {
      const aLast = Math.max(...a.bans.map(x => new Date(x.banned_at).getTime()));
      const bLast = Math.max(...b.bans.map(x => new Date(x.banned_at).getTime()));
      return bLast - aLast;
    });
  },
  async banearUsuario({ email, razon, banned_by }) {
    if (isPg) {
      await pgQuery(
        `INSERT INTO usuarios_baneados (email,razon,banned_at,banned_by) VALUES ($1,$2,now(),$3)`,
        [email, razon, banned_by || null]);
      await pgQuery(`UPDATE usuarios SET role='user' WHERE email=$1 AND role='moderator'`, [email]);
      return;
    }
    await withDb(db => {
      db.usuarios_baneados.push({ id: uuidv4(), email, razon,
                              banned_by: banned_by || null,
                              apelacion: null, apelacion_enviada: false,
                              banned_at: new Date().toISOString(), unbanned_at: null });
      const u = db.usuarios.find(x => x.email.toLowerCase()===email.toLowerCase() && x.role === 'moderator');
      if (u) u.role = 'user';
    });
  },
  async unbanearUsuario(email, unbanned_by) {
    if (isPg) {
      await pgQuery(
        `UPDATE usuarios_baneados SET unbanned_at=now(), unbanned_by=$2
         WHERE email=$1 AND unbanned_at IS NULL`,
        [email, unbanned_by || null]);
      return;
    }
    await withDb(db => {
      const b = db.usuarios_baneados.find(x => x.email.toLowerCase()===email.toLowerCase() && !x.unbanned_at);
      if (b) {
        b.unbanned_at = new Date().toISOString();
        b.unbanned_by = unbanned_by || null;
      }
    });
  },
  async eliminarRegistroBaneo(email) {
    if (isPg) {
      await pgQuery(`DELETE FROM usuarios_baneados WHERE email=$1`, [email]);
      return;
    }
    await withDb(db => {
      db.usuarios_baneados = db.usuarios_baneados.filter(x => x.email.toLowerCase() !== email.toLowerCase());
    });
  },
  async enviarApelacion(email, apelacion) {
    if (isPg) {
      await pgQuery(
        `UPDATE usuarios_baneados SET apelacion=$1, apelacion_enviada=true
         WHERE email=$2 AND unbanned_at IS NULL`,
        [apelacion, email]);
      return;
    }
    await withDb(db => {
      const b = db.usuarios_baneados.find(x => x.email.toLowerCase()===email.toLowerCase() && !x.unbanned_at);
      if (b) { b.apelacion = apelacion; b.apelacion_enviada = true; }
    });
  },
  async agregarTokenListaNegra(token, email_usuario) {
    if (isPg) {
      await pgQuery(
        `INSERT INTO lista_negra_tokens (token,email_usuario) VALUES ($1,$2)
         ON CONFLICT (token) DO NOTHING`, [token, email_usuario]);
      return;
    }
    await withDb(db => {
      if (!db.lista_negra_tokens.find(t => t.token === token)) {
        db.lista_negra_tokens.push({ id: uuidv4(), token, email_usuario,
                                  blacklisted_at: new Date().toISOString() });
      }
    });
  },
  async tokenEstaEnListaNegra(token) {
    if (isPg) {
      const r = await pgQuery(`SELECT 1 FROM lista_negra_tokens WHERE token=$1`, [token]);
      return r.length > 0;
    }
    return withDb(db => {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      db.lista_negra_tokens = db.lista_negra_tokens.filter(t => !t.blacklisted_at || new Date(t.blacklisted_at).getTime() > cutoff);
      return db.lista_negra_tokens.some(t => t.token === token);
    });
  },
  async limpiarListaNegra() {
    if (isPg) {
      await pgQuery(`DELETE FROM lista_negra_tokens WHERE blacklisted_at < NOW() - INTERVAL '14 days'`);
      return;
    }
    await withDb(db => {
      const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
      db.lista_negra_tokens = db.lista_negra_tokens.filter(t => !t.blacklisted_at || new Date(t.blacklisted_at).getTime() > cutoff);
    });
  },
  async agregarTokensUsuarioAListaNegra(email) {
    // En la práctica: marcamos un email como "todos los tokens emitidos antes de
    // este instante son inválidos". Se persiste como entrada especial en blacklist.
    if (isPg) {
      await pgQuery(
        `INSERT INTO lista_negra_tokens (token,email_usuario) VALUES ($1,$2)
         ON CONFLICT (token) DO NOTHING`,
        ['*all-before-'+Date.now(), email]);
      return;
    }
    await withDb(db => {
      db.lista_negra_tokens.push({ id: uuidv4(), token:'*all-before-'+Date.now(),
                                email_usuario: email,
                                blacklisted_at: new Date().toISOString() });
    });
  },
  async tokensUsuarioInvalidadosDespuesDe(email) {
    if (isPg) {
      const r = await pgQuery(
        `SELECT MAX(blacklisted_at) AS ts FROM lista_negra_tokens
         WHERE LOWER(email_usuario)=LOWER($1) AND token LIKE '*all-before-%'`, [email]);
      return r[0] && r[0].ts ? new Date(r[0].ts).getTime() : 0;
    }
    const db = loadJson();
    const tokens = db.lista_negra_tokens.filter(t => t.email_usuario.toLowerCase()===email.toLowerCase() && t.token.startsWith('*all-before-'));
    if (!tokens.length) return 0;
    return Math.max(...tokens.map(t => new Date(t.blacklisted_at).getTime()));
  },

  // ---- REFRESH TOKENS ----
  async crearTokenRefresco(usuario_id) {
    const token = uuidv4();
    const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
    const entrada = { id: uuidv4(), usuario_id, token, expires_at, created_at: new Date().toISOString(), used_at: null };
    if (isPg) {
      await pgQuery(
        `INSERT INTO tokens_refresco (id,usuario_id,token,expires_at) VALUES ($1,$2,$3,$4)`,
        [entrada.id, entrada.usuario_id, entrada.token, entrada.expires_at]);
      return token;
    }
    return withDb(db => {
      if (!db.tokens_refresco) db.tokens_refresco = [];
      db.tokens_refresco.push(entrada);
      return token;
    });
  },
  async validarTokenRefresco(token) {
    if (isPg) {
      const r = await pgQuery(
        `SELECT * FROM tokens_refresco WHERE token=$1 AND used_at IS NULL AND expires_at > now()`,
        [token]);
      return r[0] || null;
    }
    return withDb(db => {
      const now = new Date();
      if (db.tokens_refresco)
        db.tokens_refresco = db.tokens_refresco.filter(t => !t.used_at && new Date(t.expires_at) > now);
      return db.tokens_refresco?.find(t => t.token === token && !t.used_at) || null;
    });
  },
  async revocarTokenRefresco(token) {
    if (isPg) {
      await pgQuery(`UPDATE tokens_refresco SET used_at=now() WHERE token=$1 AND used_at IS NULL`, [token]);
      return;
    }
    await withDb(db => {
      const t = db.tokens_refresco?.find(x => x.token === token);
      if (t) t.used_at = new Date().toISOString();
    });
  },
  async validarYRevocarTokenRefresco(token) {
    if (isPg) {
      const r = await pgQuery(
        `UPDATE tokens_refresco SET used_at=now()
         WHERE token=$1 AND used_at IS NULL AND expires_at > now()
         RETURNING *`,
        [token]);
      return r[0] || null;
    }
    return withDb(db => {
      const now = new Date();
      if (db.tokens_refresco)
        db.tokens_refresco = db.tokens_refresco.filter(t => !t.used_at && new Date(t.expires_at) > now);
      const t = db.tokens_refresco?.find(x => x.token === token && !x.used_at);
      if (t) { t.used_at = new Date().toISOString(); return t; }
      return null;
    });
  },
  async revocarTokensRefrescoUsuario(usuario_id) {
    if (isPg) {
      await pgQuery(`UPDATE tokens_refresco SET used_at=now() WHERE usuario_id=$1 AND used_at IS NULL`, [usuario_id]);
      return;
    }
    await withDb(db => {
      for (const t of (db.tokens_refresco || [])) {
        if (t.usuario_id === usuario_id && !t.used_at) t.used_at = new Date().toISOString();
      }
    });
  },

  // ---- AUTHORS (solo usuarios CON libros publicados) ----
  async buscarAutores(q) {
    if (isPg) {
      return await pgQuery(
        `SELECT u.id, u.email, u.nombre_mostrado, u.url_avatar, u.created_at,
                COUNT(b.id)::int AS conteo_libros
         FROM usuarios u
         JOIN libros b ON b.autor_id = u.id AND b.estado = 'publicado'
         WHERE ($1 = '' OR u.nombre_mostrado ILIKE '%' || $1 || '%' ESCAPE '\' OR u.email ILIKE '%' || $1 || '%' ESCAPE '\')
         GROUP BY u.id
         ORDER BY conteo_libros DESC`,
        [q ? q.replace(/[%_\\]/g, '\\$&') : '']
      );
    }
    const db = loadJson();
    const published = db.libros.filter(b => b.estado === 'publicado');
    const authorIds = [...new Set(published.map(b => b.autor_id))];
    let authors = db.usuarios.filter(u => authorIds.includes(u.id));
    if (q) {
      const qq = q.toLowerCase();
      authors = authors.filter(u =>
        (u.nombre_mostrado || '').toLowerCase().includes(qq) ||
        u.email.toLowerCase().includes(qq)
      );
    }
    return authors.map(u => ({
      id: u.id, email: u.email, nombre_mostrado: u.nombre_mostrado,
      url_avatar: u.url_avatar, created_at: u.created_at,
      conteo_libros: published.filter(b => b.autor_id === u.id).length
    })).sort((a, b) => b.conteo_libros - a.conteo_libros);
  },

  // ---- MODERATION LOG ----
  async registrarModeracion({ email_actor, accion, objetivo, ip }) {
    if (isPg) {
      await pgQuery(
        `INSERT INTO registros_moderacion (email_actor,accion,objetivo,ip)
         VALUES ($1,$2,$3,$4)`, [email_actor, accion, objetivo, ip]);
      return;
    }
    await withDb(db => {
      db.registros_moderacion.push({ id: uuidv4(), email_actor, accion, objetivo, ip,
                                created_at: new Date().toISOString() });
    });
  },

  // ---- CATEGORIES ----
  async listarCategorias() {
    if (isPg) return (await pgQuery('SELECT nombre FROM categorias ORDER BY nombre')).map(r => r.nombre);
    return withDb(db => {
      if (!db.categorias) db.categorias = ['fantasía','poesía','narrativa','educativa'];
      return db.categorias;
    });
  },
  async crearCategoria(nombre) {
    if (isPg) { await pgQuery('INSERT INTO categorias (nombre) VALUES ($1) ON CONFLICT DO NOTHING', [nombre]); return; }
    await withDb(db => {
      if (!db.categorias) db.categorias = [];
      if (!db.categorias.includes(nombre)) db.categorias.push(nombre);
    });
  },
  async eliminarCategoria(nombre) {
    if (isPg) {
      const cats = await pgQuery('SELECT 1 FROM categorias WHERE nombre=$1', [nombre]);
      if (cats.length === 0) return false;
      await pgQuery(`UPDATE libros SET categoria='en espera de categorización' WHERE categoria=$1`, [nombre]);
      await pgQuery('DELETE FROM categorias WHERE nombre=$1', [nombre]);
      return true;
    }
    let found = false;
    await withDb(db => {
      const before = (db.categorias || []).length;
      db.categorias = (db.categorias || []).filter(c => c !== nombre);
      found = db.categorias.length < before;
      for (const b of db.libros) {
        if (b.categoria === nombre) b.categoria = 'en espera de categorización';
      }
    });
    return found;
  },

  // ---- BOOKMARKS ----
  async listarMarcadores(usuario_id) {
    if (isPg) {
      return await pgQuery(
        `SELECT b.*, bk.indice_capitulo, bk.posicion_desplazamiento, bk.terminado, bk.updated_at AS marked_at,
                bk.id AS bk_id
         FROM marcadores bk
         JOIN libros b ON b.id = bk.libro_id
         WHERE bk.usuario_id=$1 AND b.estado!='eliminado'
         ORDER BY bk.updated_at DESC`, [usuario_id]);
    }
    const db = loadJson();
    return (db.marcadores || [])
      .filter(bk => bk.usuario_id === usuario_id)
      .map(bk => {
        const book = db.libros.find(b => b.id === bk.libro_id);
        if (!book || book.estado === 'eliminado') return null;
        return { ...book, indice_capitulo: bk.indice_capitulo, posicion_desplazamiento: bk.posicion_desplazamiento,
                       terminado: bk.terminado, marked_at: bk.updated_at, bk_id: bk.id };
      })
      .filter(Boolean)
      .sort((a, b) => b.marked_at.localeCompare(a.marked_at));
  },
  async obtenerMarcador(usuario_id, libro_id) {
    if (isPg) {
      return (await pgQuery('SELECT * FROM marcadores WHERE usuario_id=$1 AND libro_id=$2',
        [usuario_id, libro_id]))[0] || null;
    }
    const db = loadJson();
    return (db.marcadores || []).find(bk => bk.usuario_id === usuario_id && bk.libro_id === libro_id) || null;
  },
  async upsertarMarcador({ usuario_id, libro_id, capitulo_id, indice_capitulo, posicion_desplazamiento, terminado }) {
    const now = new Date().toISOString();
    if (isPg) {
      await pgQuery(
        `INSERT INTO marcadores (usuario_id, libro_id, capitulo_id, indice_capitulo, posicion_desplazamiento, terminado, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7)
         ON CONFLICT (usuario_id, libro_id) DO UPDATE
         SET capitulo_id=EXCLUDED.capitulo_id,
             indice_capitulo=EXCLUDED.indice_capitulo,
             posicion_desplazamiento=EXCLUDED.posicion_desplazamiento,
             terminado=EXCLUDED.terminado,
             updated_at=EXCLUDED.updated_at`,
        [usuario_id, libro_id, capitulo_id || null, indice_capitulo, posicion_desplazamiento, !!terminado, now]);
      return;
    }
    await withDb(db => {
      if (!db.marcadores) db.marcadores = [];
      const existing = db.marcadores.find(bk => bk.usuario_id === usuario_id && bk.libro_id === libro_id);
      if (existing) {
        existing.capitulo_id = capitulo_id || null;
        existing.indice_capitulo = indice_capitulo;
        existing.posicion_desplazamiento = posicion_desplazamiento;
        existing.terminado = !!terminado;
        existing.updated_at = now;
      } else {
        db.marcadores.push({ id: uuidv4(), usuario_id, libro_id, capitulo_id: capitulo_id || null,
                            indice_capitulo, posicion_desplazamiento, terminado: !!terminado,
                            created_at: now, updated_at: now });
      }
    });
  },
  async marcarTerminado(usuario_id, libro_id, terminado) {
    const now = new Date().toISOString();
    if (isPg) {
      await pgQuery(
        `UPDATE marcadores SET terminado=$1, updated_at=$2 WHERE usuario_id=$3 AND libro_id=$4`,
        [!!terminado, now, usuario_id, libro_id]);
      return;
    }
    await withDb(db => {
      const bk = (db.marcadores || []).find(x => x.usuario_id === usuario_id && x.libro_id === libro_id);
      if (bk) { bk.terminado = !!terminado; bk.updated_at = now; }
    });
  },
  async eliminarMarcador(usuario_id, libro_id) {
    if (isPg) {
      await pgQuery('DELETE FROM marcadores WHERE usuario_id=$1 AND libro_id=$2', [usuario_id, libro_id]);
      return;
    }
    await withDb(db => {
      db.marcadores = (db.marcadores || []).filter(bk => !(bk.usuario_id === usuario_id && bk.libro_id === libro_id));
    });
  },

  // ---- USER IMAGES (media library) ----
  async listarImagenesUsuario(usuario_id) {
    if (isPg) return await pgQuery('SELECT * FROM imagenes_usuario WHERE usuario_id=$1 ORDER BY orden_ordenamiento ASC', [usuario_id]);
    return (loadJson().imagenes_usuario || []).filter(i => i.usuario_id === usuario_id).sort((a,b) => (a.orden_ordenamiento||0)-(b.orden_ordenamiento||0));
  },
  async crearImagenUsuario({ usuario_id, ruta_almacenamiento, nombre_personalizado, orden_ordenamiento }) {
    const id = uuidv4();
    const now = new Date().toISOString();
    if (isPg) {
      await pgQuery(
        'INSERT INTO imagenes_usuario (id,usuario_id,ruta_almacenamiento,nombre_personalizado,orden_ordenamiento,created_at) VALUES ($1,$2,$3,$4,$5,$6)',
        [id, usuario_id, ruta_almacenamiento, nombre_personalizado, orden_ordenamiento ?? 0, now]);
      return { id, usuario_id, ruta_almacenamiento, nombre_personalizado, orden_ordenamiento: orden_ordenamiento ?? 0, created_at: now };
    }
    const img = { id, usuario_id, ruta_almacenamiento, nombre_personalizado, orden_ordenamiento: orden_ordenamiento ?? 0, created_at: new Date().toISOString() };
    return withDb(db => {
      if (!db.imagenes_usuario) db.imagenes_usuario = [];
      db.imagenes_usuario.push(img);
      return img;
    });
  },
  async obtenerImagenUsuario(id) {
    if (isPg) { const r = await pgQuery('SELECT * FROM imagenes_usuario WHERE id=$1', [id]); return r[0] || null; }
    return (loadJson().imagenes_usuario || []).find(i => i.id === id) || null;
  },
  async obtenerImagenUsuarioPorNombrePersonalizado(usuario_id, nombre_personalizado) {
    if (isPg) {
      const r = await pgQuery('SELECT * FROM imagenes_usuario WHERE usuario_id=$1 AND nombre_personalizado=$2', [usuario_id, nombre_personalizado]);
      return r[0] || null;
    }
    return (loadJson().imagenes_usuario || []).find(i => i.usuario_id === usuario_id && i.nombre_personalizado === nombre_personalizado) || null;
  },
  async actualizarImagenUsuario(id, patch) {
    if (isPg) {
      const keys = Object.keys(patch); if (!keys.length) return;
      if (keys.some(k => !/^[a-z_]+$/.test(k))) throw new Error('Invalid column nombre');
      const sets = keys.map((k,i) => `"${k}"=$${i+1}`).join(',');
      await pgQuery(`UPDATE imagenes_usuario SET ${sets} WHERE id=$${keys.length+1}`, [...keys.map(k => patch[k]), id]);
      return;
    }
    await withDb(db => {
      const img = (db.imagenes_usuario || []).find(x => x.id === id);
      if (img) Object.assign(img, patch);
    });
  },
  async eliminarImagenUsuario(id) {
    if (isPg) { await pgQuery('DELETE FROM imagenes_usuario WHERE id=$1', [id]); return; }
    await withDb(db => {
      db.imagenes_usuario = (db.imagenes_usuario || []).filter(x => x.id !== id);
    });
  },
  async verificarDisponibilidadNombreImagenUsuario(usuario_id, nombre_personalizado, excludeId) {
    if (isPg) {
      if (excludeId) {
        const r = await pgQuery('SELECT id FROM imagenes_usuario WHERE usuario_id=$1 AND nombre_personalizado=$2 AND id!=$3', [usuario_id, nombre_personalizado, excludeId]);
        return r.length === 0;
      }
      const r = await pgQuery('SELECT id FROM imagenes_usuario WHERE usuario_id=$1 AND nombre_personalizado=$2', [usuario_id, nombre_personalizado]);
      return r.length === 0;
    }
    const list = loadJson().imagenes_usuario || [];
    return !list.some(i => i.usuario_id === usuario_id && i.nombre_personalizado === nombre_personalizado && i.id !== excludeId);
  },

  // ---- MODERACIÓN DE IMÁGENES ----
  async listarTodasImagenes({ busqueda, pagina = 1, limite = 40 } = {}) {
    if (isPg) {
      const offset = (pagina - 1) * limite;
      let where = 'WHERE 1=1';
      const params = [];
      if (busqueda) {
        params.push('%' + busqueda + '%');
        where += ` AND (u.nombre_mostrado ILIKE $${params.length} OR u.email ILIKE $${params.length} OR i.nombre_personalizado ILIKE $${params.length})`;
      }
      const countR = await pgQuery(`SELECT COUNT(*)::int AS total FROM imagenes_usuario i JOIN usuarios u ON u.id = i.usuario_id ${where}`, params);
      const total = countR[0]?.total || 0;
      const imgs = await pgQuery(`
        SELECT i.*, u.nombre_mostrado AS nombre_usuario, u.email AS email_usuario, u.url_avatar AS avatar_usuario
        FROM imagenes_usuario i
        JOIN usuarios u ON u.id = i.usuario_id
        ${where}
        ORDER BY i.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, limite, offset]);
      return { imagenes: imgs, total, paginas: Math.ceil(total / limite) };
    }
    return { imagenes: [], total: 0, paginas: 0 };
  },
  async moderarImagen(id, moderadaPor) {
    if (isPg) {
      await pgQuery('UPDATE imagenes_usuario SET moderada=true, moderada_por=$1, moderada_en=now() WHERE id=$2', [moderadaPor, id]);
    } else {
      await withDb(db => {
        const img = (db.imagenes_usuario || []).find(x => x.id === id);
        if (img) { img.moderada = true; img.moderada_por = moderadaPor; img.moderada_en = new Date().toISOString(); }
      });
    }
  },
  async desmoderarImagen(id) {
    if (isPg) {
      await pgQuery('UPDATE imagenes_usuario SET moderada=false, moderada_por=NULL, moderada_en=NULL WHERE id=$1', [id]);
    } else {
      await withDb(db => {
        const img = (db.imagenes_usuario || []).find(x => x.id === id);
        if (img) { img.moderada = false; img.moderada_por = null; img.moderada_en = null; }
      });
    }
  },

  // ---- CHANGELOGS ----
  async listarHistoriales() {
    if (isPg) {
      return await pgQuery('SELECT * FROM historiales ORDER BY created_at DESC');
    }
      const list = loadJson().historiales || [];
      return list.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async crearHistorial({ version, titulo, entradas }) {
    const now = new Date().toISOString();
    const entrada = { id: uuidv4(), version, titulo, entradas, created_at: now, updated_at: now };
    if (isPg) {
      await pgQuery(
        'INSERT INTO historiales (id, version, titulo, entradas) VALUES ($1,$2,$3,$4)',
        [entrada.id, entrada.version, entrada.titulo, entrada.entradas]);
      return entrada;
    }
    return withDb(db => {
      if (!db.historiales) db.historiales = [];
      db.historiales.push(entrada);
      return entrada;
    });
  },
  async actualizarHistorial(id, { version, titulo, entradas }) {
    if (isPg) {
      await pgQuery(
        'UPDATE historiales SET version=$1, titulo=$2, entradas=$3, updated_at=now() WHERE id=$4',
        [version, titulo, entradas, id]);
      return;
    }
    await withDb(db => {
      if (!db.historiales) db.historiales = [];
      const e = db.historiales.find(c => c.id === id);
      if (e) { e.version = version; e.titulo = titulo; e.entradas = entradas; e.updated_at = new Date().toISOString(); }
    });
  },
  async eliminarHistorial(id) {
    if (isPg) {
      await pgQuery('DELETE FROM historiales WHERE id=$1', [id]);
      return;
    }
    await withDb(db => {
      if (!db.historiales) db.historiales = [];
      db.historiales = db.historiales.filter(c => c.id !== id);
    });
  },
  async obtenerConfigHistorial() {
    if (isPg) {
      const rows = await pgQuery("SELECT value FROM config_sitio WHERE key='enlace_historial'");
      return rows.length ? parseJsonb(rows[0].value, { texto_enlace: 'Ver historial de versiones', version_actual: '1.0.0' }) : { texto_enlace: 'Ver historial de versiones', version_actual: '1.0.0' };
    }
    return { texto_enlace: 'Ver historial de versiones', version_actual: '1.0.0', ...(loadJson().config_historial || {}) };
  },
  async actualizarConfigHistorial({ texto_enlace, version_actual }) {
    if (isPg) {
      await pgQuery(
        "INSERT INTO config_sitio (key, value) VALUES ('enlace_historial', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
        [JSON.stringify({ texto_enlace, version_actual })]);
      return;
    }
    await withDb(db => {
      if (!db.config_historial) db.config_historial = {};
      db.config_historial.texto_enlace = texto_enlace;
      db.config_historial.version_actual = version_actual;
    });
  },
  async obtenerHuevosPascua() {
    if (isPg) {
      const rows = await pgQuery("SELECT value FROM config_sitio WHERE key='huevos_pascua'");
      return rows.length ? parseJsonb(rows[0].value, []) : [];
    }
    return loadJson().huevos_pascua || [];
  },
  async obtenerHuevoPascua(id) {
    const eggs = await this.obtenerHuevosPascua();
    return eggs.find(e => e.id === id) || null;
  },
  async actualizarHuevosPascua(eggs) {
    if (isPg) {
      await pgQuery(
        "INSERT INTO config_sitio (key, value) VALUES ('huevos_pascua', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
        [JSON.stringify(eggs)]);
      return;
    }
    await withDb(db => { db.huevos_pascua = eggs; });
  },
  async obtenerPerfilesEquipo() {
    if (isPg) {
      const rows = await pgQuery("SELECT value FROM config_sitio WHERE key='perfiles_equipo'");
      return rows.length ? parseJsonb(rows[0].value, []) : [];
    }
    return loadJson().perfiles_equipo || [];
  },
  async actualizarPerfilEquipo(id, datos) {
    const perfiles = await this.obtenerPerfilesEquipo();
    const idx = perfiles.findIndex(p => p.id === id);
    if (idx === -1) return null;
    perfiles[idx] = { ...perfiles[idx], ...datos };
    if (isPg) {
      await pgQuery(
        "INSERT INTO config_sitio (key, value) VALUES ('perfiles_equipo', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
        [JSON.stringify(perfiles)]);
      return perfiles[idx];
    }
    await withDb(db => { db.perfiles_equipo = perfiles; });
    return perfiles[idx];
  },
  async reordenarPerfilesEquipo(idsOrdenados) {
    const perfiles = await this.obtenerPerfilesEquipo();
    const mapa = {};
    perfiles.forEach(p => { mapa[p.id] = p; });
    const reordenados = idsOrdenados.map(id => mapa[id]).filter(Boolean);
    if (isPg) {
      await pgQuery(
        "INSERT INTO config_sitio (key, value) VALUES ('perfiles_equipo', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
        [JSON.stringify(reordenados)]);
      return reordenados;
    }
    await withDb(db => { db.perfiles_equipo = reordenados; });
    return reordenados;
  },
  async obtenerTituloEquipo() {
    if (isPg) {
      const rows = await pgQuery("SELECT value FROM config_sitio WHERE key='titulo_equipo'");
      if (!rows.length) return 'Nuestro Equipo';
      const v = rows[0].value;
      return typeof v === 'string' ? v : String(v);
    }
    const db = loadJson();
    return db.titulo_equipo || 'Nuestro Equipo';
  },
  async definirTituloEquipo(titulo) {
    if (isPg) {
      await pgQuery(
        "INSERT INTO config_sitio (key, value) VALUES ('titulo_equipo', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
        [JSON.stringify(titulo)]);
      return;
    }
    await withDb(db => { db.titulo_equipo = titulo; });
  },

  // ---- FOROS (JSON fallback) ----
  async listarCategoriasForo() {
    if (isPg) { /* TODO: implement */ }
    return [];
  },
  async buscarHilosForo() {
    if (isPg) { /* TODO: implement */ }
    return { hilos: [], total: 0 };
  },
  async obtenerEstadisticasForo() {
    if (isPg) { /* TODO: implement */ }
    return { total_hilos: 0, total_respuestas: 0, usuarios_activos: 0 };
  },
  async obtenerCategoriaForo() {
    if (isPg) { /* TODO: implement */ }
    return null;
  },
  async crearHiloForo() {
    if (isPg) { /* TODO: implement */ }
    return null;
  },
  async obtenerHiloForo() {
    if (isPg) { /* TODO: implement */ }
    return null;
  },
  async actualizarHiloForo() {
    if (isPg) { /* TODO: implement */ }
    return null;
  },
  async eliminarHiloForo() {
    if (isPg) { /* TODO: implement */ }
    return null;
  },
  async toggleFijadoHiloForo() {
    if (isPg) { /* TODO: implement */ }
    return null;
  },
  async toggleCerradoHiloForo() {
    if (isPg) { /* TODO: implement */ }
    return null;
  },
  async listarRespuestasForo() {
    if (isPg) { /* TODO: implement */ }
    return { respuestas: [], total: 0 };
  },
  async crearRespuestaForo() {
    if (isPg) { /* TODO: implement */ }
    return null;
  },
  async actualizarRespuestaForo() {
    if (isPg) { /* TODO: implement */ }
    return null;
  },
  async eliminarRespuestaForo() {
    if (isPg) { /* TODO: implement */ }
    return null;
  },
  async crearReaccionForo() {
    if (isPg) { /* TODO: implement */ }
    return null;
  },
  async eliminarReaccionForo() {
    if (isPg) { /* TODO: implement */ }
    return null;
  },

  // ---- DESTACADOS (JSON fallback) ----
  async listarDestacados() {
    if (isPg) { /* TODO: implement */ }
    return [];
  },
  async crearDestacado() {
    if (isPg) { /* TODO: implement */ }
    return null;
  },
  async actualizarDestacado() {
    if (isPg) { /* TODO: implement */ }
    return null;
  },
  async eliminarDestacado() {
    if (isPg) { /* TODO: implement */ }
    return null;
  }
};

module.exports = api;
module.exports.pgQuery = pgQuery;
module.exports.isPg = isPg;
