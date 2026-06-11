-- ============================================================
-- MIGRACIÓN: Añadir api_football_id a matches y players
-- Ejecutar en Supabase SQL Editor DESPUÉS de schema.sql
-- ============================================================

-- ID del fixture en api-football (lo usas al cargar el fixture de un partido)
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS api_football_id INTEGER UNIQUE;

-- ID del jugador en api-football (lo usas al cargar jugadores)
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS api_football_id INTEGER UNIQUE;

-- Índices para que el backend encuentre rápido por api_football_id
CREATE INDEX IF NOT EXISTS idx_matches_api_football_id ON matches (api_football_id);
CREATE INDEX IF NOT EXISTS idx_players_api_football_id ON players (api_football_id);
