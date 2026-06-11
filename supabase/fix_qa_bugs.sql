-- ============================================================
-- FIX QA (2026-06-11) — 2 bugs detectados por la simulación E2E
-- Ejecutar en Supabase: SQL Editor → New query → pegar → Run
-- Es seguro ejecutarlo varias veces (CREATE OR REPLACE).
-- ============================================================

-- ─── BUG 1: Regla de 1 punto nunca se activaba ───────────────
--
-- Regla oficial: "1 punto — Misma diferencia de gol, diferente
-- resultado. Ejemplo: resultado final 1-0, predicción 0-1."
--
-- El código anterior comparaba la diferencia CON SIGNO
-- (pred_diff = real_diff), pero si las diferencias con signo son
-- iguales el ganador también es igual → esa rama era inalcanzable.
-- Corrección: comparar el VALOR ABSOLUTO de la diferencia.
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
  IF ABS(pred_diff) = ABS(real_diff)                  THEN RETURN 1; END IF;
  RETURN 0;
END;
$$;

-- ─── BUG 2: Leaderboard por jornada mal ordenado ─────────────
--
-- "ORDER BY total_points DESC" resolvía a la columna cruda
-- ms.total_points (NULL para usuarios sin puntos en la jornada)
-- y en DESC los NULL van primero → el top salía con 0 puntos.
-- Corrección: ordenar por el COALESCE explícito.
--
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
  ORDER BY COALESCE(ms.total_points, 0) DESC, p.alias ASC;
$$;
