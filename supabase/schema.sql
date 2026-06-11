-- ============================================================
-- PORRA MUNDIALISTA — Esquema de base de datos
-- Ejecutar en Supabase: SQL Editor → New query → Run
-- NOTA: ejecutar ANTES que rls.sql y functions.sql
-- ============================================================

-- Perfiles de usuario (extiende auth.users de Supabase)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  alias       TEXT UNIQUE NOT NULL,
  is_admin    BOOLEAN     NOT NULL DEFAULT FALSE,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Jornadas ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matchdays (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  number     INTEGER     UNIQUE NOT NULL,
  label      TEXT        NOT NULL,
  stage      TEXT        NOT NULL CHECK (stage IN ('group','r16','qf','sf','final')),
  closes_at  TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Partidos ────────────────────────────────────────────────
-- status: 'upcoming' | 'finished'  (sin 'live')
CREATE TABLE IF NOT EXISTS matches (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  matchday_id    UUID        NOT NULL REFERENCES matchdays(id),
  home_team      CHAR(2)     NOT NULL,
  away_team      CHAR(2)     NOT NULL,
  home_team_name TEXT        NOT NULL,
  away_team_name TEXT        NOT NULL,
  kickoff_at     TIMESTAMPTZ NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'upcoming'
                             CHECK (status IN ('upcoming', 'finished')),
  home_score     INTEGER     CHECK (home_score >= 0),
  away_score     INTEGER     CHECK (away_score >= 0),
  stage          TEXT        NOT NULL CHECK (stage IN ('group','r16','qf','sf','final')),
  group_name     CHAR(1),
  venue          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Jugadores ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS players (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT    NOT NULL,
  team       CHAR(2) NOT NULL,
  team_name  TEXT    NOT NULL,
  position   TEXT    CHECK (position IN ('GK','DEF','MID','FWD')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Predicciones ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS predictions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  match_id       UUID        NOT NULL REFERENCES matches(id),
  home_score     INTEGER     NOT NULL CHECK (home_score >= 0),
  away_score     INTEGER     NOT NULL CHECK (away_score >= 0),
  key_player_id  UUID        NOT NULL REFERENCES players(id),
  base_score     INTEGER,
  bonus_score    INTEGER     NOT NULL DEFAULT 0,
  total_score    INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, match_id)
);

-- ─── Eventos de partido ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    UUID        NOT NULL REFERENCES matches(id),
  player_id   UUID        NOT NULL REFERENCES players(id),
  event_type  TEXT        NOT NULL CHECK (event_type IN ('goal','penalty','assist','motm')),
  minute      INTEGER     CHECK (minute BETWEEN 1 AND 120),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Puntuaciones por jornada (caché) ───────────────────────
CREATE TABLE IF NOT EXISTS matchday_scores (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  matchday_id       UUID        NOT NULL REFERENCES matchdays(id),
  total_points      INTEGER     NOT NULL DEFAULT 0,
  base_points       INTEGER     NOT NULL DEFAULT 0,
  bonus_points      INTEGER     NOT NULL DEFAULT 0,
  predictions_count INTEGER     NOT NULL DEFAULT 0,
  exact_scores      INTEGER     NOT NULL DEFAULT 0,
  correct_results   INTEGER     NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, matchday_id)
);

-- ─── Vista de leaderboard global ─────────────────────────────
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  p.id                                              AS user_id,
  p.alias,
  p.avatar_url,
  COALESCE(SUM(ms.total_points),      0)::INTEGER  AS total_points,
  COALESCE(SUM(ms.base_points),       0)::INTEGER  AS base_points,
  COALESCE(SUM(ms.bonus_points),      0)::INTEGER  AS total_bonus,
  COALESCE(SUM(ms.predictions_count), 0)::INTEGER  AS predictions_count,
  COALESCE(SUM(ms.exact_scores),      0)::INTEGER  AS exact_scores,
  COALESCE(SUM(ms.correct_results),   0)::INTEGER  AS correct_results,
  RANK() OVER (
    ORDER BY COALESCE(SUM(ms.total_points), 0) DESC
  )::INTEGER                                       AS rank
FROM profiles p
LEFT JOIN matchday_scores ms ON p.id = ms.user_id
GROUP BY p.id, p.alias, p.avatar_url;
