/**
 * Booked™ - Capa de acceso a datos
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
  return JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
}
function saveJson(db) {
  fs.writeFileSync(JSON_PATH, JSON.stringify(db, null, 2));
}
function emptyDb() {
  return { users:[], books:[], chapters:[], images:[], favorites:[], ratings:[],
           comments:[], collections:[], collection_books:[], notifications:[],
           announcements:[], metrics:[], banned_users:[], token_blacklist:[],
           moderation_logs:[] };
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

// ---------------------------------------------------------------------
// API uniforme
// ---------------------------------------------------------------------
const api = {
  // ---- USERS ----
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
                   is_admin_fox:false, avatar_url:null, contact_info:null,
                   created_at: new Date().toISOString() };
    if (isPg) {
      await pgQuery(
        `INSERT INTO users (id,email,password_hash,display_name,role) VALUES ($1,$2,$3,$4,$5)`,
        [id, email, password_hash, display_name, role]);
      return user;
    }
    const db = loadJson();
    db.users.push(user); saveJson(db);
    return user;
  },
  async updateUserContactInfo(id, contact_info) {
    if (isPg) { await pgQuery('UPDATE users SET contact_info=$1 WHERE id=$2', [contact_info, id]); return; }
    const db = loadJson();
    const u = db.users.find(x => x.id === id);
    if (u) { u.contact_info = contact_info; saveJson(db); }
  },
  async listModerators() {
    if (isPg) return await pgQuery(
      `SELECT id,email,display_name,role,is_admin_fox,created_at
         FROM users WHERE role IN ('moderator','admin')`);
    return loadJson().users.filter(u => ['moderator','admin'].includes(u.role));
  },

  // ---- BOOKS ----
  async listBooks({ category, age_group, q, status='published', limit=50, offset=0 } = {}) {
    if (isPg) {
      const where = ['status=$1']; const params=[status];
      if (category) { params.push(category); where.push(`category=$${params.length}`); }
      if (age_group) { params.push(age_group); where.push(`age_group=$${params.length}`); }
      if (q) { params.push('%'+q+'%'); where.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`); }
      params.push(limit); params.push(offset);
      return await pgQuery(
        `SELECT b.*, u.display_name AS author_name FROM books b
           JOIN users u ON u.id = b.author_id
          WHERE ${where.join(' AND ')}
          ORDER BY b.views DESC, b.created_at DESC
          LIMIT $${params.length-1} OFFSET $${params.length}`, params);
    }
    const db = loadJson();
    let arr = db.books.filter(b => b.status === status);
    if (category)  arr = arr.filter(b => b.category === category);
    if (age_group) arr = arr.filter(b => b.age_group === age_group);
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
  async incrementViews(id) {
    if (isPg) { await pgQuery('UPDATE books SET views=views+1 WHERE id=$1', [id]); return; }
    const db = loadJson();
    const b = db.books.find(x => x.id === id);
    if (b) { b.views = (b.views||0)+1; saveJson(db); }
  },
  async createBook(book) {
    const now = new Date().toISOString();
    const full = { id: book.id || uuidv4(), favorite_count:0, views:0,
                   status:'draft', is_free:true, price_cents:0,
                   original_file:null, original_public:false, cover_url:null,
                   created_at: now, updated_at: now, ...book };
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
    const db = loadJson();
    db.books.push(full); saveJson(db);
    return full;
  },
  async updateBook(id, patch) {
    if (isPg) {
      const keys = Object.keys(patch); if (!keys.length) return await api.getBook(id);
      const sets = keys.map((k,i) => `"${k}"=$${i+1}`).join(',');
      await pgQuery(
        `UPDATE books SET ${sets}, updated_at=now() WHERE id=$${keys.length+1}`,
        [...keys.map(k => patch[k]), id]);
      return await api.getBook(id);
    }
    const db = loadJson();
    const b = db.books.find(x => x.id === id);
    if (b) { Object.assign(b, patch); b.updated_at = new Date().toISOString(); saveJson(db); }
    return b;
  },
  async deleteBook(id) {
    if (isPg) { await pgQuery(`UPDATE books SET status='deleted' WHERE id=$1`, [id]); return; }
    const db = loadJson();
    const b = db.books.find(x => x.id === id);
    if (b) { b.status = 'deleted'; saveJson(db); }
  },

  // ---- CHAPTERS ----
  async listChapters(book_id) {
    if (isPg) return await pgQuery(
      `SELECT * FROM chapters WHERE book_id=$1 ORDER BY "order" ASC`, [book_id]);
    return loadJson().chapters.filter(c => c.book_id === book_id)
                              .sort((a,b) => (a.order||0)-(b.order||0));
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
    const db = loadJson();
    db.chapters.push(c); saveJson(db);
    return c;
  },
  async updateChapter(id, patch) {
    if (isPg) {
      const keys = Object.keys(patch); if (!keys.length) return;
      const sets = keys.map((k,i) => `"${k}"=$${i+1}`).join(',');
      await pgQuery(
        `UPDATE chapters SET ${sets} WHERE id=$${keys.length+1}`,
        [...keys.map(k => patch[k]), id]);
      return;
    }
    const db = loadJson();
    const c = db.chapters.find(x => x.id === id);
    if (c) { Object.assign(c, patch); saveJson(db); }
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
    const db = loadJson();
    const idx = db.favorites.findIndex(f => f.user_id===user_id && f.book_id===book_id);
    const book = db.books.find(b => b.id === book_id);
    if (idx >= 0) {
      db.favorites.splice(idx, 1);
      if (book) book.favorite_count = Math.max(0, (book.favorite_count||0)-1);
      saveJson(db);
      return { favorited:false };
    }
    db.favorites.push({ id: uuidv4(), user_id, book_id, created_at: new Date().toISOString() });
    if (book) book.favorite_count = (book.favorite_count||0)+1;
    saveJson(db);
    return { favorited:true };
  },
  async rateBook(user_id, book_id, rating) {
    if (isPg) {
      await pgQuery(
        `INSERT INTO ratings (user_id,book_id,rating) VALUES ($1,$2,$3)
         ON CONFLICT (user_id,book_id) DO UPDATE SET rating=EXCLUDED.rating`,
        [user_id, book_id, rating]);
      return;
    }
    const db = loadJson();
    let r = db.ratings.find(x => x.user_id===user_id && x.book_id===book_id);
    if (r) r.rating = rating;
    else db.ratings.push({ id: uuidv4(), user_id, book_id, rating,
                           created_at: new Date().toISOString() });
    saveJson(db);
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
    const db = loadJson(); db.comments.push(c); saveJson(db);
    return c;
  },
  async listComments(book_id) {
    if (isPg) return await pgQuery(
      `SELECT c.*, u.display_name AS author_name FROM comments c
       JOIN users u ON u.id=c.user_id
       WHERE c.book_id=$1 ORDER BY c.created_at ASC`, [book_id]);
    const db = loadJson();
    return db.comments.filter(c => c.book_id === book_id)
      .map(c => ({ ...c, author_name: (db.users.find(u => u.id===c.user_id)||{}).display_name }));
  },

  // ---- ANNOUNCEMENTS ----
  async listAnnouncements() {
    if (isPg) return await pgQuery(
      `SELECT * FROM announcements WHERE visible=true ORDER BY created_at DESC`);
    return loadJson().announcements.filter(a => a.visible)
                                   .sort((a,b) => b.created_at.localeCompare(a.created_at));
  },
  async createAnnouncement({ admin_id, title, content, image_path }) {
    const a = { id: uuidv4(), admin_id, title, content,
                image_path: image_path||null, visible:true,
                created_at: new Date().toISOString() };
    if (isPg) {
      await pgQuery(
        `INSERT INTO announcements (id,admin_id,title,content,image_path,visible)
         VALUES ($1,$2,$3,$4,$5,true)`,
        [a.id, a.admin_id, a.title, a.content, a.image_path]);
      return a;
    }
    const db = loadJson(); db.announcements.push(a); saveJson(db);
    return a;
  },

  // ---- METRICS (honestas: derivadas en vivo) ----
  async getMetrics() {
    if (isPg) {
      const [{ count: authors }] = await pgQuery(
        `SELECT count(*)::int AS count FROM users WHERE role='creator'`);
      const [{ count: books }] = await pgQuery(
        `SELECT count(*)::int AS count FROM books WHERE status='published'`);
      const [{ sum: views }] = await pgQuery(
        `SELECT COALESCE(sum(views),0)::int AS sum FROM books WHERE status='published'`);
      return { authors_total: authors, books_total: books, views_total: views };
    }
    const db = loadJson();
    const authors = db.users.filter(u => u.role === 'creator').length;
    const books   = db.books.filter(b => b.status === 'published').length;
    const views   = db.books.filter(b => b.status === 'published')
                            .reduce((s,b) => s + (b.views||0), 0);
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
    if (isPg) return await pgQuery(`SELECT * FROM banned_users ORDER BY banned_at DESC`);
    return loadJson().banned_users.slice().sort((a,b)=>b.banned_at.localeCompare(a.banned_at));
  },
  async banUser({ email, reason }) {
    if (isPg) {
      await pgQuery(
        `INSERT INTO banned_users (email,reason) VALUES ($1,$2)
         ON CONFLICT (email) DO UPDATE SET reason=EXCLUDED.reason, banned_at=now(), unbanned_at=NULL`,
        [email, reason]);
      return;
    }
    const db = loadJson();
    let b = db.banned_users.find(x => x.email.toLowerCase()===email.toLowerCase());
    if (b) { b.reason = reason; b.banned_at = new Date().toISOString(); b.unbanned_at = null; }
    else db.banned_users.push({ id: uuidv4(), email, reason, appeal:null,
                                appeal_submitted:false,
                                banned_at: new Date().toISOString(), unbanned_at:null });
    saveJson(db);
  },
  async unbanUser(email) {
    if (isPg) {
      await pgQuery(`UPDATE banned_users SET unbanned_at=now() WHERE email=$1`, [email]);
      return;
    }
    const db = loadJson();
    const b = db.banned_users.find(x => x.email.toLowerCase()===email.toLowerCase());
    if (b) { b.unbanned_at = new Date().toISOString(); saveJson(db); }
  },
  async submitAppeal(email, appeal) {
    if (isPg) {
      await pgQuery(
        `UPDATE banned_users SET appeal=$1, appeal_submitted=true
         WHERE email=$2 AND appeal_submitted=false`, [appeal, email]);
      return;
    }
    const db = loadJson();
    const b = db.banned_users.find(x => x.email.toLowerCase()===email.toLowerCase());
    if (b && !b.appeal_submitted) { b.appeal = appeal; b.appeal_submitted = true; saveJson(db); }
  },
  async blacklistToken(token, user_email) {
    if (isPg) {
      await pgQuery(
        `INSERT INTO token_blacklist (token,user_email) VALUES ($1,$2)
         ON CONFLICT (token) DO NOTHING`, [token, user_email]);
      return;
    }
    const db = loadJson();
    if (!db.token_blacklist.find(t => t.token === token)) {
      db.token_blacklist.push({ id: uuidv4(), token, user_email,
                                blacklisted_at: new Date().toISOString() });
      saveJson(db);
    }
  },
  async isTokenBlacklisted(token) {
    if (isPg) {
      const r = await pgQuery(`SELECT 1 FROM token_blacklist WHERE token=$1`, [token]);
      return r.length > 0;
    }
    return loadJson().token_blacklist.some(t => t.token === token);
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
    const db = loadJson();
    db.token_blacklist.push({ id: uuidv4(), token:'*all-before-'+Date.now(),
                              user_email: email,
                              blacklisted_at: new Date().toISOString() });
    saveJson(db);
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

  // ---- MODERATION LOG ----
  async logModeration({ actor_email, action, target, ip }) {
    if (isPg) {
      await pgQuery(
        `INSERT INTO moderation_logs (actor_email,action,target,ip)
         VALUES ($1,$2,$3,$4)`, [actor_email, action, target, ip]);
      return;
    }
    const db = loadJson();
    db.moderation_logs.push({ id: uuidv4(), actor_email, action, target, ip,
                              created_at: new Date().toISOString() });
    saveJson(db);
  }
};

module.exports = api;
