-- ─────────────────────────────────────────────────────────────────────────────
-- migration_live_scores.sql
-- Permite calcular puntajes en partidos 'live' (no solo 'finished')
-- Ejecutar en Supabase → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION calculate_match_scores(p_match_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  match_rec  RECORD;
  pred_rec   RECORD;
  base_pts   INTEGER;
  bonus_pts  INTEGER;
BEGIN
  -- Acepta partidos 'live' o 'finished' (no 'upcoming')
  SELECT home_score, away_score, matchday_id
  INTO match_rec
  FROM matches
  WHERE id = p_match_id AND status IN ('live', 'finished');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El partido % no existe o no está en curso / finalizado', p_match_id;
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
