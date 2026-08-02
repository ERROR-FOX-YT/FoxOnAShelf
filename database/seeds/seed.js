#!/usr/bin/env node
/**
 * FoxOnAShelf™ - seed.js
 * Inserta los datos de ejemplo de forma idempotente.
 *
 * Estrategia:
 *   - Si DATABASE_URL apunta a Postgres -> ejecuta los .sql contra Postgres.
 *   - Si DB_MODE=json -> genera/actualiza backend/storage/db.json con los
 *     mismos datos (modo demo sin instalar Postgres).
 *
 * Hash de contraseñas: se regenera siempre con bcrypt (cost 10) para que
 * 'admin123' sea válido contra el código del backend.
 */

const fs       = require('fs');
const path     = require('path');
const bcrypt   = require(path.resolve(__dirname, '..', '..', 'backend', 'node_modules', 'bcryptjs'));

const DB_MODE  = process.env.DB_MODE || (process.env.DATABASE_URL ? 'postgres' : 'json');

const PASSWORD = 'admin123';
const HASH     = bcrypt.hashSync(PASSWORD, 10);

const users = [
  { id: '11111111-1111-1111-1111-111111111111',
    email: 'usuarioTest@foxonashelf.app', display_name: 'Usuario Test',
    role: 'creator', password_hash: HASH,
    contact_info: null, avatar_url: null,
    created_at: new Date().toISOString() },
  { id: '22222222-2222-2222-2222-222222222222',
    email: 'admin@foxonashelf.app', display_name: 'Administrador',
    role: 'admin', password_hash: HASH,
    contact_info: 'Discord oficial: https://discord.gg/j543pdNhae | contacto@foxonashelf.example',
    avatar_url: null,
    created_at: new Date().toISOString() },
  { id: '33333333-3333-3333-3333-333333333333',
    email: 'adminFox@foxonashelf.app', display_name: 'Admin Fox',
    role: 'admin', password_hash: HASH,
    contact_info: null, avatar_url: null,
    created_at: new Date().toISOString() },
  { id: '44444444-4444-4444-4444-444444444444',
    email: 'userTest@foxonashelf.app', display_name: 'Usuario Regular',
    role: 'user', password_hash: HASH,
    contact_info: null, avatar_url: null,
    created_at: new Date().toISOString() }
];

const books = [
  { id: 'aaaaaaaa-0001-0000-0000-000000000001',
    title: 'El Bosque de las Letras', subtitle: 'Cuento ilustrado para soñar',
    description: 'Un cuento corto para niños sobre un bosque donde las palabras cobran vida.',
    category: 'fantasia', age_group: 'infantil' },
  { id: 'aaaaaaaa-0001-0000-0000-000000000002',
    title: 'La Maestra Lupa', subtitle: 'Aprender jugando',
    description: 'Historia educativa sobre la curiosidad y los números.',
    category: 'educativa', age_group: 'infantil' },
  { id: 'aaaaaaaa-0002-0000-0000-000000000001',
    title: 'Brújula Rota', subtitle: 'Aventura adolescente',
    description: 'Una novela corta sobre crecer y encontrar dirección.',
    category: 'narrativa', age_group: 'adolescente' },
  { id: 'aaaaaaaa-0002-0000-0000-000000000002',
    title: 'Versos del Recreo', subtitle: 'Poemario adolescente',
    description: 'Poemas sobre amistad, escuela y descubrir el mundo.',
    category: 'poesia', age_group: 'adolescente' },
  { id: 'aaaaaaaa-0003-0000-0000-000000000001',
    title: 'Cenizas del Ayer', subtitle: 'Novela adulto contemporánea',
    description: 'Una reflexión sobre pérdida, memoria y segundas oportunidades.',
    category: 'narrativa', age_group: 'adulto' },
  { id: 'aaaaaaaa-0003-0000-0000-000000000002',
    title: 'El Último Vagón', subtitle: 'Relato adulto contemporáneo',
    description: 'Dos desconocidos conversan en un tren y cambian sus vidas.',
    category: 'narrativa', age_group: 'adulto' }
].map(b => ({
  ...b,
  author_id: '11111111-1111-1111-1111-111111111111',
  status: 'published',
  is_free: true,
  price_cents: 0,
  cover_url: null,
  original_file: null,
  original_public: false,
  favorite_count: 0,
  views: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}));

