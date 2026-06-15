const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: 'postgresql://postgres.sboivucusckfdikmitzv:Book5helf_2026_Supabase!@aws-1-us-west-1.pooler.supabase.com:5432/postgres'
});

async function run() {
  const db = JSON.parse(fs.readFileSync('D:/ProyectoBookShelf/BookShelf/backend/storage/db.json', 'utf8'));

  // Ensure site_config table exists
  await pool.query('CREATE TABLE IF NOT EXISTS site_config (key text PRIMARY KEY, value jsonb NOT NULL)');

  // Ensure images table exists (migration 001 may have been partial)
  await pool.query(`CREATE TABLE IF NOT EXISTS images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid REFERENCES users(id) ON DELETE SET NULL,
    book_id uuid REFERENCES books(id) ON DELETE CASCADE,
    storage_path text NOT NULL,
    alt_text text,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);

  // --- USERS ---
  if (db.users?.length) {
    for (const u of db.users) {
      await pool.query(
        `INSERT INTO users (id, email, password_hash, display_name, avatar_url, role, contact_info, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO UPDATE SET email=EXCLUDED.email`,
        [u.id, u.email, u.password_hash, u.display_name || null, u.avatar_url || null,
         u.role || 'user', u.contact_info || null, u.created_at || new Date().toISOString()]
      ).catch(e => console.log('SKIP user', u.email, e.message.substring(0,80)));
    }
    console.log('Users:', db.users.length);
  }

  // --- BOOKS ---
  if (db.books?.length) {
    for (const b of db.books) {
      await pool.query(
        `INSERT INTO books (id, title, subtitle, description, author_id, status, is_free, price_cents, category, age_group, cover_url, original_file, original_public, favorite_count, views, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title`,
        [b.id, b.title, b.subtitle||null, b.description||null, b.author_id, b.status||'draft',
         b.is_free??true, b.price_cents||0, b.category||null, b.age_group||null,
         b.cover_url||null, b.original_file||null, b.original_public||false,
         b.favorite_count||0, b.views||0, b.created_at, b.updated_at||b.created_at]
      ).catch(e => console.log('SKIP book', b.id, e.message.substring(0,80)));
    }
    console.log('Books:', db.books.length);
  }

  // --- CHAPTERS ---
  if (db.chapters?.length) {
    for (const c of db.chapters) {
      await pool.query(
        `INSERT INTO chapters (id, book_id, title, content, "order", is_early_access, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title`,
        [c.id, c.book_id, c.title||null, c.content||null, c.order||1, c.is_early_access||false, c.created_at]
      ).catch(e => console.log('SKIP chapter', c.id, e.message.substring(0,80)));
    }
    console.log('Chapters:', db.chapters.length);
  }

  // --- ANNOUNCEMENTS ---
  if (db.announcements?.length) {
    for (const a of db.announcements) {
      await pool.query(
        `INSERT INTO announcements (id, admin_id, title, content, image_path, visible, featured, created_by_name, created_by_role, published_by, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title`,
        [a.id, a.admin_id||null, a.title, a.content, a.image_path||null,
         a.visible??true, a.featured||false, a.created_by_name||null, a.created_by_role||'admin',
         a.published_by||null, a.created_at]
      ).catch(e => console.log('SKIP announcement', a.id, e.message.substring(0,80)));
    }
    console.log('Announcements:', db.announcements.length);
  }

  // --- COMMENTS ---
  if (db.comments?.length) {
    for (const c of db.comments) {
      await pool.query(
        `INSERT INTO comments (id, user_id, book_id, chapter_id, parent_comment_id, content, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [c.id, c.user_id, c.book_id||null, c.chapter_id||null, c.parent_comment_id||null, c.content, c.created_at]
      ).catch(e => console.log('SKIP comment', c.id, e.message.substring(0,80)));
    }
    console.log('Comments:', db.comments.length);
  }

  // --- FAVORITES ---
  if (db.favorites?.length) {
    for (const f of db.favorites) {
      await pool.query(
        `INSERT INTO favorites (id, user_id, book_id, created_at) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [f.id, f.user_id, f.book_id, f.created_at]
      ).catch(e => console.log('SKIP favorite', e.message.substring(0,80)));
    }
    console.log('Favorites:', db.favorites.length);
  }

  // --- RATINGS ---
  if (db.ratings?.length) {
    for (const r of db.ratings) {
      await pool.query(
        `INSERT INTO ratings (id, user_id, book_id, rating, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [r.id, r.user_id, r.book_id, r.rating, r.created_at]
      ).catch(e => console.log('SKIP rating', e.message.substring(0,80)));
    }
    console.log('Ratings:', db.ratings.length);
  }

  // --- BANNED USERS ---
  if (db.banned_users?.length) {
    for (const b of db.banned_users) {
      await pool.query(
        `INSERT INTO banned_users (id, email, reason, appeal, appeal_submitted, banned_at, unbanned_at, deleted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO UPDATE SET reason=EXCLUDED.reason`,
        [b.id, b.email, b.reason||'', b.appeal||null, b.appeal_submitted||false, b.banned_at, b.unbanned_at||null, b.deleted_at||null]
      ).catch(e => console.log('SKIP banned', e.message.substring(0,80)));
    }
    console.log('Banned users:', db.banned_users.length);
  }

  // --- TOKEN BLACKLIST ---
  if (db.token_blacklist?.length) {
    for (const t of db.token_blacklist) {
      await pool.query(
        `INSERT INTO token_blacklist (id, token, user_email, blacklisted_at) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
        [t.id, t.token, t.user_email, t.blacklisted_at]
      ).catch(e => console.log('SKIP token', e.message.substring(0,80)));
    }
    console.log('Token blacklist:', db.token_blacklist.length);
  }

  // --- MODERATION LOGS ---
  if (db.moderation_logs?.length) {
    for (const l of db.moderation_logs) {
      await pool.query(
        `INSERT INTO moderation_logs (id, actor_email, action, target, ip, created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [l.id, l.actor_email, l.action, l.target||null, l.ip||null, l.created_at]
      ).catch(e => console.log('SKIP modlog', e.message.substring(0,80)));
    }
    console.log('Moderation logs:', db.moderation_logs.length);
  }

  // --- COLLECTIONS ---
  if (db.collections?.length) {
    for (const c of db.collections) {
      await pool.query(
        `INSERT INTO collections (id, owner_id, title, description, is_public, created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [c.id, c.owner_id, c.title, c.description||null, c.is_public??true, c.created_at]
      ).catch(e => console.log('SKIP collection', e.message.substring(0,80)));
    }
  }
  if (db.collection_books?.length) {
    for (const cb of db.collection_books) {
      await pool.query(
        `INSERT INTO collection_books (collection_id, book_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [cb.collection_id, cb.book_id]
      ).catch(e => {});
    }
  }
  console.log('Collections:', (db.collections||[]).length);

  // --- BOOK VIEWS ---
  if (db.book_views?.length) {
    for (const v of db.book_views) {
      await pool.query(
        `INSERT INTO book_views (user_id, book_id, created_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [v.user_id, v.book_id, v.created_at]
      ).catch(e => {});
    }
    console.log('Book views:', db.book_views.length);
  }

  // --- NOTIFICATIONS ---
  if (db.notifications?.length) {
    for (const n of db.notifications) {
      await pool.query(
        `INSERT INTO notifications (id, user_id, type, payload, is_read, created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [n.id, n.user_id, n.type, JSON.stringify(n.payload||{}), n.is_read||false, n.created_at]
      ).catch(e => console.log('SKIP notification', e.message.substring(0,80)));
    }
    console.log('Notifications:', db.notifications.length);
  }

  // --- IMAGES ---
  if (db.images?.length) {
    for (const img of db.images) {
      await pool.query(
        `INSERT INTO images (id, owner_id, book_id, storage_path, alt_text, created_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [img.id, img.owner_id||null, img.book_id||null, img.storage_path, img.alt_text||null, img.created_at]
      ).catch(e => console.log('SKIP image', e.message.substring(0,80)));
    }
    console.log('Images:', db.images.length);
  }

  // --- site_config entries ---
  const configMap = {};
  if (db.current_version) configMap.current_version = JSON.stringify(db.current_version);
  if (db.team_title) configMap.team_title = JSON.stringify(db.team_title);
  if (db.team_profiles) configMap.team_profiles = JSON.stringify(db.team_profiles);
  if (db.easter_eggs) configMap.easter_eggs = JSON.stringify(db.easter_eggs);
  if (db.changelogs) configMap.changelogs = JSON.stringify(db.changelogs);

  for (const [key, val] of Object.entries(configMap)) {
    await pool.query(
      `INSERT INTO site_config (key, value) VALUES ($1,$2::jsonb) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,
      [key, val]
    ).catch(e => console.log('SKIP config', key, e.message.substring(0,80)));
  }
  console.log('site_config entries:', Object.keys(configMap).length);

  console.log('\nMigration complete!');
  await pool.end();
}

run().catch(e => { console.error(e); process.exit(1); });
