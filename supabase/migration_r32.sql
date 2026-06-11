-- ============================================================
-- MIGRACIÓN: Añadir 'r32' a las columnas stage
-- El Mundial 2026 tiene Ronda de 32 (nueva fase, 48 equipos)
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Quitar el CHECK existente y añadir 'r32'
ALTER TABLE matchdays
  DROP CONSTRAINT IF EXISTS matchdays_stage_check,
  ADD CONSTRAINT matchdays_stage_check
    CHECK (stage IN ('group','r32','r16','qf','sf','final'));

ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_stage_check,
  ADD CONSTRAINT matches_stage_check
    CHECK (stage IN ('group','r32','r16','qf','sf','final'));

-- Ampliar columnas de código de equipo de CHAR(2) a CHAR(3)
-- (API-Football devuelve códigos de 3 letras: ARG, BRA, USA...)
ALTER TABLE matches
  ALTER COLUMN home_team TYPE CHAR(3),
  ALTER COLUMN away_team TYPE CHAR(3);

ALTER TABLE players
  ALTER COLUMN team TYPE CHAR(3);
