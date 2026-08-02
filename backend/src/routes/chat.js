const express = require('express');
const router = express.Router();
const cfg = require('../config');
const { createClient } = require('@supabase/supabase-js');
const { auth } = require('../middlewares/auth');
const db = require('../db');

let supabase;
function obtenerSupabase() {
  if (!supabase && cfg.SUPABASE_URL) supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_SERVICE_KEY);
  return supabase;
}
const TABLE = 'mensajes_chat';

async function asegurarTabla() {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: cfg.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      usuario_id TEXT,
      nombre_mostrado TEXT NOT NULL,
      contenido TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.end();
}

let tablaLista = false;

router.get('/mensajes', auth, async (req, res, next) => {
  try {
    if (!tablaLista) { await asegurarTabla(); tablaLista = true; }
    const since = req.query.since || new Date(0).toISOString();
    const client = obtenerSupabase();
    if (!client) return res.status(503).json({ error: 'Chat no disponible', code: 503 });
    const { data, error } = await client
      .from(TABLE)
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) throw error;
    res.json({ mensajes: data || [] });
  } catch (e) { next(e); }
});

router.post('/mensajes', auth, async (req, res, next) => {
  try {
    if (!tablaLista) { await asegurarTabla(); tablaLista = true; }
    const { contenido } = req.body;
    if (!contenido || !contenido.trim()) return res.status(400).json({ error: 'Mensaje requerido', code: 400 });
    const u = await db.obtenerUsuarioPorId(req.user.sub);
    const nombreMostrado = u?.nombre_mostrado || req.user.email?.split('@')[0] || 'Usuario';
    const client = obtenerSupabase();
    if (!client) return res.status(503).json({ error: 'Chat no disponible', code: 503 });
    const { data, error } = await client
      .from(TABLE)
      .insert({ contenido: contenido.trim().slice(0, 500), nombre_mostrado: nombreMostrado, usuario_id: req.user.sub })
      .select()
      .single();
    if (error) throw error;
    res.json({ mensaje: data });
  } catch (e) { next(e); }
});

module.exports = router;
