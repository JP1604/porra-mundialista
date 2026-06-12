-- ─────────────────────────────────────────────────────────────────────────────
-- migration_live_status.sql
-- Añade el valor 'live' al CHECK constraint de matches.status
-- Ejecutar en Supabase → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Eliminar el constraint actual
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;

-- 2. Volver a crearlo con 'live' incluido
ALTER TABLE matches
  ADD CONSTRAINT matches_status_check
  CHECK (status IN ('upcoming', 'live', 'finished'));
