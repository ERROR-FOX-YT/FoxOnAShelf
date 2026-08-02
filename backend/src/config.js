/**
 * FoxOnAShelf™ - Config central
 * Lee .env de la raíz del repo (BookShelf/.env).
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });

module.exports = {
  PORT:             parseInt(process.env.PORT || '4000', 10),
  FRONTEND_URL:     process.env.FRONTEND_URL || 'http://localhost:3100',
  JWT_SECRET:       process.env.JWT_SECRET || 'change-me-in-env',
  JWT_EXPIRES_IN:   process.env.JWT_EXPIRES_IN || '7d',
  DATABASE_URL:     process.env.DATABASE_URL || '',
  DB_MODE:          process.env.DB_MODE || (process.env.DATABASE_URL ? 'postgres' : 'json'),
  STORAGE_PATH:     process.env.STORAGE_PATH || require('path').resolve(__dirname, '..', 'storage'),
  MAX_UPLOAD_SIZE_BYTES: parseInt(process.env.MAX_UPLOAD_SIZE_BYTES || '5242880', 10),
  SUPABASE_URL:     process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || ''
};
