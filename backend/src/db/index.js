/**
 * BookShelf™ - Capa de acceso a datos
 *
 * Dos backends intercambiables según DB_MODE:
 *   - 'postgres' (default si hay DATABASE_URL): usa node-postgres.
 *   - 'json':      usa storage/db.json (sin instalar Postgres).
 *
 * Expone una API uniforme con funciones de alto nivel
 * (listBooks, getUserByEmail, banUser, etc.) para que las rutas
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

const RECOVERY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function emptyDb() {
  return { users:[], books:[], chapters:[], favorites:[], ratings:[],
           comments:[], collections:[], collection_books:[], notifications:[],
           announcements:[], metrics:[], banned_users:[], token_blacklist:[],
           moderation_logs:[], book_views:[], refresh_tokens:[],
           categories:['fantasía','poesía','narrativa','educativa'],
           bookmarks:[], user_images:[], trash:[],
            changelogs:[], changelog_config:{ link_text:'Ver historial de versiones', current_version:'1.0.0' },
             easter_eggs:[{ id:'register_username', message:'Nu uh, eso es mío!', description:'Intenta registrarte con este nombre en la página de registro.' }],
             team_profiles:[
               { id:'jeison-sossa', name:'Jeison Sossa Sierra', age:'', contact:'', info:'Texto de ejemplo para el perfil.', photo_url:'/storage/team/placeholder.png' },
               { id:'leyder-montoya', name:'Leyder Montoya Gonzales', age:'', contact:'', info:'Texto de ejemplo para el perfil.', photo_url:'/storage/team/placeholder.png' },
               { id:'santiago-lopez', name:'Santiago López Quintana', age:'', contact:'', info:'Texto de ejemplo para el perfil.', photo_url:'/storage/team/placeholder.png' }
             ] };
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
  if (typeof val === 'string') try { return JSON.parse(val); } catch { return val; }
  return val;
}

// ---------------------------------------------------------------------
// API uniforme
// ---------------------------------------------------------------------
const api = {
  // ---- USERS ----
  async listUsers({ q, role, page = 1, limit = 50 } = {}) {
    const offset = (page - 1) * limit;
    if (isPg) {
      const where = []; const params = [];
      if (q) {
        const sq = q.replace(/[%_\\]/g, '\\$&');
        params.push('%' + sq + '%');
        where.push(`(email ILIKE $${params.length} ESCAPE '\\' OR display_name ILIKE $${params.length} ESCAPE '\\')`);
      }
      if (role) { params.push(role); where.push(`role=$${params.length}`); }
      const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
      params.push(limit); params.push(offset);
      const rows = await pgQuery(
        `SELECT id, email, display_name, role, avatar_url, contact_info, created_at
           FROM users ${whereClause}
           ORDER BY created_at DESC
           LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
      const countResult = await pgQuery(
        `SELECT count(*)::int AS total FROM users ${whereClause}`, params.slice(0, -2));
      return { users: rows, total: countResult[0]?.total || 0 };
    }
    const db = loadJson();
    let arr = db.users.slice();
    if (q) {
      const qq = q.toLowerCase();
      arr = arr.filter(u =>
        u.email.toLowerCase().includes(qq) ||
        (u.display_name || '').toLowerCase().includes(qq));
    }
    if (role) arr = arr.filter(u => u.role === role);
    const total = arr.length;
    arr = arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
    arr = arr.slice(offset, offset + limit);
    return { users: arr.map(u => ({ id: u.id, email: u.email, display_name: u.display_name,
                                     role: u.role, avatar_url: u.avatar_url,
                                     contact_info: u.contact_info, created_at: u.created_at })),
             total };
  },
  async getUserByEmail(email) {
    if (isPg) return (await pgQuery('SELECT * FROM users WHERE email=$1', [email]))[0] || null;
    return loadJson().users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },
  async getUserById(id) {
    if (isPg) return (await pgQuery('SELECT * FROM users WHERE id=$1', [id]))[0] || null;
    return loadJson().users.find(u => u.id === id) || null;
  },
  async createUser({ email, password_hash, display_name, role='user' }) {
    const id = uuidv4();
    const user = { id, email, password_hash, display_name, role,
                   avatar_url:null, contact_info:null,
                   created_at: new Date().toISOString() };
    if (isPg) {
      await pgQuery(
        `INSERT INTO users (id,email,password_hash,display_name,role,avatar_url,contact_info,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, email, password_hash, display_name, role, null, null, user.created_at]);
      return user;
    }
    return withDb(db => {
      db.users.push(user);
      return user;
    });
  },
  async updateUserContactInfo(id, contact_info) {
    if (isPg) { await pgQuery('UPDATE users SET contact_info=$1 WHERE id=$2', [contact_info, id]); return; }
    await withDb(db => { const u = db.users.find(x => x.id === id); if (u) u.contact_info = contact_info; });
  },
  async updateUserDisplayName(id, display_name) {
    if (isPg) { await pgQuery('UPDATE users SET display_name=$1 WHERE id=$2', [display_name, id]); return; }
    await withDb(db => { const u = db.users.find(x => x.id === id); if (u) u.display_name = display_name; });
  },
  async moveModerator(id, direction) {
    const all = await this.listModerators();
    const idx = all.findIndex(u => u.id === id);
    if (idx === -1) return false;
    if (direction === 'up' && idx === 0) return false;
    if (direction === 'down' && idx === all.length - 1) return false;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (isPg) {
      await pgQuery('UPDATE users SET team_sort=$1 WHERE id=$2', [swapIdx, id]);
      await pgQuery('UPDATE users SET team_sort=$1 WHERE id=$2', [idx, all[swapIdx].id]);
      return true;
    }
    await withDb(db => {
      const a = db.users.find(u => u.id === id);
      const b = db.users.find(u => u.id === all[swapIdx].id);
      if (!a || !b) return;
      if (a.team_sort == null) a.team_sort = idx;
      if (b.team_sort == null) b.team_sort = swapIdx;
      const tmp = a.team_sort;
      a.team_sort = b.team_sort;
      b.team_sort = tmp;
    });
    return true;
  },
  async listModerators() {
    if (isPg) {
      const rows = await pgQuery(
        `SELECT id,email,display_name,role,created_at,team_sort
           FROM users WHERE role IN ('moderator','admin')
           ORDER BY COALESCE(team_sort, 0), created_at`);
      return rows;
    }
    return loadJson().users.filter(u => ['moderator','admin'].includes(u.role))
      .map(u => ({ id: u.id, email: u.email, display_name: u.display_name,
                   role: u.role, created_at: u.created_at, avatar_url: u.avatar_url,
                   contact_info: u.contact_info,
                   team_sort: u.team_sort || 0 }))
      .sort((a, b) => (a.team_sort || 0) - (b.team_sort || 0) || new Date(a.created_at) - new Date(b.created_at));
  },
  async removeModerator(id) {
    if (isPg) { await pgQuery('UPDATE users SET role=$1 WHERE id=$2 AND role=$3', ['user', id, 'moderator']); return; }
    await withDb(db => {
      const u = db.users.find(x => x.id === id && x.role === 'moderator');
      if (u) u.role = 'user';
    });
  },
  async setModerator(id) {
    if (isPg) {
      const max = (await pgQuery('SELECT MAX(team_sort) FROM users WHERE role IN (\'moderator\',\'admin\')'))[0]?.max || 0;
      await pgQuery('UPDATE users SET role=$1, team_sort=$2 WHERE id=$3 AND role=$4', ['moderator', max + 1, id, 'user']);
      return;
    }
    await withDb(db => {
      const u = db.users.find(x => x.id === id && x.role === 'user');
      if (u) {
        u.role = 'moderator';
        u.team_sort = db.users.filter(x => ['moderator','admin'].includes(x.role)).length;
      }
    });
  },
  async deleteUser(id, { adminEmail, permanent } = {}) {
    if (isPg) {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        const userRow = (await client.query('SELECT * FROM users WHERE id=$1', [id])).rows[0];
        if (!userRow) { await client.query('ROLLBACK'); return null; }
        const email = userRow.email;

        // Snapshot para la papelera (si no es eliminación permanente desde papelera)
        if (!permanent) {
          const userBooks = (await client.query(
            'SELECT id, title FROM books WHERE author_id=$1', [id])).rows;
          const bookIds = userBooks.map(b => b.id);

          let trashedChapters = [];
          let trashedBookViews = [];
          let trashedBookFavs = [];
          let trashedBookRatings = [];
          let trashedBookComments = [];
          for (const bId of bookIds) {
            trashedChapters = trashedChapters.concat(
              (await client.query('SELECT * FROM chapters WHERE book_id=$1', [bId])).rows);
            trashedBookViews = trashedBookViews.concat(
              (await client.query('SELECT * FROM book_views WHERE book_id=$1', [bId])).rows);
            trashedBookFavs = trashedBookFavs.concat(
              (await client.query('SELECT * FROM favorites WHERE book_id=$1', [bId])).rows);
            trashedBookRatings = trashedBookRatings.concat(
              (await client.query('SELECT * FROM ratings WHERE book_id=$1', [bId])).rows);
            trashedBookComments = trashedBookComments.concat(
              (await client.query('SELECT * FROM comments WHERE book_id=$1', [bId])).rows);
          }

          const trashEntry = {
            id: uuidv4(),
            user: userRow,
            user_email: email,
            data: {
              favorites: (await client.query(
                'SELECT * FROM favorites WHERE user_id=$1', [id])).rows,
              ratings: (await client.query(
                'SELECT * FROM ratings WHERE user_id=$1', [id])).rows,
              comments: (await client.query(
                'SELECT * FROM comments WHERE user_id=$1', [id])).rows,
              bookmarks: (await client.query(
                'SELECT * FROM bookmarks WHERE user_id=$1', [id])).rows,
              book_views: (await client.query(
                'SELECT * FROM book_views WHERE user_id=$1', [id])).rows,
              notifications: (await client.query(
                'SELECT * FROM notifications WHERE user_id=$1', [id])).rows,
              user_images: (await client.query(
                'SELECT * FROM user_images WHERE user_id=$1', [id])).rows,
              collections: (await client.query(
                'SELECT * FROM collections WHERE owner_id=$1', [id])).rows,
              books: userBooks,
              chapters: trashedChapters,
              book_views_on_books: trashedBookViews,
              favorites_on_books: trashedBookFavs,
              ratings_on_books: trashedBookRatings,
              comments_on_books: trashedBookComments
            },
            trashed_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + RECOVERY_WINDOW_MS).toISOString(),
            trashed_by: adminEmail || 'unknown'
          };

          await client.query(
            `INSERT INTO trash (id, user_email, entry, trashed_at, expires_at, trashed_by)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [trashEntry.id, email, JSON.stringify(trashEntry),
             trashEntry.trashed_at, trashEntry.expires_at, trashEntry.trashed_by]);
        }

        // Limpieza de datos del usuario en las tablas activas
        await client.query('DELETE FROM book_views WHERE user_id=$1', [id]);
        await client.query('DELETE FROM favorites WHERE user_id=$1', [id]);
        await client.query('DELETE FROM ratings WHERE user_id=$1', [id]);
        await client.query('DELETE FROM bookmarks WHERE user_id=$1', [id]);
        await client.query('DELETE FROM comments WHERE user_id=$1', [id]);
        await client.query('DELETE FROM notifications WHERE user_id=$1', [id]);
        await client.query('DELETE FROM user_images WHERE user_id=$1', [id]);
        const colIds = (await client.query(
          'SELECT id FROM collections WHERE owner_id=$1', [id])).rows.map(r => r.id);
        for (const cId of colIds) {
          await client.query('DELETE FROM collection_books WHERE collection_id=$1', [cId]);
        }
        await client.query('DELETE FROM collections WHERE owner_id=$1', [id]);

        const books = (await client.query(
          'SELECT id FROM books WHERE author_id=$1', [id])).rows;
        for (const b of books) {
          await client.query('DELETE FROM chapters WHERE book_id=$1', [b.id]);
          await client.query('DELETE FROM book_views WHERE book_id=$1', [b.id]);
          await client.query('DELETE FROM favorites WHERE book_id=$1', [b.id]);
          await client.query('DELETE FROM ratings WHERE book_id=$1', [b.id]);
          await client.query('DELETE FROM comments WHERE book_id=$1', [b.id]);
        }
        await client.query('DELETE FROM books WHERE author_id=$1', [id]);
        await client.query('UPDATE announcements SET admin_id=NULL WHERE admin_id=$1', [id]);

        // Marcar email como eliminado
        await client.query(
          `INSERT INTO banned_users (email, reason, banned_at, deleted_at, unbanned_at, banned_by, unbanned_by)
           VALUES ($1, 'Eliminación administrativa', now(), now(), now(), $2, $2)
           ON CONFLICT (email) DO UPDATE SET deleted_at=now(), unbanned_at=now(), unbanned_by=$2`,
          [email, adminEmail || null]);
        await client.query('DELETE FROM token_blacklist WHERE user_email=$1', [email]);
        await client.query('DELETE FROM refresh_tokens WHERE user_id=$1', [id]);
        await client.query('DELETE FROM users WHERE id=$1', [id]);
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK'); throw e; }
      finally { client.release(); }
      return { deleted: true };
    }
    return withDb(db => {
      const u = db.users.find(x => x.id === id);
      if (!u) return null;
      const email = u.email;
      const now = new Date().toISOString();

      // Snapshot para papelera (solo si no es permanent delete desde papelera)
      if (!permanent) {
        const trashBooks = db.books.filter(b => b.author_id === id);
        const bookIds = trashBooks.map(b => b.id);
        if (!db.trash) db.trash = [];
        const trashEntry = {
          id: uuidv4(),
          user: { ...u },
          user_email: email,
          data: {
            favorites: db.favorites.filter(x => x.user_id === id),
            ratings: db.ratings.filter(x => x.user_id === id),
            comments: db.comments.filter(x => x.user_id === id),
            bookmarks: (db.bookmarks || []).filter(x => x.user_id === id),
            book_views: (db.book_views || []).filter(x => x.user_id === id),
            notifications: (db.notifications || []).filter(x => x.user_id === id),
            user_images: (db.user_images || []).filter(x => x.user_id === id),
            collections: (db.collections || []).filter(x => x.owner_id === id),
            collection_books: [],
            books: trashBooks,
            chapters: db.chapters.filter(c => bookIds.includes(c.book_id)),
            book_views_on_books: (db.book_views || []).filter(v => bookIds.includes(v.book_id)),
            favorites_on_books: db.favorites.filter(f => bookIds.includes(f.book_id)),
            ratings_on_books: db.ratings.filter(r => bookIds.includes(r.book_id)),
            comments_on_books: db.comments.filter(c => bookIds.includes(c.book_id))
          },
          trashed_at: now,
          expires_at: new Date(Date.now() + RECOVERY_WINDOW_MS).toISOString(),
          trashed_by: adminEmail || 'unknown'
        };
        // Collect collection_books for user's collections
        const userColIds = trashEntry.data.collections.map(c => c.id);
        trashEntry.data.collection_books = (db.collection_books || [])
          .filter(cb => userColIds.includes(cb.collection_id));

        db.trash.push(trashEntry);
      }

      // Limpiar datos del usuario de colecciones activas
      db.users = db.users.filter(x => x.id !== id);
      db.book_views = (db.book_views || []).filter(x => x.user_id !== id);
      db.favorites = db.favorites.filter(x => x.user_id !== id);
      db.ratings = db.ratings.filter(x => x.user_id !== id);
      db.bookmarks = (db.bookmarks || []).filter(x => x.user_id !== id);
      db.comments = db.comments.filter(x => x.user_id !== id);
      db.notifications = (db.notifications || []).filter(x => x.user_id !== id);
      db.user_images = (db.user_images || []).filter(x => x.user_id !== id);
      const userCols = (db.collections || []).filter(x => x.owner_id === id);
      const userColIds = userCols.map(c => c.id);
      db.collection_books = (db.collection_books || []).filter(
        cb => !userColIds.includes(cb.collection_id));
      db.collections = (db.collections || []).filter(x => x.owner_id !== id);

      const userBooks = db.books.filter(b => b.author_id === id);
      const bookIds = userBooks.map(b => b.id);
      for (const bId of bookIds) {
        db.chapters = db.chapters.filter(c => c.book_id !== bId);
        db.book_views = (db.book_views || []).filter(v => v.book_id !== bId);
        db.favorites = db.favorites.filter(f => f.book_id !== bId);
        db.ratings = db.ratings.filter(r => r.book_id !== bId);
        db.comments = db.comments.filter(c => c.book_id !== bId);
      }
      db.books = db.books.filter(b => !bookIds.includes(b.id));
      db.announcements.forEach(a => { if (a.admin_id === id) a.admin_id = null; });

      const existingBan = db.banned_users.find(b => b.email === email && !b.unbanned_at);
      if (existingBan) {
        existingBan.deleted_at = now;
        existingBan.unbanned_at = now;
        existingBan.unbanned_by = adminEmail || null;
      } else {
        db.banned_users.push({
          id: uuidv4(), email, reason: 'Eliminación administrativa',
          banned_by: adminEmail || null,
          unbanned_by: adminEmail || null,
          appeal: null, appeal_submitted: false,
          banned_at: now, deleted_at: now, unbanned_at: now
        });
      }
      db.token_blacklist = db.token_blacklist.filter(t => t.user_email !== email);
      db.refresh_tokens = (db.refresh_tokens || []).filter(t => t.user_id !== id);
      return { deleted: true, trashed: !permanent };
    });
  },

  // ---- PAPELERA (TRASH) ----
  async listTrash() {
    if (isPg) {
      const rows = await pgQuery(
        `SELECT id, user_email, trashed_at, expires_at, trashed_by
           FROM trash ORDER BY trashed_at DESC`);
      return rows.map(r => ({
        ...r,
        expired: new Date(r.expires_at) < new Date()
      }));
    }
    return withDb(db => {
      if (!db.trash) db.trash = [];
      const now = new Date();
      // Auto-purge de entradas expiradas
      db.trash = db.trash.filter(t => new Date(t.expires_at) > now);
      return db.trash.map(t => ({
        id: t.id,
        user_email: t.user_email,
        trashed_at: t.trashed_at,
        expires_at: t.expires_at,
        trashed_by: t.trashed_by,
        user: { id: t.user.id, email: t.user.email, display_name: t.user.display_name, role: t.user.role },
        has_books: t.data.books.length > 0,
        book_count: t.data.books.length,
        expired: false
      }));
    });
  },

  async getTrashEntry(id) {
    if (isPg) {
      const rows = await pgQuery('SELECT * FROM trash WHERE id=$1', [id]);
      if (!rows.length) return null;
      const row = rows[0];
      return { ...JSON.parse(row.entry), expired: new Date(row.expires_at) < new Date() };
    }
    return withDb(db => {
      if (!db.trash) return null;
      const entry = db.trash.find(t => t.id === id);
      if (!entry) return null;
      return { ...entry, expired: new Date(entry.expires_at) < new Date() };
    });
  },

  async restoreFromTrash(id) {
    const entry = await api.getTrashEntry(id);
    if (!entry) return null;
    if (entry.expired) return { error: 'expired', message: 'El período de recuperación ha expirado' };

    if (isPg) {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        const d = entry.data;

        // Verificar que el email no esté en uso
        const existing = await client.query('SELECT id FROM users WHERE email=$1', [entry.user_email]);
        if (existing.rows.length > 0) {
          await client.query('ROLLBACK');
          return { error: 'email_in_use', message: 'El email ya está registrado por otro usuario' };
        }

        // Restaurar usuario
        const user = entry.user;
        await client.query(
          `INSERT INTO users (id,email,password_hash,display_name,role,avatar_url,contact_info,created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [user.id, user.email, user.password_hash, user.display_name, user.role,
           user.avatar_url, user.contact_info, user.created_at]);

        // Restaurar datos
        for (const f of (d.favorites || [])) {
          await client.query('INSERT INTO favorites (id,user_id,book_id,created_at) VALUES ($1,$2,$3,$4)',
            [f.id, f.user_id, f.book_id, f.created_at]).catch(e => console.warn('restore:', e.message));
        }
        for (const r of (d.ratings || [])) {
          await client.query('INSERT INTO ratings (id,user_id,book_id,rating,created_at) VALUES ($1,$2,$3,$4,$5)',
            [r.id, r.user_id, r.book_id, r.rating, r.created_at]).catch(e => console.warn("restore:", e.message));
        }
        for (const c of (d.comments || [])) {
          await client.query('INSERT INTO comments (id,user_id,book_id,chapter_id,parent_comment_id,content,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)',
            [c.id, c.user_id, c.book_id, c.chapter_id, c.parent_comment_id, c.content, c.created_at]).catch(e => console.warn("restore:", e.message));
        }
        for (const bk of (d.bookmarks || [])) {
          await client.query('INSERT INTO bookmarks (id,user_id,book_id,chapter_id,chapter_index,scroll_position,finished,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
            [bk.id, bk.user_id, bk.book_id, bk.chapter_id, bk.chapter_index, bk.scroll_position, bk.finished, bk.created_at, bk.updated_at]).catch(e => console.warn("restore:", e.message));
        }
        for (const bv of (d.book_views || [])) {
          await client.query('INSERT INTO book_views (user_id,book_id,created_at) VALUES ($1,$2,$3)',
            [bv.user_id, bv.book_id, bv.created_at]).catch(e => console.warn("restore:", e.message));
        }
        for (const n of (d.notifications || [])) {
          await client.query('INSERT INTO notifications (id,user_id,type,payload,is_read,created_at) VALUES ($1,$2,$3,$4,$5,$6)',
            [n.id, n.user_id, n.type, n.payload, n.is_read, n.created_at]).catch(e => console.warn("restore:", e.message));
        }
        for (const ui of (d.user_images || [])) {
          await client.query('INSERT INTO user_images (id,user_id,storage_path,custom_name,sort_order,created_at) VALUES ($1,$2,$3,$4,$5,$6)',
            [ui.id, ui.user_id, ui.storage_path, ui.custom_name, ui.sort_order, ui.created_at]).catch(e => console.warn("restore:", e.message));
        }
        for (const col of (d.collections || [])) {
          await client.query('INSERT INTO collections (id,owner_id,title,description,is_public,created_at) VALUES ($1,$2,$3,$4,$5,$6)',
            [col.id, col.owner_id, col.title, col.description, col.is_public, col.created_at]).catch(e => console.warn("restore:", e.message));
        }
        for (const cb of (d.collection_books || [])) {
          await client.query('INSERT INTO collection_books (collection_id,book_id) VALUES ($1,$2)',
            [cb.collection_id, cb.book_id]).catch(e => console.warn("restore:", e.message));
        }
        for (const book of (d.books || [])) {
          await client.query(
            `INSERT INTO books (id,title,subtitle,description,author_id,status,is_free,price_cents,
                                category,age_group,cover_url,original_file,original_public,
                                favorite_count,views,created_at,updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
            [book.id, book.title, book.subtitle, book.description, book.author_id, book.status,
             book.is_free, book.price_cents, book.category, book.age_group, book.cover_url,
             book.original_file, book.original_public, book.favorite_count, book.views,
             book.created_at, book.updated_at]).catch(e => console.warn("restore:", e.message));
        }
        for (const ch of (d.chapters || [])) {
          await client.query(
            `INSERT INTO chapters (id,book_id,title,content,"order",is_early_access,created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [ch.id, ch.book_id, ch.title, ch.content, ch.order, ch.is_early_access, ch.created_at]).catch(e => console.warn("restore:", e.message));
        }

        // Quitar de banned_users (ya no está eliminado)
        await client.query('DELETE FROM banned_users WHERE email=$1', [entry.user_email]);

        // Eliminar entrada de trash
        await client.query('DELETE FROM trash WHERE id=$1', [id]);

        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK'); throw e; }
      finally { client.release(); }
      return { restored: true, user_email: entry.user_email };
    }

    return withDb(db => {
      const d = entry.data;

      // Verificar email no en uso
      if (db.users.some(u => u.email.toLowerCase() === entry.user_email.toLowerCase())) {
        return { error: 'email_in_use', message: 'El email ya está registrado por otro usuario' };
      }

      // Restaurar usuario
      db.users.push(entry.user);

      // Restaurar datos
      for (const item of (d.favorites || [])) {
        if (!db.favorites.some(x => x.user_id === item.user_id && x.book_id === item.book_id)) {
          db.favorites.push(item);
        }
      }
      for (const item of (d.ratings || [])) {
        if (!db.ratings.some(x => x.user_id === item.user_id && x.book_id === item.book_id)) {
          db.ratings.push(item);
        }
      }
      for (const item of (d.comments || [])) {
        if (!db.comments.some(x => x.id === item.id)) {
          db.comments.push(item);
        }
      }
      for (const item of (d.bookmarks || [])) {
        if (!(db.bookmarks || []).some(x => x.id === item.id)) {
          if (!db.bookmarks) db.bookmarks = [];
          db.bookmarks.push(item);
        }
      }
      for (const item of (d.book_views || [])) {
        if (!(db.book_views || []).some(x => x.user_id === item.user_id && x.book_id === item.book_id)) {
          if (!db.book_views) db.book_views = [];
          db.book_views.push(item);
        }
      }
      for (const item of (d.notifications || [])) {
        if (!(db.notifications || []).some(x => x.id === item.id)) {
          if (!db.notifications) db.notifications = [];
          db.notifications.push(item);
        }
      }
      for (const item of (d.user_images || [])) {
        if (!(db.user_images || []).some(x => x.id === item.id)) {
          if (!db.user_images) db.user_images = [];
          db.user_images.push(item);
        }
      }
      for (const item of (d.collections || [])) {
        if (!(db.collections || []).some(x => x.id === item.id)) {
          if (!db.collections) db.collections = [];
          db.collections.push(item);
        }
      }
      for (const item of (d.collection_books || [])) {
        if (!(db.collection_books || []).some(x => x.collection_id === item.collection_id && x.book_id === item.book_id)) {
          if (!db.collection_books) db.collection_books = [];
          db.collection_books.push(item);
        }
      }
      for (const item of (d.books || [])) {
        if (!db.books.some(x => x.id === item.id)) {
          db.books.push(item);
        }
      }
      for (const item of (d.chapters || [])) {
        if (!db.chapters.some(x => x.id === item.id)) {
          db.chapters.push(item);
        }
      }
      for (const item of (d.favorites_on_books || [])) {
        if (!db.favorites.some(x => x.user_id === item.user_id && x.book_id === item.book_id)) {
          db.favorites.push(item);
        }
      }
      for (const item of (d.ratings_on_books || [])) {
        if (!db.ratings.some(x => x.user_id === item.user_id && x.book_id === item.book_id)) {
          db.ratings.push(item);
        }
      }
      for (const item of (d.comments_on_books || [])) {
        if (!db.comments.some(x => x.id === item.id)) {
          db.comments.push(item);
        }
      }
      for (const item of (d.book_views_on_books || [])) {
        if (!(db.book_views || []).some(x => x.user_id === item.user_id && x.book_id === item.book_id)) {
          if (!db.book_views) db.book_views = [];
          db.book_views.push(item);
        }
      }

      // Quitar de banned_users
      const banIdx = db.banned_users.findIndex(b => b.email.toLowerCase() === entry.user_email.toLowerCase());
      if (banIdx !== -1) db.banned_users.splice(banIdx, 1);

      // Eliminar entrada de trash
      db.trash = (db.trash || []).filter(t => t.id !== id);

      return { restored: true, user_email: entry.user_email };
    });
  },

  async permanentDeleteTrash(id) {
    if (isPg) {
      await pgQuery('DELETE FROM trash WHERE id=$1', [id]);
      return { deleted: true };
    }
    return withDb(db => {
      const before = (db.trash || []).length;
      db.trash = (db.trash || []).filter(t => t.id !== id);
      return { deleted: before !== (db.trash || []).length };
    });
  },

  async cleanupExpiredTrash() {
    const cutoff = new Date(Date.now() - RECOVERY_WINDOW_MS).toISOString();
    if (isPg) {
      const r = await pgPool.query('DELETE FROM trash WHERE expires_at < now()');
      return { deleted: r.rowCount || 0 };
    }
    return withDb(db => {
      if (!db.trash) return { deleted: 0 };
      const before = db.trash.length;
      db.trash = db.trash.filter(t => new Date(t.expires_at) > new Date());
      return { deleted: before - db.trash.length };
    });
  },

  // ---- BOOKS ----
  async listBooks({ category, age_group, q, author_id, status='published', limit=50, offset=0 } = {}) {
    if (isPg) {
      const where = []; const params=[];
      if (status && status !== 'all') { params.push(status); where.push(`status=$${params.length}`); }
      if (category)  { params.push(category);  where.push(`category=$${params.length}`); }
      if (age_group) { params.push(age_group); where.push(`age_group=$${params.length}`); }
      if (q) { const sq = q.replace(/[%_\\]/g, '\\$&'); params.push('%'+sq+'%'); where.push(`(title ILIKE $${params.length} ESCAPE '\\' OR description ILIKE $${params.length} ESCAPE '\\')`); }
      if (author_id) { params.push(author_id); where.push(`author_id=$${params.length}`); }
      params.push(limit); params.push(offset);
      const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
      return await pgQuery(
        `SELECT b.*, u.display_name AS author_name FROM books b
           JOIN users u ON u.id = b.author_id
          ${whereClause}
          ORDER BY b.views DESC, b.created_at DESC
          LIMIT $${params.length-1} OFFSET $${params.length}`, params);
    }
    const db = loadJson();
    let arr = db.books;
    if (status && status !== 'all') arr = arr.filter(b => b.status === status);
    if (category)  arr = arr.filter(b => b.category === category);
    if (age_group) arr = arr.filter(b => b.age_group === age_group);
    if (author_id) arr = arr.filter(b => b.author_id === author_id);
    if (q) {
      const qq = q.toLowerCase();
      arr = arr.filter(b => (b.title||'').toLowerCase().includes(qq) ||
                            (b.description||'').toLowerCase().includes(qq));
    }
    arr = arr.sort((a,b) => (b.views||0)-(a.views||0)).slice(offset, offset+limit);
    return arr.map(b => ({
      ...b,
      author_name: (db.users.find(u => u.id===b.author_id)||{}).display_name
    }));
  },
  async getBook(id) {
    if (isPg) {
      const rows = await pgQuery(
        `SELECT b.*, u.display_name AS author_name FROM books b
         JOIN users u ON u.id=b.author_id WHERE b.id=$1`, [id]);
      return rows[0] || null;
    }
    const db = loadJson();
    const b = db.books.find(x => x.id === id);
    if (!b) return null;
    return { ...b, author_name: (db.users.find(u => u.id===b.author_id)||{}).display_name };
  },
  async incrementViews(id, userId) {
    if (isPg) {
      if (userId) {
        const existing = await pgQuery(
          `SELECT 1 FROM book_views WHERE user_id=$1 AND book_id=$2`, [userId, id]);
        if (existing.length > 0) return;
        await pgQuery(`INSERT INTO book_views (user_id,book_id) VALUES ($1,$2)`, [userId, id]);
      }
      await pgQuery('UPDATE books SET views=views+1 WHERE id=$1', [id]);
      return;
    }
    await withDb(db => {
      if (userId) {
        const existing = db.book_views?.find(v => v.user_id === userId && v.book_id === id);
        if (existing) return;
        if (!db.book_views) db.book_views = [];
        db.book_views.push({ user_id: userId, book_id: id, created_at: new Date().toISOString() });
      }
      const b = db.books.find(x => x.id === id);
      if (b) b.views = (b.views||0) + 1;
    });
  },
  async resetBookViews(id) {
    if (isPg) {
      await pgQuery(`DELETE FROM book_views WHERE book_id=$1`, [id]);
      await pgQuery(`UPDATE books SET views=0 WHERE id=$1`, [id]);
      return;
    }
    await withDb(db => {
      db.book_views = (db.book_views || []).filter(v => v.book_id !== id);
      const b = db.books.find(x => x.id === id);
      if (b) b.views = 0;
    });
  },
  async createBook(book) {
    const now = new Date().toISOString();
    const full = { ...book, id: book.id || uuidv4(), favorite_count:0, views:0,
                   status:'draft', is_free:true, price_cents:0,
                   original_file:null, original_public:false, cover_url:null,
                   created_at: now, updated_at: now };
    if (isPg) {
      await pgQuery(
        `INSERT INTO books (id,title,subtitle,description,author_id,status,is_free,price_cents,
                            category,age_group,cover_url,original_file,original_public,
                            favorite_count,views)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [full.id, full.title, full.subtitle, full.description, full.author_id, full.status,
         full.is_free, full.price_cents, full.category, full.age_group, full.cover_url,
         full.original_file, full.original_public, full.favorite_count, full.views]);
      return full;
    }
    return withDb(db => {
      db.books.push(full);
      return full;
    });
  },
  async updateBook(id, patch) {
    if (isPg) {
      const keys = Object.keys(patch); if (!keys.length) return await api.getBook(id);
      if (keys.some(k => !/^[a-z_]+$/.test(k))) throw new Error('Invalid column name');
      const sets = keys.map((k,i) => `"${k}"=$${i+1}`).join(',');
      await pgQuery(
        `UPDATE books SET ${sets}, updated_at=now() WHERE id=$${keys.length+1}`,
        [...keys.map(k => patch[k]), id]);
      return await api.getBook(id);
    }
    return withDb(db => {
      const b = db.books.find(x => x.id === id);
      if (!b) return null;
      Object.assign(b, patch); b.updated_at = new Date().toISOString();
      return b;
    });
  },
  async deleteBook(id) {
    if (isPg) { await pgQuery(`UPDATE books SET status='deleted' WHERE id=$1`, [id]); return; }
    await withDb(db => {
      const b = db.books.find(x => x.id === id);
      if (b) b.status = 'deleted';
    });
  },

  // ---- CHAPTERS ----
  async listChapters(book_id) {
    if (isPg) return await pgQuery(
      `SELECT * FROM chapters WHERE book_id=$1 ORDER BY "order" ASC`, [book_id]);
    return loadJson().chapters.filter(c => c.book_id === book_id)
                              .sort((a,b) => (a.order||0)-(b.order||0));
  },
  async getChapter(id) {
    if (isPg) { const r = await pgQuery(`SELECT * FROM chapters WHERE id=$1`, [id]); return r[0] || null; }
    return loadJson().chapters.find(c => c.id === id) || null;
  },
  async createChapter(chapter) {
    const c = { id: chapter.id || uuidv4(), order:1, is_early_access:false,
                created_at: new Date().toISOString(), ...chapter };
    if (isPg) {
      await pgQuery(
        `INSERT INTO chapters (id,book_id,title,content,"order",is_early_access)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [c.id, c.book_id, c.title, c.content, c.order, c.is_early_access]);
      return c;
    }
    return withDb(db => {
      db.chapters.push(c);
      return c;
    });
  },
  async updateChapter(id, patch) {
    if (isPg) {
      const keys = Object.keys(patch); if (!keys.length) return;
      if (keys.some(k => !/^[a-z_]+$/.test(k))) throw new Error('Invalid column name');
      const sets = keys.map((k,i) => `"${k}"=$${i+1}`).join(',');
      await pgQuery(
        `UPDATE chapters SET ${sets} WHERE id=$${keys.length+1}`,
        [...keys.map(k => patch[k]), id]);
      return;
    }
    await withDb(db => {
      const c = db.chapters.find(x => x.id === id);
      if (c) Object.assign(c, patch);
    });
  },
  async deleteChapter(id) {
    if (isPg) { await pgQuery(`DELETE FROM chapters WHERE id=$1`, [id]); return; }
    await withDb(db => {
      db.chapters = db.chapters.filter(c => c.id !== id);
    });
  },

  // ---- FAVORITES / RATINGS / COMMENTS ----
  async toggleFavorite(user_id, book_id) {
    if (isPg) {
      const existing = await pgQuery(
        `SELECT id FROM favorites WHERE user_id=$1 AND book_id=$2`, [user_id, book_id]);
      if (existing.length) {
        await pgQuery(`DELETE FROM favorites WHERE id=$1`, [existing[0].id]);
        await pgQuery(`UPDATE books SET favorite_count=GREATEST(0,favorite_count-1) WHERE id=$1`, [book_id]);
        return { favorited: false };
      }
      await pgQuery(`INSERT INTO favorites (user_id,book_id) VALUES ($1,$2)`, [user_id, book_id]);
      await pgQuery(`UPDATE books SET favorite_count=favorite_count+1 WHERE id=$1`, [book_id]);
      return { favorited: true };
    }
    return withDb(db => {
      const idx = db.favorites.findIndex(f => f.user_id===user_id && f.book_id===book_id);
      const book = db.books.find(b => b.id === book_id);
      if (idx >= 0) {
        db.favorites.splice(idx, 1);
        if (book) book.favorite_count = Math.max(0, (book.favorite_count||0)-1);
        return { favorited:false };
      }
      db.favorites.push({ id: uuidv4(), user_id, book_id, created_at: new Date().toISOString() });
      if (book) book.favorite_count = (book.favorite_count||0)+1;
      return { favorited:true };
    });
  },
  async getFavorite(user_id, book_id) {
    if (isPg) {
      const rows = await pgQuery(
        `SELECT id FROM favorites WHERE user_id=$1 AND book_id=$2`, [user_id, book_id]);
      return { favorited: rows.length > 0 };
    }
    const db = loadJson();
    const exists = db.favorites.some(f => f.user_id===user_id && f.book_id===book_id);
    return { favorited: exists };
  },
  async getUserRating(user_id, book_id) {
    if (isPg) {
      const rows = await pgQuery(
        `SELECT rating FROM ratings WHERE user_id=$1 AND book_id=$2`, [user_id, book_id]);
      return rows.length ? rows[0].rating : 0;
    }
    const db = loadJson();
    const r = db.ratings.find(x => x.user_id===user_id && x.book_id===book_id);
    return r ? r.rating : 0;
  },
  async rateBook(user_id, book_id, rating) {
    if (isPg) {
      await pgQuery(
        `INSERT INTO ratings (user_id,book_id,rating) VALUES ($1,$2,$3)
         ON CONFLICT (user_id,book_id) DO UPDATE SET rating=EXCLUDED.rating`,
        [user_id, book_id, rating]);
      return;
    }
    await withDb(db => {
      let r = db.ratings.find(x => x.user_id===user_id && x.book_id===book_id);
      if (r) r.rating = rating;
      else db.ratings.push({ id: uuidv4(), user_id, book_id, rating,
                             created_at: new Date().toISOString() });
    });
  },
  async addComment({ user_id, book_id, chapter_id, parent_comment_id, content }) {
    const c = { id: uuidv4(), user_id, book_id, chapter_id: chapter_id||null,
                parent_comment_id: parent_comment_id||null, content,
                created_at: new Date().toISOString() };
    if (isPg) {
      await pgQuery(
        `INSERT INTO comments (id,user_id,book_id,chapter_id,parent_comment_id,content)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [c.id, c.user_id, c.book_id, c.chapter_id, c.parent_comment_id, c.content]);
      return c;
    }
    return withDb(db => {
      db.comments.push(c);
      return c;
    });
  },
  async listComments(book_id) {
    if (isPg) return await pgQuery(
      `SELECT c.*, u.display_name AS author_name, u.avatar_url AS author_avatar
         FROM comments c
         JOIN users u ON u.id=c.user_id
        WHERE c.book_id=$1 ORDER BY c.created_at ASC`, [book_id]);
    const db = loadJson();
    return db.comments.filter(c => c.book_id === book_id)
      .map(c => {
        const u = db.users.find(u => u.id === c.user_id) || {};
        return { ...c, author_name: u.display_name, author_avatar: u.avatar_url };
      });
  },
  async getComment(comment_id) {
    if (isPg) return (await pgQuery('SELECT * FROM comments WHERE id=$1', [comment_id]))[0] || null;
    const db = loadJson();
    return db.comments.find(c => c.id === comment_id) || null;
  },
  async deleteComment(comment_id) {
    if (isPg) {
      await pgQuery('DELETE FROM comments WHERE id=$1 OR parent_comment_id=$1', [comment_id]);
      return;
    }
    await withDb(db => {
      const ids = new Set([comment_id]);
      for (const c of db.comments) if (c.parent_comment_id === comment_id) ids.add(c.id);
      db.comments = db.comments.filter(c => !ids.has(c.id));
    });
  },

  // ---- ANNOUNCEMENTS ----
  async listAnnouncements() {
    if (isPg) {
      const rows = await pgQuery(
        `SELECT a.*, u.display_name AS created_by_name, u.role AS created_by_role
           FROM announcements a
           JOIN users u ON u.id = a.admin_id
          WHERE a.visible=true
          ORDER BY a.featured DESC, a.created_at DESC`);
      return rows.map(r => ({ ...r, created_by_role: r.created_by_role || 'admin' }));
    }
    const db = loadJson();
    let arr = db.announcements.filter(a => a.visible);
    arr = arr.sort((a,b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)
                  || b.created_at.localeCompare(a.created_at));
    return arr.map(a => ({
      ...a,
      created_by_name: a.created_by_name || (db.users.find(u => u.id === a.admin_id)||{}).display_name,
      created_by_role: a.created_by_role || 'admin'
    }));
  },
  async createAnnouncement({ admin_id, title, content, image_path, created_by_name, created_by_role }) {
    const a = { id: uuidv4(), admin_id, title, content,
                image_path: image_path||null, visible:true,
                created_by_name: created_by_name||null,
                created_by_role: created_by_role||'admin',
                published_by: null, featured: false,
                created_at: new Date().toISOString() };
    if (isPg) {
      await pgQuery(
        `INSERT INTO announcements (id,admin_id,title,content,image_path,visible,
                                     created_by_name,created_by_role,published_by,featured)
         VALUES ($1,$2,$3,$4,$5,true,$6,$7,$8,false)`,
        [a.id, a.admin_id, a.title, a.content, a.image_path,
         a.created_by_name, a.created_by_role, a.published_by]);
      return a;
    }
    return withDb(db => {
      db.announcements.push(a);
      return a;
    });
  },

  async getAnnouncement(id) {
    if (isPg) return (await pgQuery(`SELECT * FROM announcements WHERE id=$1`, [id]))[0] || null;
    const db = loadJson();
    return db.announcements.find(x => x.id === id) || null;
  },

  async deleteAnnouncement(id) {
    if (isPg) { await pgQuery(`UPDATE announcements SET visible=false WHERE id=$1`, [id]); return; }
    await withDb(db => {
      const a = db.announcements.find(x => x.id === id);
      if (a) a.visible = false;
    });
  },
  async setFeaturedAnnouncement(id) {
    if (isPg) {
      const rows = await pgQuery(`SELECT featured FROM announcements WHERE id=$1`, [id]);
      if (!rows.length) return;
      const [{ featured }] = rows;
      if (featured) {
        await pgQuery(`UPDATE announcements SET featured=false WHERE id=$1`, [id]);
      } else {
        await pgQuery(`UPDATE announcements SET featured=false WHERE featured=true`);
        await pgQuery(`UPDATE announcements SET featured=true WHERE id=$1`, [id]);
      }
      return;
    }
    await withDb(db => {
      const currentlyFeatured = db.announcements.find(a => a.featured);
      if (currentlyFeatured && currentlyFeatured.id === id) {
        for (const a of db.announcements) a.featured = false;
      } else {
        for (const a of db.announcements) a.featured = a.id === id;
      }
    });
  },
  async updateAnnouncement(id, { title, content, image_path }) {
    if (isPg) {
      await pgQuery(`UPDATE announcements SET title=$1, content=$2, image_path=$3 WHERE id=$4`, [title, content, image_path, id]);
      return;
    }
    await withDb(db => {
      const a = db.announcements.find(x => x.id === id);
      if (a) { a.title = title; a.content = content; a.image_path = image_path; }
    });
  },
  async updatePublishedBy(id, text) {
    if (isPg) { await pgQuery(`UPDATE announcements SET published_by=$1 WHERE id=$2`, [text, id]); return; }
    await withDb(db => {
      const a = db.announcements.find(x => x.id === id);
      if (a) a.published_by = text;
    });
  },

  // ---- METRICS (honestas: derivadas en vivo) ----
  async getMetrics() {
    if (isPg) {
      const [{ count: authors }] = await pgQuery(
        `SELECT count(DISTINCT author_id)::int AS count FROM books WHERE status='published'`);
      const [{ count: books }] = await pgQuery(
        `SELECT count(*)::int AS count FROM books WHERE status='published'`);
      const [{ sum: views }] = await pgQuery(
        `SELECT COALESCE(sum(views),0)::int AS sum FROM books WHERE status='published'`);
      return { authors_total: authors, books_total: books, views_total: views };
    }
    const db = loadJson();
    const published = db.books.filter(b => b.status === 'published');
    const authors   = new Set(published.map(b => b.author_id)).size;
    const books     = published.length;
    const views     = published.reduce((s,b) => s + (b.views||0), 0);
    return { authors_total: authors, books_total: books, views_total: views };
  },

  // ---- BAN / BLACKLIST ----
  async isEmailBanned(email) {
    if (isPg) {
      const r = await pgQuery(
        `SELECT * FROM banned_users WHERE email=$1 AND unbanned_at IS NULL`, [email]);
      return r[0] || null;
    }
    return loadJson().banned_users.find(b => b.email.toLowerCase()===email.toLowerCase() && !b.unbanned_at) || null;
  },
  async listBanned() {
    if (isPg) {
      const rows = await pgQuery(`SELECT * FROM banned_users ORDER BY banned_at DESC`);
      return this._groupBanRecords(rows);
    }
    const rows = loadJson().banned_users.slice().sort((a,b)=>b.banned_at.localeCompare(a.banned_at));
    return this._groupBanRecords(rows);
  },
  _groupBanRecords(rows) {
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
  async banUser({ email, reason, banned_by }) {
    if (isPg) {
      await pgQuery(
        `INSERT INTO banned_users (email,reason,banned_by) VALUES ($1,$2,$3)`,
        [email, reason, banned_by || null]);
      await pgQuery(`UPDATE users SET role='user' WHERE email=$1 AND role='moderator'`, [email]);
      return;
    }
    await withDb(db => {
      db.banned_users.push({ id: uuidv4(), email, reason,
                              banned_by: banned_by || null,
                              appeal: null, appeal_submitted: false,
                              banned_at: new Date().toISOString(), unbanned_at: null });
      const u = db.users.find(x => x.email.toLowerCase()===email.toLowerCase() && x.role === 'moderator');
      if (u) u.role = 'user';
    });
  },
  async unbanUser(email, unbanned_by) {
    if (isPg) {
      await pgQuery(
        `UPDATE banned_users SET unbanned_at=now(), unbanned_by=$2
         WHERE email=$1 AND unbanned_at IS NULL`,
        [email, unbanned_by || null]);
      return;
    }
    await withDb(db => {
      const b = db.banned_users.find(x => x.email.toLowerCase()===email.toLowerCase() && !x.unbanned_at);
      if (b) {
        b.unbanned_at = new Date().toISOString();
        b.unbanned_by = unbanned_by || null;
      }
    });
  },
  async deleteBanRecord(email) {
    if (isPg) {
      await pgQuery(`DELETE FROM banned_users WHERE email=$1`, [email]);
      return;
    }
    await withDb(db => {
      db.banned_users = db.banned_users.filter(x => x.email.toLowerCase() !== email.toLowerCase());
    });
  },
  async submitAppeal(email, appeal) {
    if (isPg) {
      await pgQuery(
        `UPDATE banned_users SET appeal=$1, appeal_submitted=true
         WHERE email=$2 AND unbanned_at IS NULL`,
        [appeal, email]);
      return;
    }
    await withDb(db => {
      const b = db.banned_users.find(x => x.email.toLowerCase()===email.toLowerCase() && !x.unbanned_at);
      if (b) { b.appeal = appeal; b.appeal_submitted = true; }
    });
  },
  async blacklistToken(token, user_email) {
    if (isPg) {
      await pgQuery(
        `INSERT INTO token_blacklist (token,user_email) VALUES ($1,$2)
         ON CONFLICT (token) DO NOTHING`, [token, user_email]);
      return;
    }
    await withDb(db => {
      if (!db.token_blacklist.find(t => t.token === token)) {
        db.token_blacklist.push({ id: uuidv4(), token, user_email,
                                  blacklisted_at: new Date().toISOString() });
      }
    });
  },
  async isTokenBlacklisted(token) {
    if (isPg) {
      const r = await pgQuery(`SELECT 1 FROM token_blacklist WHERE token=$1`, [token]);
      return r.length > 0;
    }
    return withDb(db => {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      db.token_blacklist = db.token_blacklist.filter(t => !t.blacklisted_at || new Date(t.blacklisted_at).getTime() > cutoff);
      return db.token_blacklist.some(t => t.token === token);
    });
  },
  async blacklistAllUserTokens(email) {
    // En la práctica: marcamos un email como "todos los tokens emitidos antes de
    // este instante son inválidos". Se persiste como entry especial en blacklist.
    if (isPg) {
      await pgQuery(
        `INSERT INTO token_blacklist (token,user_email) VALUES ($1,$2)
         ON CONFLICT (token) DO NOTHING`,
        ['*all-before-'+Date.now(), email]);
      return;
    }
    await withDb(db => {
      db.token_blacklist.push({ id: uuidv4(), token:'*all-before-'+Date.now(),
                                user_email: email,
                                blacklisted_at: new Date().toISOString() });
    });
  },
  async userTokensInvalidatedAfter(email) {
    if (isPg) {
      const r = await pgQuery(
        `SELECT MAX(blacklisted_at) AS ts FROM token_blacklist
         WHERE user_email=$1 AND token LIKE '*all-before-%'`, [email]);
      return r[0] && r[0].ts ? new Date(r[0].ts).getTime() : 0;
    }
    const db = loadJson();
    const tokens = db.token_blacklist.filter(t => t.user_email===email && t.token.startsWith('*all-before-'));
    if (!tokens.length) return 0;
    return Math.max(...tokens.map(t => new Date(t.blacklisted_at).getTime()));
  },

  // ---- REFRESH TOKENS ----
  async createRefreshToken(user_id) {
    const token = uuidv4();
    const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
    const entry = { id: uuidv4(), user_id, token, expires_at, created_at: new Date().toISOString(), used_at: null };
    if (isPg) {
      await pgQuery(
        `INSERT INTO refresh_tokens (id,user_id,token,expires_at) VALUES ($1,$2,$3,$4)`,
        [entry.id, entry.user_id, entry.token, entry.expires_at]);
      return token;
    }
    return withDb(db => {
      if (!db.refresh_tokens) db.refresh_tokens = [];
      db.refresh_tokens.push(entry);
      return token;
    });
  },
  async validateRefreshToken(token) {
    if (isPg) {
      const r = await pgQuery(
        `SELECT * FROM refresh_tokens WHERE token=$1 AND used_at IS NULL AND expires_at > now()`,
        [token]);
      return r[0] || null;
    }
    return withDb(db => {
      const now = new Date();
      if (db.refresh_tokens)
        db.refresh_tokens = db.refresh_tokens.filter(t => !t.used_at && new Date(t.expires_at) > now);
      return db.refresh_tokens?.find(t => t.token === token && !t.used_at) || null;
    });
  },
  async revokeRefreshToken(token) {
    if (isPg) {
      await pgQuery(`UPDATE refresh_tokens SET used_at=now() WHERE token=$1 AND used_at IS NULL`, [token]);
      return;
    }
    await withDb(db => {
      const t = db.refresh_tokens?.find(x => x.token === token);
      if (t) t.used_at = new Date().toISOString();
    });
  },
  async revokeAllUserRefreshTokens(user_id) {
    if (isPg) {
      await pgQuery(`UPDATE refresh_tokens SET used_at=now() WHERE user_id=$1 AND used_at IS NULL`, [user_id]);
      return;
    }
    await withDb(db => {
      for (const t of (db.refresh_tokens || [])) {
        if (t.user_id === user_id && !t.used_at) t.used_at = new Date().toISOString();
      }
    });
  },

  // ---- AUTHORS (solo usuarios CON libros publicados) ----
  async searchAuthors(q) {
    if (isPg) {
      return await pgQuery(
        `SELECT u.id, u.email, u.display_name, u.avatar_url, u.created_at,
                COUNT(b.id)::int AS book_count
         FROM users u
         JOIN books b ON b.author_id = u.id AND b.status = 'published'
         WHERE ($1 = '' OR u.display_name ILIKE '%' || $1 || '%' ESCAPE '\' OR u.email ILIKE '%' || $1 || '%' ESCAPE '\')
         GROUP BY u.id
         ORDER BY book_count DESC`,
        [q ? q.replace(/[%_\\]/g, '\\$&') : '']
      );
    }
    const db = loadJson();
    const published = db.books.filter(b => b.status === 'published');
    const authorIds = [...new Set(published.map(b => b.author_id))];
    let authors = db.users.filter(u => authorIds.includes(u.id));
    if (q) {
      const qq = q.toLowerCase();
      authors = authors.filter(u =>
        (u.display_name || '').toLowerCase().includes(qq) ||
        u.email.toLowerCase().includes(qq)
      );
    }
    return authors.map(u => ({
      id: u.id, email: u.email, display_name: u.display_name,
      avatar_url: u.avatar_url, created_at: u.created_at,
      book_count: published.filter(b => b.author_id === u.id).length
    })).sort((a, b) => b.book_count - a.book_count);
  },

  // ---- MODERATION LOG ----
  async logModeration({ actor_email, action, target, ip }) {
    if (isPg) {
      await pgQuery(
        `INSERT INTO moderation_logs (actor_email,action,target,ip)
         VALUES ($1,$2,$3,$4)`, [actor_email, action, target, ip]);
      return;
    }
    await withDb(db => {
      db.moderation_logs.push({ id: uuidv4(), actor_email, action, target, ip,
                                created_at: new Date().toISOString() });
    });
  },

  // ---- CATEGORIES ----
  async listCategories() {
    if (isPg) return (await pgQuery('SELECT name FROM categories ORDER BY name')).map(r => r.name);
    return withDb(db => {
      if (!db.categories) db.categories = ['fantasía','poesía','narrativa','educativa'];
      return db.categories;
    });
  },
  async createCategory(name) {
    if (isPg) { await pgQuery('INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]); return; }
    await withDb(db => {
      if (!db.categories) db.categories = [];
      if (!db.categories.includes(name)) db.categories.push(name);
    });
  },
  async deleteCategory(name) {
    if (isPg) {
      const cats = await pgQuery('SELECT 1 FROM categories WHERE name=$1', [name]);
      if (cats.length === 0) return false;
      await pgQuery(`UPDATE books SET category='en espera de categorización' WHERE category=$1`, [name]);
      await pgQuery('DELETE FROM categories WHERE name=$1', [name]);
      return true;
    }
    let found = false;
    await withDb(db => {
      const before = (db.categories || []).length;
      db.categories = (db.categories || []).filter(c => c !== name);
      found = db.categories.length < before;
      for (const b of db.books) {
        if (b.category === name) b.category = 'en espera de categorización';
      }
    });
    return found;
  },

  // ---- BOOKMARKS ----
  async listBookmarks(user_id) {
    if (isPg) {
      return await pgQuery(
        `SELECT b.*, bk.chapter_index, bk.scroll_position, bk.finished, bk.updated_at AS marked_at,
                bk.id AS bk_id
         FROM bookmarks bk
         JOIN books b ON b.id = bk.book_id
         WHERE bk.user_id=$1 AND b.status!='deleted'
         ORDER BY bk.updated_at DESC`, [user_id]);
    }
    const db = loadJson();
    return (db.bookmarks || [])
      .filter(bk => bk.user_id === user_id)
      .map(bk => {
        const book = db.books.find(b => b.id === bk.book_id);
        if (!book || book.status === 'deleted') return null;
        return { ...book, chapter_index: bk.chapter_index, scroll_position: bk.scroll_position,
                       finished: bk.finished, marked_at: bk.updated_at, bk_id: bk.id };
      })
      .filter(Boolean)
      .sort((a, b) => b.marked_at.localeCompare(a.marked_at));
  },
  async getBookmark(user_id, book_id) {
    if (isPg) {
      return (await pgQuery('SELECT * FROM bookmarks WHERE user_id=$1 AND book_id=$2',
        [user_id, book_id]))[0] || null;
    }
    const db = loadJson();
    return (db.bookmarks || []).find(bk => bk.user_id === user_id && bk.book_id === book_id) || null;
  },
  async upsertBookmark({ user_id, book_id, chapter_id, chapter_index, scroll_position, finished }) {
    const now = new Date().toISOString();
    if (isPg) {
      await pgQuery(
        `INSERT INTO bookmarks (user_id, book_id, chapter_id, chapter_index, scroll_position, finished, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7)
         ON CONFLICT (user_id, book_id) DO UPDATE
         SET chapter_id=EXCLUDED.chapter_id,
             chapter_index=EXCLUDED.chapter_index,
             scroll_position=EXCLUDED.scroll_position,
             finished=EXCLUDED.finished,
             updated_at=EXCLUDED.updated_at`,
        [user_id, book_id, chapter_id || null, chapter_index, scroll_position, !!finished, now]);
      return;
    }
    await withDb(db => {
      if (!db.bookmarks) db.bookmarks = [];
      const existing = db.bookmarks.find(bk => bk.user_id === user_id && bk.book_id === book_id);
      if (existing) {
        existing.chapter_id = chapter_id || null;
        existing.chapter_index = chapter_index;
        existing.scroll_position = scroll_position;
        existing.finished = !!finished;
        existing.updated_at = now;
      } else {
        db.bookmarks.push({ id: uuidv4(), user_id, book_id, chapter_id: chapter_id || null,
                            chapter_index, scroll_position, finished: !!finished,
                            created_at: now, updated_at: now });
      }
    });
  },
  async markFinished(user_id, book_id, finished) {
    const now = new Date().toISOString();
    if (isPg) {
      await pgQuery(
        `UPDATE bookmarks SET finished=$1, updated_at=$2 WHERE user_id=$3 AND book_id=$4`,
        [!!finished, now, user_id, book_id]);
      return;
    }
    await withDb(db => {
      const bk = (db.bookmarks || []).find(x => x.user_id === user_id && x.book_id === book_id);
      if (bk) { bk.finished = !!finished; bk.updated_at = now; }
    });
  },
  async deleteBookmark(user_id, book_id) {
    if (isPg) {
      await pgQuery('DELETE FROM bookmarks WHERE user_id=$1 AND book_id=$2', [user_id, book_id]);
      return;
    }
    await withDb(db => {
      db.bookmarks = (db.bookmarks || []).filter(bk => !(bk.user_id === user_id && bk.book_id === book_id));
    });
  },

  // ---- USER IMAGES (media library) ----
  async listUserImages(user_id) {
    if (isPg) return await pgQuery('SELECT * FROM user_images WHERE user_id=$1 ORDER BY sort_order ASC', [user_id]);
    return (loadJson().user_images || []).filter(i => i.user_id === user_id).sort((a,b) => (a.sort_order||0)-(b.sort_order||0));
  },
  async createUserImage({ user_id, storage_path, custom_name, sort_order }) {
    const id = uuidv4();
    if (isPg) {
      await pgQuery(
        'INSERT INTO user_images (id,user_id,storage_path,custom_name,sort_order) VALUES ($1,$2,$3,$4,$5)',
        [id, user_id, storage_path, custom_name, sort_order ?? 0]);
      return { id, user_id, storage_path, custom_name, sort_order: sort_order ?? 0 };
    }
    const img = { id, user_id, storage_path, custom_name, sort_order: sort_order ?? 0, created_at: new Date().toISOString() };
    return withDb(db => {
      if (!db.user_images) db.user_images = [];
      db.user_images.push(img);
      return img;
    });
  },
  async getUserImage(id) {
    if (isPg) { const r = await pgQuery('SELECT * FROM user_images WHERE id=$1', [id]); return r[0] || null; }
    return (loadJson().user_images || []).find(i => i.id === id) || null;
  },
  async getUserImageByCustomName(user_id, custom_name) {
    if (isPg) {
      const r = await pgQuery('SELECT * FROM user_images WHERE user_id=$1 AND custom_name=$2', [user_id, custom_name]);
      return r[0] || null;
    }
    return (loadJson().user_images || []).find(i => i.user_id === user_id && i.custom_name === custom_name) || null;
  },
  async updateUserImage(id, patch) {
    if (isPg) {
      const keys = Object.keys(patch); if (!keys.length) return;
      if (keys.some(k => !/^[a-z_]+$/.test(k))) throw new Error('Invalid column name');
      const sets = keys.map((k,i) => `"${k}"=$${i+1}`).join(',');
      await pgQuery(`UPDATE user_images SET ${sets} WHERE id=$${keys.length+1}`, [...keys.map(k => patch[k]), id]);
      return;
    }
    await withDb(db => {
      const img = (db.user_images || []).find(x => x.id === id);
      if (img) Object.assign(img, patch);
    });
  },
  async deleteUserImage(id) {
    if (isPg) { await pgQuery('DELETE FROM user_images WHERE id=$1', [id]); return; }
    await withDb(db => {
      db.user_images = (db.user_images || []).filter(x => x.id !== id);
    });
  },
  async checkUserImageNameAvailable(user_id, custom_name, excludeId) {
    if (isPg) {
      if (excludeId) {
        const r = await pgQuery('SELECT id FROM user_images WHERE user_id=$1 AND custom_name=$2 AND id!=$3', [user_id, custom_name, excludeId]);
        return r.length === 0;
      }
      const r = await pgQuery('SELECT id FROM user_images WHERE user_id=$1 AND custom_name=$2', [user_id, custom_name]);
      return r.length === 0;
    }
    const list = loadJson().user_images || [];
    return !list.some(i => i.user_id === user_id && i.custom_name === custom_name && i.id !== excludeId);
  },

  // ---- CHANGELOGS ----
  async listChangelogs() {
    if (isPg) {
      return await pgQuery('SELECT * FROM changelogs ORDER BY created_at DESC');
    }
      const list = loadJson().changelogs || [];
      return list.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async createChangelog({ version, title, entries }) {
    const now = new Date().toISOString();
    const entry = { id: uuidv4(), version, title, entries, created_at: now, updated_at: now };
    if (isPg) {
      await pgQuery(
        'INSERT INTO changelogs (id, version, title, entries) VALUES ($1,$2,$3,$4)',
        [entry.id, entry.version, entry.title, entry.entries]);
      return entry;
    }
    return withDb(db => {
      if (!db.changelogs) db.changelogs = [];
      db.changelogs.push(entry);
      return entry;
    });
  },
  async updateChangelog(id, { version, title, entries }) {
    if (isPg) {
      await pgQuery(
        'UPDATE changelogs SET version=$1, title=$2, entries=$3, updated_at=now() WHERE id=$4',
        [version, title, entries, id]);
      return;
    }
    await withDb(db => {
      if (!db.changelogs) db.changelogs = [];
      const e = db.changelogs.find(c => c.id === id);
      if (e) { e.version = version; e.title = title; e.entries = entries; e.updated_at = new Date().toISOString(); }
    });
  },
  async deleteChangelog(id) {
    if (isPg) {
      await pgQuery('DELETE FROM changelogs WHERE id=$1', [id]);
      return;
    }
    await withDb(db => {
      if (!db.changelogs) db.changelogs = [];
      db.changelogs = db.changelogs.filter(c => c.id !== id);
    });
  },
  async getChangelogConfig() {
    if (isPg) {
      const rows = await pgQuery("SELECT value FROM site_config WHERE key='changelog_link'");
      return rows.length ? parseJsonb(rows[0].value, { link_text: 'Ver historial de versiones', current_version: '1.0.0' }) : { link_text: 'Ver historial de versiones', current_version: '1.0.0' };
    }
    return { link_text: 'Ver historial de versiones', current_version: '1.0.0', ...(loadJson().changelog_config || {}) };
  },
  async updateChangelogConfig({ link_text, current_version }) {
    if (isPg) {
      await pgQuery(
        "INSERT INTO site_config (key, value) VALUES ('changelog_link', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
        [JSON.stringify({ link_text, current_version })]);
      return;
    }
    await withDb(db => {
      if (!db.changelog_config) db.changelog_config = {};
      db.changelog_config.link_text = link_text;
      db.changelog_config.current_version = current_version;
    });
  },
  async getEasterEggs() {
    if (isPg) {
      const rows = await pgQuery("SELECT value FROM site_config WHERE key='easter_eggs'");
      return rows.length ? parseJsonb(rows[0].value, []) : [];
    }
    return loadJson().easter_eggs || [];
  },
  async getEasterEgg(id) {
    const eggs = await this.getEasterEggs();
    return eggs.find(e => e.id === id) || null;
  },
  async updateEasterEggs(eggs) {
    if (isPg) {
      await pgQuery(
        "INSERT INTO site_config (key, value) VALUES ('easter_eggs', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
        [JSON.stringify(eggs)]);
      return;
    }
    await withDb(db => { db.easter_eggs = eggs; });
  },
  async getTeamProfiles() {
    if (isPg) {
      const rows = await pgQuery("SELECT value FROM site_config WHERE key='team_profiles'");
      return rows.length ? parseJsonb(rows[0].value, []) : [];
    }
    return loadJson().team_profiles || [];
  },
  async updateTeamProfile(id, data) {
    const profiles = await this.getTeamProfiles();
    const idx = profiles.findIndex(p => p.id === id);
    if (idx === -1) return null;
    profiles[idx] = { ...profiles[idx], ...data };
    if (isPg) {
      await pgQuery(
        "INSERT INTO site_config (key, value) VALUES ('team_profiles', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
        [JSON.stringify(profiles)]);
      return profiles[idx];
    }
    await withDb(db => { db.team_profiles = profiles; });
    return profiles[idx];
  },
  async reorderTeamProfiles(orderedIds) {
    const profiles = await this.getTeamProfiles();
    const map = {};
    profiles.forEach(p => { map[p.id] = p; });
    const reordered = orderedIds.map(id => map[id]).filter(Boolean);
    if (isPg) {
      await pgQuery(
        "INSERT INTO site_config (key, value) VALUES ('team_profiles', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
        [JSON.stringify(reordered)]);
      return reordered;
    }
    await withDb(db => { db.team_profiles = reordered; });
    return reordered;
  },
  async getTeamTitle() {
    if (isPg) {
      const rows = await pgQuery("SELECT value FROM site_config WHERE key='team_title'");
      return rows.length ? parseJsonb(rows[0].value, 'Nuestro Equipo') : 'Nuestro Equipo';
    }
    const db = loadJson();
    return db.team_title || 'Nuestro Equipo';
  },
  async setTeamTitle(title) {
    if (isPg) {
      await pgQuery(
        "INSERT INTO site_config (key, value) VALUES ('team_title', $1) ON CONFLICT (key) DO UPDATE SET value=$1",
        [JSON.stringify(title)]);
      return;
    }
    await withDb(db => { db.team_title = title; });
  }
};

module.exports = api;