const chapters = [
  ['bbbbbbbb-0001-0000-0000-000000000001', books[0].id, 'Capítulo 1 — La hoja despierta',
   'Era una mañana tibia cuando las letras del bosque empezaron a moverse...\n\nLa pequeña Luna escuchó un susurro entre las hojas. Las palabras brillaban con luz propia y danzaban alrededor de los árboles.\n\n—Ven —dijo una letra dorada—, te llevaré al corazón del bosque.\n\nY así comenzó la aventura más maravillosa que Luna jamás había imaginado.'],
  ['bbbbbbbb-0001-0000-0000-000000000002', books[1].id, 'Capítulo 1 — Cuenta conmigo',
   'La maestra Lupa enseñaba que cada número tenía un secreto. El 1 era el inicio de todo, el 2 la compañía, el 3 la magia.\n\n—Hoy descubriremos por qué el 7 es el número más curioso —dijo Lupa, ajustando sus gafas redondas.\n\nLos niños se sentaron en círculo, listos para aprender jugando.'],
  ['bbbbbbbb-0002-0000-0000-000000000001', books[2].id, 'Capítulo 1 — El norte perdido',
   'Cuando Camila abrió la mochila, su brújula ya no señalaba ningún lado. La aguja giraba sin rumbo, como si hubiera olvidado su propósito.\n\n—Esto no me gusta —murmuró.\n\nA su alrededor, el bosque se extendía denso y desconocido.\n\n—Tranquila —dijo una voz detrás de ella—. Tal vez la brújula no esté rota. Tal vez el norte se haya movido.'],
  ['bbbbbbbb-0002-0000-0000-000000000002', books[3].id, 'Poemas del Recreo',
   'A veces el recreo / es la única estrofa / donde caben todos.\n\nEl timbre suena / y estallan las risas / como versos libres.\n\nEn la cancha / las voces se mezclan / formando un coro / que nadie dirige.\n\nEl cielo azul / es el techo / de esta clase sin paredes.\n\nY cuando vuelve el silencio / cada quien guarda / un poema en el bolsillo.'],
  ['bbbbbbbb-0003-0000-0000-000000000001', books[4].id, 'Capítulo 1 — El eco del ayer',
   'Las cenizas aún flotaban en el aire cuando Elena comprendió que no habría vuelta atrás. La casa de su abuela ya no existía, pero los recuerdos seguían ahí, incólumes.\n\nRecogió una fotografía carbonizada en una esquina.\n\n—Tenía razón —susurró.\n\nY entre los escombros, empezó a reconstruir lo que el tiempo había desgastado.'],
  ['bbbbbbbb-0003-0000-0000-000000000002', books[5].id, 'Capítulo 1 — El encuentro',
   'El vagón estaba prácticamente vacío. Solo un hombre de mirada cansada ocupaba el asiento del fondo, junto a la ventana. Carla dudó un segundo antes de sentarse frente a él.\n\n—Buenas noches —dijo ella, rompiendo el silencio.\n\nEl hombre levantó la vista. Tenía los ojos color miel y una sonrisa que parecía guardar más preguntas que respuestas.\n\n—¿Cree en las segundas oportunidades? —preguntó él, sin preámbulos.\n\nCarla no supo qué responder. Pero intuyó que esa conversación cambiaría algo en ella.']
].map(([id, book_id, title, content], idx) => ({
  id, book_id, title, content,
  order: 1, is_early_access: false,
  created_at: new Date().toISOString()
}));

