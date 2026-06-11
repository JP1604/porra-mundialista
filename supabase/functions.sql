-- ============================================================
-- PORRA MUNDIALISTA — Funciones y triggers
-- Ejecutar DESPUÉS de schema.sql y rls.sql
-- IMPORTANTE: en Supabase SQL Editor, ejecuta cada bloque
-- separado por "-- ----" como una query independiente si
-- alguno falla. Normalmente basta con pegar todo y Run.
-- ============================================================

-- ─── Trigger: crear perfil al registrarse ────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $func$
BEGIN
  INSERT INTO profiles (id, alias)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'alias', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Trigger: actualizar updated_at en predictions ───────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS predictions_updated_at ON predictions;
CREATE TRIGGER predictions_updated_at
  BEFORE UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Trigger: calcular total_score automáticamente ───────────
CREATE OR REPLACE FUNCTION sync_total_score()
RETURNS TRIGGER LANGUAGE plpgsql AS $func$
BEGIN
  IF NEW.base_score IS NOT NULL THEN
    NEW.total_score := NEW.base_score + COALESCE(NEW.bonus_score, 0);
  ELSE
    NEW.total_score := NULL;
  END IF;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS predictions_sync_total ON predictions;
CREATE TRIGGER predictions_sync_total
  BEFORE INSERT OR UPDATE ON predictions
  FOR EACH ROW EXECUTE FUNCTION sync_total_score();

-- ─── Cálculo de puntuación base ──────────────────────────────
--
-- Reglas:
--   4 pts → marcador exacto
--   3 pts → mismo ganador + misma diferencia de goles
--   2 pts → mismo ganador, diferente diferencia
--   1 pt  → misma diferencia, diferente ganador
--   0 pts → nada coincide
--
CREATE OR REPLACE FUNCTION calculate_base_score(
  pred_home INTEGER,
  pred_away INTEGER,
  real_home INTEGER,
  real_away INTEGER
) RETURNS INTEGER
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  pred_diff  INTEGER := pred_home - pred_away;
  real_diff  INTEGER := real_home - real_away;
  pred_win   TEXT;
  real_win   TEXT;
BEGIN
  pred_win := CASE WHEN pred_diff > 0 THEN 'home'
                   WHEN pred_diff < 0 THEN 'away'
                   ELSE 'draw' END;
  real_win := CASE WHEN real_diff > 0 THEN 'home'
                   WHEN real_diff < 0 THEN 'away'
                   ELSE 'draw' END;

  IF pred_home = real_home AND pred_away = real_away THEN RETURN 4; END IF;
  IF pred_win = real_win AND pred_diff = real_diff    THEN RETURN 3; END IF;
  IF pred_win = real_win                              THEN RETURN 2; END IF;
  -- Valor absoluto: "misma diferencia, diferente ganador" (ej. 1-0 vs 0-1)
  IF ABS(pred_diff) = ABS(real_diff)                  THEN RETURN 1; END IF;
  RETURN 0;
END;
$$;

-- ─── Cálculo de bonus (clave de gol) ─────────────────────────
--
-- Por cada evento del jugador clave en el partido:
--   3 pts → gol normal
--   2 pts → gol de penal
--   1 pt  → asistencia
--   1 pt  → MOTM
--
CREATE OR REPLACE FUNCTION calculate_bonus_score(
  p_match_id    UUID,
  p_player_id   UUID
) RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
  bonus   INTEGER := 0;
  ev_type TEXT;
BEGIN
  FOR ev_type IN
    SELECT event_type FROM match_events
    WHERE match_id = p_match_id AND player_id = p_player_id
  LOOP
    bonus := bonus + CASE ev_type
      WHEN 'goal'    THEN 3
      WHEN 'penalty' THEN 2
      WHEN 'assist'  THEN 1
      WHEN 'motm'    THEN 1
      ELSE 0
    END;
  END LOOP;
  RETURN bonus;
END;
$$;

