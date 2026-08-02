const { createClient } = require('@supabase/supabase-js');
const cfg = require('../config');

const BUCKET = 'bookshelf';

let supabase = null;
let bucketReady = false;

function getClient() {
  if (supabase) return supabase;
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL y SUPABASE_SERVICE_KEY requeridos para cloud storage');
  }
  supabase = createClient(cfg.SUPABASE_URL, cfg.SUPABASE_SERVICE_KEY);
  return supabase;
}

async function ensureBucket() {
  if (bucketReady) return;
  const sb = getClient();
  const { data: buckets } = await sb.storage.listBuckets();
  if (!buckets?.some(b => b.name === BUCKET)) {
    const { error } = await sb.storage.createBucket(BUCKET, { public: true });
    if (error && !error.message?.includes('already exists')) throw error;
  }
  bucketReady = true;
}

async function uploadFile(buffer, filePath, contentType) {
  await ensureBucket();
  const sb = getClient();
  const { error } = await sb.storage.from(BUCKET).upload(filePath, buffer, {
    contentType,
    upsert: true
  });
  if (error) throw error;
  const { data } = sb.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

async function deleteFile(filePath) {
  await ensureBucket();
  const sb = getClient();
  const { error } = await sb.storage.from(BUCKET).remove([filePath]);
  if (error) throw error;
}

function getPublicUrl(filePath) {
  const sb = getClient();
  const { data } = sb.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

module.exports = { uploadFile, deleteFile, getPublicUrl };