const announcements = [
  { id: 'cccccccc-0000-0000-0000-000000000001',
    admin_id: '22222222-2222-2222-2222-222222222222',
    title: 'Bienvenido a FoxOnAShelf',
    content: 'Plataforma de lectura digital abierta y justa. Comienza explorando libros gratuitos.',
    image_path: null, visible: true,
    created_at: new Date().toISOString() }
];

async function seedPostgres() {
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const migration = fs.readFileSync(path.join(__dirname, '..', 'migrations', '001_create_tables.sql'), 'utf8');
  await client.query(migration);

  for (const u of users) {
    await client.query(
      `INSERT INTO users (id,email,password_hash,display_name,role,contact_info)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (email) DO UPDATE
         SET password_hash=EXCLUDED.password_hash,
             display_name=EXCLUDED.display_name,
             role=EXCLUDED.role,
             contact_info=COALESCE(EXCLUDED.contact_info,users.contact_info)`,
      [u.id, u.email, u.password_hash, u.display_name, u.role, u.contact_info]
    );
  }

  for (const b of books) {
    await client.query(
      `INSERT INTO books (id,title,subtitle,description,author_id,status,is_free,
                          price_cents,category,age_group,favorite_count,views)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE
         SET title=EXCLUDED.title,subtitle=EXCLUDED.subtitle,
             description=EXCLUDED.description,category=EXCLUDED.category,
             age_group=EXCLUDED.age_group,status=EXCLUDED.status`,
      [b.id,b.title,b.subtitle,b.description,b.author_id,b.status,b.is_free,
       b.price_cents,b.category,b.age_group,b.favorite_count,b.views]
    );
  }

  for (const c of chapters) {
    await client.query(
      `INSERT INTO chapters (id,book_id,title,content,"order",is_early_access)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,content=EXCLUDED.content`,
      [c.id,c.book_id,c.title,c.content,c.order,c.is_early_access]
    );
  }

  for (const a of announcements) {
    await client.query(
      `INSERT INTO announcements (id,admin_id,title,content,image_path,visible)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,content=EXCLUDED.content`,
      [a.id,a.admin_id,a.title,a.content,a.image_path,a.visible]
    );
  }

  await client.end();
  console.log('[seed] Postgres listo. Cuentas: usuarioTest@foxonashelf.app, admin@foxonashelf.app (admin123).');
}

function seedJson() {
  const target = path.join(__dirname, '..', '..', 'backend', 'storage', 'db.json');
  fs.mkdirSync(path.dirname(target), { recursive: true });

  let db = { users:[], books:[], chapters:[], images:[], favorites:[], ratings:[],
             comments:[], collections:[], collection_books:[], notifications:[],
             announcements:[], metrics:[], banned_users:[], token_blacklist:[],
             moderation_logs:[], book_views:[],
             refresh_tokens:[],
             categories:['fantasía','poesía','narrativa','educativa'],
             bookmarks:[] };
  if (fs.existsSync(target)) {
    try { db = JSON.parse(fs.readFileSync(target, 'utf8')); }
    catch (e) { console.warn('db.json corrupto, regenerando.'); }
  }

  const upsert = (arr, key, items) => {
    for (const it of items) {
      const idx = arr.findIndex(x => x[key] === it[key]);
      if (idx >= 0) arr[idx] = { ...arr[idx], ...it };
      else arr.push(it);
    }
  };

  upsert(db.users, 'email', users);
  upsert(db.books, 'id', books);
  upsert(db.chapters, 'id', chapters);
  upsert(db.announcements, 'id', announcements);
  // banned_users vacío por requisito
  db.banned_users = db.banned_users || [];

  fs.writeFileSync(target, JSON.stringify(db, null, 2));
  console.log('[seed] db.json regenerado en', target);
  console.log('[seed] Cuentas: usuarioTest@foxonashelf.app, admin@foxonashelf.app  (contraseña: admin123)');
}

(async () => {
  if (DB_MODE === 'postgres') {
    try {
      await seedPostgres();
    } catch (e) {
      console.error('[seed] Error en Postgres, cayendo a modo JSON:', e.message);
      seedJson();
    }
  } else {
    seedJson();
  }
})();
