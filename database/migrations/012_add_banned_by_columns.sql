-- 012_add_banned_by_columns.sql
-- Add missing columns to usuarios_baneados table

-- Add banned_by column (who performed the ban)
ALTER TABLE usuarios_baneados ADD COLUMN IF NOT EXISTS banned_by text;

-- Add unbanned_by column (who performed the unban)
ALTER TABLE usuarios_baneados ADD COLUMN IF NOT EXISTS unbanned_by text;