-- ─── Calcular puntuaciones de todas las predicciones de un partido ───
--
-- El admin llama a esta función después de:
--   1. Marcar el partido como 'finished' con los scores
--   2. Registrar todos los match_events (goles, asistencias, MOTM)
--
-- Luego refresca el agregado de matchday_scores.
--
CREATE OR REPLACE FUNCTION calculate_match_scores(p_match_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  match_rec  RECORD;
  pred_rec   RECORD;
  base_pts   INTEGER;
  bonus_pts  INTEGER;
BEGIN
  -- Verificar que el partido está finalizado
  SELECT home_score, away_score, matchday_id
  INTO match_rec
  FROM matches
  WHERE id = p_match_id AND status = 'finished';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El partido % no existe o no está finalizado', p_match_id;
  END IF;

  -- Calcular y actualizar cada predicción
  FOR pred_rec IN
    SELECT id, home_score, away_score, key_player_id
    FROM predictions
    WHERE match_id = p_match_id
  LOOP
    base_pts  := calculate_base_score(
                   pred_rec.home_score, pred_rec.away_score,
                   match_rec.home_score, match_rec.away_score);
    bonus_pts := calculate_bonus_score(p_match_id, pred_rec.key_player_id);

    UPDATE predictions
    SET base_score  = base_pts,
        bonus_score = bonus_pts
    WHERE id = pred_rec.id;
  END LOOP;

  -- Refrescar el agregado de la jornada
  PERFORM refresh_matchday_scores(match_rec.matchday_id);
END;
$$;

-- ─── Refrescar agregado matchday_scores ──────────────────────
CREATE OR REPLACE FUNCTION refresh_matchday_scores(p_matchday_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO matchday_scores (
    user_id, matchday_id,
    total_points, base_points, bonus_points,
    predictions_count, exact_scores, correct_results,
    updated_at
  )
  SELECT
    p.user_id,
    m.matchday_id,
    COALESCE(SUM(p.total_score), 0),
    COALESCE(SUM(p.base_score),  0),
    COALESCE(SUM(p.bonus_score), 0),
    COUNT(p.id),
    COUNT(CASE WHEN p.base_score = 4 THEN 1 END),
    COUNT(CASE WHEN p.base_score >= 2 THEN 1 END),
    NOW()
  FROM predictions p
  JOIN matches m ON p.match_id = m.id
  WHERE m.matchday_id = p_matchday_id
    AND p.total_score IS NOT NULL
  GROUP BY p.user_id, m.matchday_id
  ON CONFLICT (user_id, matchday_id) DO UPDATE SET
    total_points      = EXCLUDED.total_points,
    base_points       = EXCLUDED.base_points,
    bonus_points      = EXCLUDED.bonus_points,
    predictions_count = EXCLUDED.predictions_count,
    exact_scores      = EXCLUDED.exact_scores,
    correct_results   = EXCLUDED.correct_results,
    updated_at        = NOW();
END;
$$;

-- ─── Jugadores bloqueados por regla consecutiva ───────────────
--
-- Un jugador queda bloqueado si el usuario lo usó como clave de gol
-- en la jornada ANTERIOR (número - 1). Se desbloquea una jornada después.
--
-- Devuelve array de player_id bloqueados para (user_id, matchday_id).
--
CREATE OR REPLACE FUNCTION get_blocked_players(
  p_user_id      UUID,
  p_matchday_id  UUID
) RETURNS UUID[]
LANGUAGE plpgsql AS $$
DECLARE
  prev_matchday_id UUID;
BEGIN
  SELECT id INTO prev_matchday_id
  FROM matchdays
  WHERE number = (
    SELECT number - 1 FROM matchdays WHERE id = p_matchday_id
  );

  IF prev_matchday_id IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;

  RETURN ARRAY(
    SELECT DISTINCT p.key_player_id
    FROM predictions p
    JOIN matches m ON p.match_id = m.id
    WHERE p.user_id = p_user_id
      AND m.matchday_id = prev_matchday_id
  );
END;
$$;

-- ─── Leaderboard por jornada ──────────────────────────────────
-- Usado por el admin para ver rankings parciales por jornada.
CREATE OR REPLACE FUNCTION get_matchday_leaderboard(p_matchday_id UUID)
RETURNS TABLE (
  user_id           UUID,
  alias             TEXT,
  avatar_url        TEXT,
  total_points      INTEGER,
  base_points       INTEGER,
  total_bonus       INTEGER,
  predictions_count INTEGER,
  exact_scores      INTEGER,
  correct_results   INTEGER,
  rank              BIGINT
)
LANGUAGE sql AS $$
  SELECT
    p.id,
    p.alias,
    p.avatar_url,
    COALESCE(ms.total_points,      0),
    COALESCE(ms.base_points,       0),
    COALESCE(ms.bonus_points,      0),
    COALESCE(ms.predictions_count, 0),
    COALESCE(ms.exact_scores,      0),
    COALESCE(ms.correct_results,   0),
    RANK() OVER (ORDER BY COALESCE(ms.total_points, 0) DESC)
  FROM profiles p
  LEFT JOIN matchday_scores ms
    ON p.id = ms.user_id AND ms.matchday_id = p_matchday_id
  -- COALESCE explícito: con "total_points DESC" los NULL iban primero
  ORDER BY COALESCE(ms.total_points, 0) DESC, p.alias ASC;
$$;
